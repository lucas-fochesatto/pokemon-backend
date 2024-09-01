import db from "../database.js";
import Battle from "../Models/Battle.js";
import { moveset } from "./moves.js";
import { typeMatchup } from "./typeMatchup.js";

export const getBattleFromDb = async (battleId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM battles WHERE id = ?', [battleId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

export const createBattleInstance = (row) => {
  return new Battle(row.id, row.maker, row.taker, JSON.parse(row.maker_pokemons), JSON.parse(row.maker_battling_pokemons), JSON.parse(row.taker_pokemons), JSON.parse(row.taker_battling_pokemons), row.maker_move, row.taker_move, row.status, JSON.parse(row.battle_log));
}

export const isUserPartOfBattle = (battle, userId) => {
  return battle.maker === userId || battle.taker === userId;
}

export const bothPlayersMoved = (battle) => {
  return battle.maker_move && battle.taker_move;
}

const arePrioritiesEqual = (maker_move, taker_move) => {
  return moveset[maker_move].priority == moveset[taker_move].priority;
}

const compareSpeeds = (battle) => {
  const { maker_pokemons, taker_pokemons, maker_battling_pokemons, taker_battling_pokemons } = battle;

  const makerSelectedPokemon = maker_pokemons[maker_battling_pokemons[0]];
  const takerSelectedPokemon = taker_pokemons[taker_battling_pokemons[0]];

  if (makerSelectedPokemon.speed > takerSelectedPokemon.speed) {
    return 'maker';
  } else if (takerSelectedPokemon.speed > makerSelectedPokemon.speed) {
    return 'taker';
  } else {
    return Math.random() < 0.5 ? 'maker' : 'taker';
  }
}

export const updateMove = (battle, userId, move) => {
  if (battle.maker === userId) {
    battle.maker_move = move;
  } else {
    battle.taker_move = move;
  }
}

export const processMove = (battle, attacker, move, defender) => {
  const damage = calculateDamage(attacker, move, defender);
  defender.hp -= damage;

  battle.battle_log.push(createBattleLog(attacker, move, defender, damage));

  if (defender.hp <= 0) {
    battle.battle_log.push({ message: `${defender.name} fainted!` });
  }
}

export const determineMoveOrder = (battle) => {
  const { maker_move, taker_move } = battle;

  // first, compare move priorities
  if(arePrioritiesEqual(maker_move, taker_move)) {
    // if priorities are equal, compare speeds
    return compareSpeeds(battle);
  } else {
    if(verifySwapMove(maker_move)) return 'maker-swap'
    if(verifySwapMove(taker_move)) return 'taker-swap'
    return maker_move.priority > taker_move.priority ? 'maker' : 'taker';
  }
}

export const createBattleLog = (attacker, move, defender, damage) => {
  return {
    move: move.name,
    attacker: attacker.name,
    damage,
    defender: defender.name,
    remainingHP: defender.hp
  };
}

// Determine the outcome of the battle
export const determineBattleOutcome = (battle) => {
  // iterate over battling pokemons and check if everyone has <= 0 hp
  let makerAlive = false;
  let takerAlive = false;

  for(let i = 0; i < 2; i++) {
    if(battle.taker_pokemons[battle.taker_battling_pokemons[i]].hp > 0) {
      takerAlive = true;
    }
    if(battle.maker_pokemons[battle.maker_battling_pokemons[i]].hp > 0) {
      makerAlive = true;
    }
  }

  if (!makerAlive && !takerAlive) {
    battle.battle_log.push({ message: 'It\'s a tie!' });
    battle.status = 'ended';
  } else if (!makerAlive) {
    battle.battle_log.push({ message: 'Taker wins!' });
    battle.status = 'ended';
  } else if (!takerAlive) {
    battle.battle_log.push({ message: 'Maker wins!' });
    battle.status = 'ended';
  }
}

// Update the battle in the database
export const updateBattleInDatabase = async (battle, makerPokemons, takerPokemons) => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE battles SET maker_pokemons = ?, taker_pokemons = ?, maker_hp = ?, taker_hp = ?, status = ?, battle_log = ?, maker_moved = ?, taker_moved = ? WHERE id = ?',
      [
        JSON.stringify(makerPokemons),
        JSON.stringify(takerPokemons),
        makerPokemons[battle.maker_active_mon].hp,
        takerPokemons[battle.taker_active_mon].hp,
        battle.status,
        JSON.stringify(battle.battle_log),
        false,
        false,
        battle.id
      ],
      (err) => {
        if (err) {
          console.error('Error updating battle:', err.message);
          return reject(err);
        }
        resolve();
      }
    );
  });
}

// rever a logica de dano
export const calculateDamage = (attacker, move, defender) => {
  const modifier = typeMatchup[move.type][defender.type];
  const damage = Math.floor(0.5 * attacker.attack * (move.power / defender.defense) * modifier);

  return damage;
}

const verifySwapMove = (move) => {
  return moveset[move].id == 0;
}

export const performBattle = async (battle) => {
  const next = determineMoveOrder(battle);
  const { maker_move, taker_move } = battle;

  if(next == 'maker-swap') {
    moveset[0].swapMove('maker', battle);
  } else if(next == 'taker-swap') {
    moveset[0].swapMove('taker', battle);
  } else if(next == 'maker') {
    const attacker = battle.maker_pokemons[battle.maker_battling_pokemons[0]];
    const defender = battle.taker_pokemons[battle.taker_battling_pokemons[0]];

    moveset[maker_move].executeMove(attacker, defender, battle);
  } else if(next == 'taker') {
    const attacker = battle.taker_pokemons[battle.taker_battling_pokemons[0]];
    const defender = battle.maker_pokemons[battle.maker_battling_pokemons[0]];

    moveset[taker_move].executeMove(attacker, defender, battle);
  }
}