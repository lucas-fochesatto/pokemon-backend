import { createBattleInstance, getBattleFromDb } from "./utils/battleUtils.js";

const row = await getBattleFromDb(1);
const battle = createBattleInstance(row);

const move = 1;
const pokemon = battle.maker_pokemons[battle.maker_battling_pokemons[0]]

const moveDetails = pokemon.moveDetails.map(m => m.id == move);

console.log(moveDetails);