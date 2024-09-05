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
  db.run('CREATE TABLE IF NOT EXISTS battles (id INTEGER PRIMARY KEY, maker INTEGER, taker INTEGER, maker_pokemons TEXT, maker_battling_pokemons TEXT, taker_pokemons TEXT, taker_battling_pokemons TEXT, maker_move TEXT, taker_move TEXT, status TEXT, current_turn INTEGER, battle_log TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS hashes (hash TEXT PRIMARY KEY)');
  db.run('CREATE TABLE IF NOT EXISTS players (playerid INTEGER PRIMARY KEY, wallet TEXT, inventory TEXT, battles TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS pokemons (id INTEGER PRIMARY KEY, name TEXT, type TEXT, hp INTEGER, attack INTEGER, defense INTEGER, speed INTEGER, atk1 TEXT, atk2 TEXT, atk3 TEXT, image TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS battle_logs (id INTEGER PRIMARY KEY, battle_id TEXT, log TEXT)');
})

export default db;