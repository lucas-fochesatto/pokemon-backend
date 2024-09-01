import db from "../database";
import Battle from "../Models/Battle";
import { typeMatchup } from "./typeMatchup";

export const getBattleFromDb = async (battleId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM battles WHERE id = ?', [battleId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

export const createBattleInstance = (row) => {
  return new Battle(row.id, row.maker, row.taker, row.maker_pokemons, row.maker_active_mon, row.taker_pokemons, row.taker_active_mon, row.maker_move, row.taker_move, row.status, row.battle_log);
}

export const isUserPartOfBattle = (battle, userId) => {
  return battle.maker === userId || battle.taker === userId;
}

export const bothPlayersMoved = (battle) => {
  return battle.maker_move && battle.taker_move;
}

export const updateMove = (battle, userId, move) => {
  if (battle.maker === userId) {
    battle.maker_move = move;
  } else {
    battle.taker_move = move;
  }
}

export const loadPokemons = (battle) => {
  const makerPokemons = JSON.parse(battle.maker_pokemons);
  const takerPokemons = JSON.parse(battle.taker_pokemons);

  const makerPokemon = makerPokemons[battle.maker_active_mon];
  const takerPokemon = takerPokemons[battle.taker_active_mon];

  return { makerPokemons, takerPokemons, makerPokemon, takerPokemon };
}

export const processMove = (battle, attacker, move, defender) => {
  const damage = calculateDamage(attacker, move, defender);
  defender.hp -= damage;

  battle.battle_log.push(createBattleLog(attacker, move, defender, damage));

  if (defender.hp <= 0) {
    battle.battle_log.push({ message: `${defender.name} fainted!` });
  }
}

export const determineMoveOrder = (makerPokemon, takerPokemon) => {
  if (makerPokemon.speed > takerPokemon.speed) {
    return {
      firstAttacker: makerPokemon,
      firstMove: makerPokemon.moves[0],
      secondAttacker: takerPokemon,
      secondMove: takerPokemon.moves[0]
    };
  } else if (takerPokemon.speed > makerPokemon.speed) {
    return {
      firstAttacker: takerPokemon,
      firstMove: takerPokemon.moves[0],
      secondAttacker: makerPokemon,
      secondMove: makerPokemon.moves[0]
    };
  } else {
    return Math.random() < 0.5 ? {
      firstAttacker: makerPokemon,
      firstMove: makerPokemon.moves[0],
      secondAttacker: takerPokemon,
      secondMove: takerPokemon.moves[0]
    } : {
      firstAttacker: takerPokemon,
      firstMove: takerPokemon.moves[0],
      secondAttacker: makerPokemon,
      secondMove: makerPokemon.moves[0]
    };
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
export const determineBattleOutcome = (battle, makerPokemons, takerPokemons) => {
  /* if (makerPokemon.hp <= 0 && takerPokemon.hp <= 0) {
    battle.battle_log.push({ message: 'It\'s a tie!' }); //just for test purposes
    battle.status = 'ended';
  } else if (makerPokemon.hp <= 0) {
    battle.battle_log.push({ message: 'Taker wins!' });
    battle.status = 'ended';
  } else if (takerPokemon.hp <= 0) {
    battle.battle_log.push({ message: 'Maker wins!' });
    battle.status = 'ended';
  } */
 
  // iterate over the pokemons and check if everyone has <= 0 hp
  let makerAlive = false;
  let takerAlive = false;
  
  for (let i = 0; i < 3; i++) {
    if (makerPokemons[i].hp > 0) {
      makerAlive = true;
      break;
    }
  }

  for (let i = 0; i < 3; i++) {
    if (takerPokemons[i].hp > 0) {
      takerAlive = true;
      break;
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

function updatePokemonHp(pokemons, activeMonIndex, updatedPokemon) {
  pokemons[activeMonIndex] = updatedPokemon;
}

export const performBattle = async (battle) => {
  try {
    const { makerPokemons, takerPokemons, makerPokemon, takerPokemon } = loadPokemons(battle);
    
    const { firstAttacker, firstMove, secondAttacker, secondMove } = determineMoveOrder(makerPokemon, takerPokemon);

    battle.battle_log = battle.battle_log || [];

    processMove(battle, firstAttacker, firstMove, secondAttacker);
    if (secondAttacker.hp > 0) {
      processMove(battle, secondAttacker, secondMove, firstAttacker);
    }

    updatePokemonHp(makerPokemons, battle.maker_active_mon, makerPokemon);
    updatePokemonHp(takerPokemons, battle.taker_active_mon, takerPokemon);

    determineBattleOutcome(battle, makerPokemon, takerPokemon);

    await updateBattleInDatabase(battle, makerPokemons, takerPokemons);
  } catch (error) {
    console.error('Error performing battle:', error.message);
  }
}