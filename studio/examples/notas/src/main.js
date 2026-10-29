const { searchNotes } = require("./search");

const notes = [
  { id: 1, title: "Compras", body: "leche, huevos, café" },
  { id: 2, title: "Ideas", body: "Reescribir la búsqueda con etiquetas" },
  { id: 3, title: "Reunión", body: "Revisar el informe de Reall" },
];

/** Titles of the notes that match the query. */
function handleSearch(query) {
  return searchNotes(notes, query).map((note) => note.title);
}

module.exports = { handleSearch, notes };

if (require.main === module) {
  const query = process.argv.slice(2).join(" ");
  console.log(JSON.stringify(handleSearch(query)));
}
