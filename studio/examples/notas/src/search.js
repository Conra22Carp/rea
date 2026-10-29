/**
 * Return the notes whose title or body contains the query, ignoring case.
 * An empty or blank query returns no results.
 */
function searchNotes(notes, query) {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];
  return notes.filter(
    (note) =>
      note.title.toLowerCase().includes(needle) ||
      note.body.toLowerCase().includes(needle),
  );
}

module.exports = { searchNotes };
