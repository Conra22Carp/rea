# Cambios de Reall

Registro de la capa Reall (`studio/`). Los cambios del motor REA están en el
[CHANGELOG de upstream](../CHANGELOG.md).

## 1.0.0 · 2026-10-29

Primera versión estable de Reall. Resuelve los pendientes de la v0 y suma cinco
mejoras nuevas. Issues: <https://github.com/Conra22Carp/reall/issues>.

### Verificación y explicación

- **Terminado no es verificado** ([#1](https://github.com/Conra22Carp/reall/issues/1)).
  La fase de verificación usa una herramienta nueva, `run_check`: Reall ejecuta
  cada build o test, registra el código de salida en `logs/checks.json` (que el
  modelo no puede escribir) y deriva el estado solo de esos registros:
  _Verificado_ (al menos un check y ninguno falló), _Con fallas_ o _Sin verificar_.
  Si un check se repite después de un arreglo, cuenta el último resultado. El
  estado «Completado» pasa a llamarse «Terminado».
- **Qué aprendimos** ([#6](https://github.com/Conra22Carp/reall/issues/6)). El
  informe escribe `output/findings.json`; la vista separa afirmaciones observadas,
  inferidas y desconocidas, y abre con un clic su evidencia (ids `ev_…` o archivos
  de `evidence/`) y el resultado del check que la prueba.
- **Permisos y cambios visibles** ([#8](https://github.com/Conra22Carp/reall/issues/8)).
  La ejecución muestra su modo de permisos y, al terminar, qué archivos escribió o
  editó y qué comandos ejecutó.

### Antes de ejecutar

- **Chequeo previo y versión visible** ([#5](https://github.com/Conra22Carp/reall/issues/5)).
  El paso Revisar comprueba Node, REA, navegador (web), Java y JADX (Android), el
  proveedor nativo (cuando se puede ver), el worker, la carpeta y las credenciales
  del modelo, sin llamar al modelo; si falta algo requerido no deja iniciar. Una
  web app sin navegador falla antes de la primera llamada al modelo. El pie de la
  interfaz muestra versión y commit.
- **Proyecto de ejemplo** ([#4](https://github.com/Conra22Carp/reall/issues/4)).
  «Probar con un ejemplo» crea un proyecto con `studio/examples/notas` y abre la
  ejecución precargada con los resultados esperados.
- **Instalación con un comando** ([#7](https://github.com/Conra22Carp/reall/issues/7)):
  `cd studio && npm run setup`. Probado desde un clon limpio en macOS, con la caché de npm de esa máquina
  (27 s, y después el smoke test); una máquina nueva, Windows y Linux quedan pendientes
  (el CI cubre Linux cuando esté habilitado).

### Robustez

- **Un solo worker por estado** ([#3](https://github.com/Conra22Carp/reall/issues/3)).
  `worker.lock` en `STUDIO_HOME` impide que una segunda instancia marque como
  fallidos los trabajos de la primera. Un candado cuenta solo mientras su proceso
  existe y su heartbeat es reciente, así un PID reutilizado no lo bloquea. Cada
  ejecución registra qué worker la tomó.
- **Consumo compartido entre pestañas** ([#9](https://github.com/Conra22Carp/reall/issues/9)).
  Medido con 2.000 ejecuciones y 80.000 eventos: un snapshot cuesta ~126 ms; con
  10 pestañas abiertas durante un minuto, de 300 snapshots (29 s de CPU) a 30 (2,9 s).
- **Errores en el idioma de la interfaz** ([#10](https://github.com/Conra22Carp/reall/issues/10)).
  Un diccionario único en `core/messages.ts` traduce los mensajes del backend y de
  las ejecuciones; las validaciones se localizan con zod; los errores ya no muestran
  el prefijo «Error:».
- **CI propia** ([#2](https://github.com/Conra22Carp/reall/issues/2)).
  `.github/workflows/reall-studio.yml` corre typecheck, tests (incluye REA real con
  un modelo simulado), build y `npm run smoke`. Corre solo en este repositorio y
  cuando Actions está habilitado.

### Mejoras nuevas

- Los campos numéricos ya no quedan con un 0 delante al borrarlos ([#11](https://github.com/Conra22Carp/reall/issues/11)).
- **Repetir** una ejecución con sus mismas opciones; credenciales y permisos no se copian ([#12](https://github.com/Conra22Carp/reall/issues/12)).
- Cada tarifa de referencia muestra su fecha y se marca después de 30 días ([#13](https://github.com/Conra22Carp/reall/issues/13)).
- Título de pestaña y avisos opcionales del navegador cuando una ejecución pide revisión o termina ([#14](https://github.com/Conra22Carp/reall/issues/14)).
- Quitar ejecuciones terminadas y proyectos sin ejecuciones activas del historial, sin borrar archivos ([#15](https://github.com/Conra22Carp/reall/issues/15)).

### Límites conocidos

- Un check que pasa prueba ese comando, no que la reconstrucción esté completa.
- «Qué aprendimos» depende de que el modelo escriba `findings.json` con evidencia válida;
  Reall valida el formato y avisa entradas inválidas, no la verdad de cada afirmación.
- Los comandos de las ejecuciones usan `/bin/sh`: Windows no está soportado para ejecutar.
- Si dos workers arrancan en el mismo instante sobre un candado vencido, el reemplazo
  no es atómico; es un caso muy poco probable y se dejó fuera a propósito.

## 0.1.0 · v0

Primera versión pública: interfaz ES/EN, proyectos, conexiones y catálogo de
modelos, permisos por ejecución, actividad y consumo en vivo, archivos, informe y ZIP.
