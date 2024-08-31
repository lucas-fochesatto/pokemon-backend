import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const numberOfFiles = 25;

const pokemons = [];


for(let i = 1; i <= numberOfFiles; i++) {
  const filePath = path.resolve(__dirname, `../metadata/${i}.json`);
  const rawData = fs.readFileSync(filePath);
  const pokemonData = JSON.parse(rawData);
  pokemons.push(pokemonData);
}

export default pokemons;