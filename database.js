import sqlite3 from 'sqlite3';
import pokemons from './utils/pokemons.js';

const db = new sqlite3.Database('./database.db', (err) => {
  if(err) {
    console.error('Error opening database ' + err.message);
  } else {
    console.log('Database opened');
  }
});

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS battles (id INTEGER PRIMARY KEY, maker TEXT, taker TEXT, maker_pokemons TEXT, taker_pokemons TEXT, maker_hp TEXT, taker_hp TEXT, status TEXT)')
  db.run('CREATE TABLE IF NOT EXISTS pokemons (id INTEGER PRIMARY KEY, name TEXT, type TEXT, hp INTEGER, attack INTEGER, defense INTEGER, speed INTEGER, atk1 TEXT, atk2 TEXT, atk3 TEXT, image TEXT)')
  db.run('CREATE TABLE IF NOT EXISTS hashes (hash TEXT PRIMARY KEY)')

  const insert = db.prepare('INSERT OR REPLACE INTO pokemons (id, name, type, hp, attack, defense, speed, atk1, atk2, atk3, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  pokemons.forEach(pokemon => {
    insert.run(pokemon.id, pokemon.name, pokemon.type, pokemon.hp, pokemon.attack, pokemon.defense, pokemon.speed, pokemon.atk1, pokemon.atk2, pokemon.atk3, pokemon.image)
  })
  insert.finalize()
})

export default db;