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
  db.run('CREATE TABLE IF NOT EXISTS battles (id INTEGER PRIMARY KEY, maker TEXT, taker TEXT, maker_pokemons TEXT,maker_active_mon INTEGER, taker_pokemons TEXT, taker_active_mon INTEGER, maker_move TEXT, taker_move TEXT, status TEXT, battle_log TEXT)')
  db.run('CREATE TABLE IF NOT EXISTS pokemons (id INTEGER PRIMARY KEY, name TEXT, type TEXT, hp INTEGER, attack INTEGER, defense INTEGER, speed INTEGER, moves TEXT, status TEXT)')
  db.run('CREATE TABLE IF NOT EXISTS hashes (hash TEXT PRIMARY KEY)')

  const insert = db.prepare('INSERT OR REPLACE INTO pokemons (id, name, type, hp, attack, defense, speed, moves, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
  pokemons.forEach(pokemon => {
    insert.run(pokemon.id, pokemon.name, pokemon.type, pokemon.hp, pokemon.attack, pokemon.defense, pokemon.speed, pokemon.moves, pokemon.status)
  })
  insert.finalize()
})

export default db;