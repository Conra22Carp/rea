# Ejemplo: app de notas

Una aplicación mínima para el primer proyecto guiado de Reall. No contiene datos
reales ni credenciales. Su búsqueda (`src/search.js`) devuelve las notas cuyo
título o cuerpo contiene el texto buscado, sin distinguir mayúsculas; una
búsqueda vacía no devuelve resultados.

```sh
node src/main.js reall   # ["Reunión"]
node src/main.js ""      # []
```

## Qué deberías ver al terminar

| Fase           | Resultado esperado                                                                  |
| -------------- | ----------------------------------------------------------------------------------- |
| Análisis       | `notes/analysis.md` menciona `searchNotes` y que compara título y cuerpo.           |
| Especificación | La búsqueda ignora mayúsculas y una consulta vacía devuelve una lista vacía.        |
| Construcción   | Una versión nueva en `output/` con pruebas para esos dos comportamientos.          |
| Verificación   | Checks registrados por Reall (por ejemplo «unit tests») que pasan.                  |
| Informe        | `output/REPORT.md` y `output/findings.json` con afirmaciones enlazadas a evidencia. |

Si alguna fila no se cumple, revisá la evidencia y repetí la ejecución con un alcance más chico.

---

**English:** a tiny notes app for Reall's guided first project. Its search returns
notes whose title or body contains the query, case-insensitively; an empty query
returns nothing. A good run documents both behaviors, rebuilds them with tests and
records passing checks.
