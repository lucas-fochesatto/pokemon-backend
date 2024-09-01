import { reduceHpToZero } from "./testfn.js";

const battle = {
  maker_pokemons: [{ hp: 100 }],

  maker_battling_pokemons: [0],
}

const attacker = battle.maker_pokemons[battle.maker_battling_pokemons[0]];

reduceHpToZero(attacker);

console.log(battle);