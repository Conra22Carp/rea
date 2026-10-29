import { randomUUID } from "node:crypto";
import { closeSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";
import { join } from "node:path";

/** A worker rewrites its heartbeat every few seconds; older means it is gone. */
export const HEARTBEAT_FRESH_MS = 15_000;

export interface WorkerHolder {
  readonly id: string;
  readonly pid: number;
  readonly startedAt: string;
}

export interface WorkerLock extends WorkerHolder {
  release(): void;
}

export type LockResult =
  | { readonly ok: true; readonly lock: WorkerLock }
  | { readonly ok: false; readonly holder?: WorkerHolder };

export const heartbeatPath = (home: string): string =>
  join(home, "worker.heartbeat");

const lockPath = (home: string): string => join(home, "worker.lock");

/** Milliseconds since the last heartbeat, or undefined when there is none. */
export const heartbeatAge = (home: string, now = Date.now()): number | undefined => {
  try {
    const at = Date.parse(readFileSync(heartbeatPath(home), "utf8").trim());
    return Number.isNaN(at) ? undefined : now - at;
  } catch {
    return undefined;
  }
};

const readHolder = (home: string): WorkerHolder | undefined => {
  try {
    const value = JSON.parse(readFileSync(lockPath(home), "utf8")) as Partial<WorkerHolder>;
    return typeof value.id === "string" &&
      typeof value.pid === "number" &&
      typeof value.startedAt === "string"
      ? { id: value.id, pid: value.pid, startedAt: value.startedAt }
      : undefined;
  } catch {
    return undefined;
  }
};

const processExists = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (cause) {
    return (cause as NodeJS.ErrnoException).code === "EPERM";
  }
};

/**
 * A PID alone does not prove ownership after exit or reuse, so a holder
 * only counts while its process exists and its heartbeat is fresh.
 */
const holderIsLive = (home: string, holder: WorkerHolder | undefined, now: number) => {
  if (!holder || !processExists(holder.pid)) return false;
  const age = heartbeatAge(home, now);
  const startedAgo = now - Date.parse(holder.startedAt);
  // A holder that just started may not have written its first heartbeat yet.
  return (age !== undefined && age < HEARTBEAT_FRESH_MS) || startedAgo < HEARTBEAT_FRESH_MS;
};

const create = (home: string, now: number): WorkerLock | undefined => {
  const holder: WorkerHolder = {
    id: randomUUID(),
    pid: process.pid,
    startedAt: new Date(now).toISOString(),
  };
  let fd: number;
  try {
    fd = openSync(lockPath(home), "wx", 0o600);
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "EEXIST") return undefined;
    throw cause;
  }
  try {
    writeSync(fd, JSON.stringify(holder));
  } finally {
    closeSync(fd);
  }
  return {
    ...holder,
    release: () => {
      if (readHolder(home)?.id !== holder.id) return;
      try {
        unlinkSync(lockPath(home));
      } catch {
        // Already removed.
      }
    },
  };
};

/** Take the single-worker lock for a state folder, replacing a stale one. */
export const acquireWorkerLock = (home: string, now = Date.now()): LockResult => {
  const first = create(home, now);
  if (first) return { ok: true, lock: first };
  const holder = readHolder(home);
  if (holderIsLive(home, holder, now)) return { ok: false, ...(holder ? { holder } : {}) };
  try {
    unlinkSync(lockPath(home));
  } catch {
    // Another starter removed it first; the exclusive create below decides.
  }
  const second = create(home, now);
  return second ? { ok: true, lock: second } : { ok: false, ...(holder ? { holder } : {}) };
};
