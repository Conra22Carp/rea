"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Code2,
  Cpu,
  FileCheck2,
  Fingerprint,
  FolderOpen,
  GitBranch,
  Globe2,
  Layers3,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { useLocale } from "@/components/Locale";
import { buttonClass } from "@/components/ui";
export default function HomePage() {
  const { t } = useLocale();
  const steps = [
    [
      t("Entendé", "Understand"),
      t(
        "Analizá la app y sus comportamientos con evidencia real.",
        "Analyze the app and its behavior with real evidence.",
      ),
      Fingerprint,
    ],
    [
      t("Diseñá", "Design"),
      t(
        "Revisá la especificación antes de generar código.",
        "Review the specification before generating code.",
      ),
      Layers3,
    ],
    [
      t("Construí", "Build"),
      t(
        "Elegí tu stack y generá una versión mejorada.",
        "Choose your stack and generate an improved version.",
      ),
      Code2,
    ],
    [
      t("Verificá", "Verify"),
      t(
        "Compará resultados, pruebas y diferencias.",
        "Compare results, tests, and differences.",
      ),
      CheckCheck,
    ],
  ] as const;
  return (
    <div className="home-page">
      <div className="home-intro">
        <span className="eyebrow">
          <span className="online-dot" />
          {t("UN NUEVO PUNTO DE PARTIDA", "A NEW STARTING POINT")}
        </span>
        <span className="home-edition">REALL / STUDIO</span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <Sparkles size={14} />
            {t(
              "INGENIERÍA INVERSA, HACIA ADELANTE",
              "REVERSE ENGINEERING. FORWARD THINKING.",
            )}
          </span>
          <h1>
            {t("Entendé cómo funciona.", "Understand how it works.")}
            <br />
            <em>{t("Hacelo realidad.", "Make it real.")}</em>
          </h1>
          <p>
            {t(
              "Transformá aplicaciones en un nuevo punto de partida. Analizá, reconstruí y mejorá con IA, tus propios modelos y el código siempre en tus manos.",
              "Turn applications into a new starting point. Analyze, rebuild, and improve with AI, your own models, and code that stays in your hands.",
            )}
          </p>
          <div className="hero-actions">
            <Link href="/projects/new" className={buttonClass("primary")}>
              {t("Crear mi primer proyecto", "Create my first project")}
              <ArrowRight size={17} />
            </Link>
            <a href="#how-it-works" className="text-link">
              {t("Cómo funciona", "How it works")}
              <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="hero-trust">
            <span>
              <Check size={13} />
              {t("Tus API keys", "Your API keys")}
            </span>
            <span>
              <Check size={13} />
              {t("Código exportable", "Exportable code")}
            </span>
            <span>
              <Check size={13} />
              {t("Control de costos", "Cost control")}
            </span>
          </div>
        </div>
        <div
          className="hero-visual"
          aria-label={t(
            "Ilustración del flujo de Reall",
            "Illustration of the Reall workflow",
          )}
        >
          <div className="visual-grid" />
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="float-label">
            <span className="online-dot" />
            {t("De la idea al código", "From idea to code")}
          </div>
          <div className="visual-source">
            <Globe2 size={18} />
            <span>app.example</span>
            <span className="mini-dots">•••</span>
            <div className="source-skeleton">
              <i />
              <i />
              <div>
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
          <div className="visual-connector" />
          <div className="visual-engine">
            <span className="brand-symbol">
              <span />
              <span />
              <span />
            </span>
          </div>
          <div className="visual-code">
            <div className="code-bar">
              <span className="code-dots">● ● ●</span>
              <span>your-next-idea / app.ts</span>
            </div>
            <pre>
              <span className="code-comment">
                // {t("El siguiente paso es tuyo.", "The next step is yours.")}
              </span>
              {"\n"}
              <span className="code-purple">export async function</span>
              {" build() {\n  "}
              <span className="code-purple">const</span>
              {" idea = "}
              <span className="code-green">await</span>
              {" understand();\n  "}
              <span className="code-purple">return</span>
              {" create({\n    ...idea,\n    "}
              <span className="code-green">possibilities</span>
              {": "}
              <span className="code-orange">'endless'</span>
              {"\n  });\n}"}
            </pre>
            <div className="code-status">
              <Check size={12} />
              {t(
                "Tu código. Tu carpeta. Tus reglas.",
                "Your code. Your folder. Your rules.",
              )}
            </div>
          </div>
          <div className="visual-badge">
            <FileCheck2 size={19} />
            <div>
              <strong>{t("Evidencia → código", "Evidence → code")}</strong>
              <small>
                {t("Un flujo, de principio a fin", "One workflow, end to end")}
              </small>
            </div>
          </div>
        </div>
      </section>
      <section className="provider-strip">
        <p>{t("EL MODELO LO ELEGÍS VOS", "THE MODEL IS YOUR CHOICE")}</p>
        <div>
          <span>
            <span className="provider-logo">◉</span>OpenAI
          </span>
          <span className="anthropic-word">Anthropic</span>
          <span>
            <Sparkles size={19} />
            Gemini
          </span>
          <span>
            <GitBranch size={18} />
            OpenRouter
          </span>
          <span>
            <Terminal size={18} />
            Ollama
          </span>
          <span className="custom-provider">
            + {t("tu proveedor", "your provider")}
          </span>
        </div>
      </section>
      <section id="how-it-works" className="how-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("UN FLUJO CLARO", "A CLEAR WORKFLOW")}</p>
            <h2>
              {t(
                "De observar a crear. Sin perder el control.",
                "From observing to creating. Stay in control.",
              )}
            </h2>
          </div>
          <span className="section-note">
            {t("Vos decidís en cada paso.", "Your decision, at every step.")}
          </span>
        </div>
        <div className="steps-grid">
          {steps.map(([title, description, Icon], i) => (
            <article key={title} className="step-card">
              <div className="step-top">
                <span className="step-icon">
                  <Icon size={20} />
                </span>
                <span className="step-number">0{i + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="features-row">
        <div>
          <FolderOpen size={21} />
          <h3>{t("El código, donde quieras", "Code, wherever you want")}</h3>
          <p>
            {t(
              "Elegí la carpeta de cada proyecto. Explorá los archivos y descargá todo en un ZIP.",
              "Choose a folder for each project. Browse the files and download everything as a ZIP.",
            )}
          </p>
        </div>
        <div>
          <Cpu size={21} />
          <h3>{t("Cada token cuenta", "Every token counts")}</h3>
          <p>
            {t(
              "Seguí el consumo y costo estimado en vivo, con presupuestos por ejecución.",
              "Track live usage and estimated cost, with per-run budgets.",
            )}
          </p>
        </div>
        <div>
          <ShieldCheck size={21} />
          <h3>{t("Tus claves, bajo tu control", "Your keys, your control")}</h3>
          <p>
            {t(
              "Claves cifradas en tu máquina. Se usan únicamente con el proveedor elegido.",
              "Encrypted keys on your machine. Used only with your chosen provider.",
            )}
          </p>
        </div>
      </section>
      <section className="home-cta">
        <div>
          <span className="eyebrow">
            {t(
              "EL PRÓXIMO PROYECTO EMPIEZA ACÁ",
              "YOUR NEXT PROJECT STARTS HERE",
            )}
          </span>
          <h2>
            {t(
              "Una buena idea merece ser Reall.",
              "A good idea deserves to be Reall.",
            )}
          </h2>
        </div>
        <Link href="/settings" className={buttonClass("ghost")}>
          {t("Configurar mis modelos", "Set up my models")}
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
