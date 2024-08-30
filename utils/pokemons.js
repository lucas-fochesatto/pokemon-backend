import fs from 'fs';
import path from 'path';
const __dirname = import.meta.dirname;

const numberOfFiles = 25;

const pokemons = [];


for(let i = 1; i <= numberOfFiles; i++) {
  const filePath = path.resolve(__dirname, `../metadata/${i}.json`);
  const rawData = fs.readFileSync(filePath);
  const pokemonData = JSON.parse(rawData);
  pokemons.push(pokemonData);
}

export default pokemons;