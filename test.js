import db from "./database.js";

db.run('DROP TABLE battles', (err) => {
  if (err) {
    console.error('Error dropping battles table:', err.message);
  }
});