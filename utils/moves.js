import pokemons from "./pokemons.js";
import { typeMatchup } from "./typeMatchup.js";

class Move {
  constructor(id, name, type, power, accuracy, effect, onExecute, priority = 1) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.power = power;
    this.accuracy = accuracy;
    this.effect = effect;
    this.onExecute = onExecute;
    this.priority = priority;
  }

  getStatMultiplier(stage) {
    const multipliers = {
      "-6": 0.33,
      "-5": 0.375,
      "-4": 0.428,
      "-3": 0.5,
      "-2": 0.6,
      "-1": 0.75,
      "0": 1,
      "1": 1.33,
      "2": 1.66,
      "3": 2,
      "4": 2.33,
      "5": 2.66,
      "6": 3
    };
    return multipliers[stage.toString()] || 1;
  }

  executeMove(attacker, defender, battle) {
    battle.battle_log.push(`${attacker.name} used ${this.name}!`);

    // Calculate the accuracy roll using attacker's accuracy and defender's evasion
    const accuracyMultiplier = this.getStatMultiplier(attacker.status.statusMultipliers.accuracy);
    const evasionMultiplier = this.getStatMultiplier(defender.status.statusMultipliers.evasion);

    // Effective accuracy after applying multipliers
    const effectiveAccuracy = this.accuracy * (accuracyMultiplier / evasionMultiplier);

    // Determine if the move hits
    if (Math.random() * 100 <= effectiveAccuracy) {
      this.onExecute(attacker, defender, battle);
    } else {
      battle.battle_log.push(`${this.name} missed!`);
    }
  }

  dealDamage(attacker, defender, battle, critChance = 0.0625) {
    const modifier = typeMatchup[this.type][defender.type[0]] * (defender.type[1] ? typeMatchup[this.type][defender.type[1]] : 1);

    const modifierMessages = {
      0: `${defender.name} is not affected by ${this.name}!`,
      0.25: `${this.name} is not very effective...`,
      0.5: `${this.name} is not very effective...`,
      2: `${this.name} is super effective!`,
      4: `${this.name} is super effective!`
    };
    
    if (modifierMessages[modifier]) { // If the modifier is 1, we don't need to display a message
      battle.battle_log.push(modifierMessages[modifier]);
    }
    
    const atkMultiplier = this.getStatMultiplier(attacker.status.statusMultipliers.attack);
    const defMultiplier = this.getStatMultiplier(defender.status.statusMultipliers.defense);

    const stab = attacker.type.includes(this.type) ? 1.5 : 1;
    let isCrit = Math.random() < critChance;

    // console.log(critChance, isCrit, stab, modifier, atkMultiplier, defMultiplier);
    
    const damage = (isCrit + 1) * Math.ceil(
      Math.ceil(
        Math.ceil(
          Math.ceil((2 * (attacker.level || 50) / 5 + 2) * this.power * (attacker.attack * atkMultiplier / defender.defense * defMultiplier) / 50) + 2
        ) * stab * modifier
      )
    );
  
    defender.status.currentHP -= damage;
    battle.battle_log.push(`${defender.name} has taken ${damage} damage!`);
    isCrit && battle.battle_log.push('Critical hit!');

    return damage;
  }
  
  swapMove(owner, battle) {
    this.onExecute(owner, battle);
  }

  statsMultiplier(pokemon, stat, amount, battle) {
    pokemon.status[stat] += amount;
    battle.battle_log.push(`${pokemon.name}'s ${stat} was ${amount > 0 ? 'raised' : 'lowered'}!`);
  }

  healMove(attacker, evaluateNumber, battle, healPercentage = 1) {
    const healingAmount = Math.ceil(evaluateNumber * healPercentage);

    const actualHealing = Math.min(healingAmount, attacker.hp - attacker.status.currentHP);

    if (actualHealing) { //can be zero
      attacker.status.currentHP += actualHealing;
      battle.battle_log.push(`${attacker.name} healed for ${actualHealing} HP!`);
    } else {
      battle.battle_log.push(`${attacker.name} is already at full health!`);
    }
  }

  inflictStatus(defender, status, battle) {
    const validStatuses = ['paralyze', 'burn', 'freeze', 'poison', 'sleep', 'confuse', 'flinch', 'wrap'];
    
    // Check if the status to be inflicted is valid
    if (!validStatuses.includes(status)) {
      battle.battle_log.push(`${status} is not a valid status condition!`);
      return;
    }

    // Check if the defender already has a status condition
    if (defender.status.statusCondition !== '') {
      battle.battle_log.push(`${defender.name} is already affected by ${defender.status.statusCondition}!`);
    }

    // Set the new status condition
    defender.status.statusCondition = status;
  
    const statusMessages = {
      'paralyze': `${defender.name} is paralyzed! It may be unable to move!`,
      'burn': `${defender.name} is burned! It will take damage every turn!`,
      'freeze': `${defender.name} is frozen solid! It can't move!`,
      'poison': `${defender.name} is poisoned! It will take damage every turn!`,
      'sleep': `${defender.name} fell asleep! It won't be able to move!`,
      'confuse': `${defender.name} became confused! It might hurt itself in its confusion!`,
      'flinch': `${defender.name} flinched and couldn't move!`,
      'wrap': `${defender.name} is wrapped! It takes damage every turn and can't escape!`
    };
  
    if (statusMessages[status]) {
      battle.battle_log.push(statusMessages[status]);
    }
  }

}

class Effect {
  constructor(statusName, target, stat, amount, duration, startTurn) {
    this.statusName = statusName;
    this.target = target;
    this.stat = stat;
    this.amount = amount;
    this.duration = duration;
    this.startTurn = startTurn;
  }

  checkDuration() {
    return this.startTurn + this.duration <= battle.turn;
  }

  onPop() {
    this.target.status[this.stat] -= this.amount;
    effectsStack.splice(effectsStack.indexOf(this), 1);
  }
}

export class StartEffect extends Effect {
  constructor(statusName, target, stat, amount, duration, startTurn, triggerStart, triggerEnd) {
    super(statusName, target, stat, amount, duration, startTurn);
    this.triggerStart = triggerStart;
    this.triggerEnd = triggerEnd;
  }
}

export class EndEffect extends Effect {
  constructor(statusName, target, stat, amount, duration, startTurn, triggerEnd) {
    super(statusName, target, stat, amount, duration, startTurn);
    this.triggerEnd = triggerEnd;
  }
}

const pushEffect = (effect) => {
  effectsStack.push(effect);
}



export const effectsStack = [];

export const moveset = [
  new Move(0, 'Swap', null, 0, 100, 'Swap the active Pokemon.', function(owner, battle) {
    if(owner == 'maker') {
      // flip two entry array maker_battling_pokemons
      let temp = battle.maker_battling_pokemons[0];
      battle.maker_battling_pokemons[0] = battle.maker_battling_pokemons[1];
      battle.maker_battling_pokemons[1] = temp;
    } else {
      // flip two entry array taker_battling_pokemons
      let temp = battle.taker_battling_pokemons[0];
      battle.taker_battling_pokemons[0] = battle.taker_battling_pokemons[1];
      battle.taker_battling_pokemons[1] = temp;
    }
  }, 10),
  new Move(1, 'Tackle', 'Normal', 40, 100, 'A physical attack that deals damage.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
  }),
  new Move(2, 'Vine Whip', 'Grass', 45, 100, 'A physical attack that deals damage.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
  }),
  new Move(3, 'Growl', 'Normal', 0, 100, 'Lowers the opponent\'s Attack by one stage.', function(attacker, defender, battle) {
    this.statsMultiplier(defender, 'attack', -1, battle);
    // pushEffect(new Effect(defender, 'attack', -1, Infinity))
  }),
  new Move(4, 'Razor Leaf', 'Grass', 55, 95, 'A physical attack that deals damage with a high critical hit ratio.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle, 0.125);
  }),
  new Move(5, 'Solar Beam', 'Grass', 120, 100, 'Charges on the first turn, then attacks on the second.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
  }),
  new Move(6, 'Sleep Powder', 'Grass', 0, 75, 'Puts the opponent to sleep.', function(attacker, defender, battle) {
    this.inflictStatus(defender, 'sleep', battle);
  }),
  new Move(7, 'Leech Seed', 'Grass', 0, 90, 'Plants a seed on the opponent to absorb HP each turn.', function(attacker, defender, battle) {
    this.inflictStatus(defender, 'leech seed', battle);
  }),
  new Move(8, 'Scratch', 'Normal', 40, 100, 'A physical attack that deals damage.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
  }),
  new Move(9, 'Ember', 'Fire', 40, 100, 'Deals damage with a 10% chance to burn the opponent.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
    if (Math.random() < 0.1) this.inflictStatus(defender, 'burn', battle);
  }),
  new Move(10, 'Flamethrower', 'Fire', 90, 100, 'Deals damage with a 10% chance to burn the opponent.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
    if (Math.random() < 0.1) this.inflictStatus(defender, 'burn', battle);
  }),
  new Move(11, 'Smokescreen', 'Normal', null, 100, 'Lowers the opponent\'s accuracy by one stage.', function(attacker, defender, battle) {
    this.statsMultiplier(defender, 'accuracy', -1, battle);
  }),
  new Move(12, 'Wing Attack', 'Flying', 60, 100, 'A physical attack that deals damage.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
  }),
  new Move(13, 'Dragon Claw', 'Dragon', 80, 100, 'A physical attack that deals damage.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
  }),
  new Move(14, 'Water Gun', 'Water', 40, 100, 'A special attack that deals damage.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
  }),
  new Move(15, 'Tail Whip', 'Normal', null, 100, 'Lowers the opponent\'s Defense by one stage.', function(attacker, defender, battle) {
    this.statsMultiplier(defender, 'defense', -1, battle);
  }),
  new Move(16, 'Water Pulse', 'Water', 60, 100, 'A special attack that deals damage with a 20% chance to confuse the opponent.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
    if (Math.random() < 0.2) this.inflictStatus(defender, 'confuse', battle);
  }),
  new Move(17, 'Bite', 'Dark', 60, 100, 'A physical attack that deals damage with a 30% chance to flinch.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
    if (Math.random() < 0.3) this.inflictStatus(defender, 'flinch', battle);
  }),
  new Move(18, 'Hydro Pump', 'Water', 110, 80, 'A special attack that deals damage.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
  }),
  new Move(19, 'Skull Bash', 'Normal', 130, 100, 'A physical attack that raises Defense on the first turn, then deals damage on the second.', function(attacker, defender, battle) {
    this.statsMultiplier(attacker, 'defense', 1, battle);
    this.dealDamage(attacker, defender, battle);
  }),
  new Move(20, 'String Shot', 'Bug', null, 95, 'Lowers the opponent\'s Speed by one stage.', function(attacker, defender, battle) {
    this.statsMultiplier(defender, 'speed', -1, battle);
  }),
  new Move(21, 'Harden', 'Normal', null, null, 'Raises the user\'s Defense by one stage.', function(attacker, defender, battle) {
    this.statsMultiplier(attacker, 'defense', 1, battle);
  }),
  new Move(22, 'Gust', 'Flying', 40, 100, 'A special attack that deals damage.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
  }),
  new Move(23, 'Confusion', 'Psychic', 50, 100, 'A special attack that deals damage with a 10% chance to confuse the opponent.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
    if (Math.random() < 0.1) this.inflictStatus(defender, 'confuse', battle);
  }),
  new Move(24, 'Poison Sting', 'Poison', 15, 100, 'A physical attack that deals damage with a 30% chance to poison the opponent.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
    if (Math.random() < 0.3) this.inflictStatus(defender, 'poison', battle);
  }),
  new Move(25, 'Twineedle', 'Bug', 25, 100, 'A physical attack that hits the target twice.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
    this.dealDamage(attacker, defender, battle);
    if (Math.random() < 0.1) this.inflictStatus(defender, 'poison', battle);
  }),
  new Move(26, 'Poison Jab', 'Poison', 80, 100, 'A physical attack that deals damage with a 30% chance to poison the opponent.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
    if (Math.random() < 0.3) this.inflictStatus(defender, 'poison', battle);
  }),
  new Move(27, 'Agility', 'Psychic', null, null, 'Raises the user\'s Speed by two stages.', function(attacker, defender, battle) {
    this.statsMultiplier(attacker, 'speed', 2, battle);
  }),
  new Move(28, 'Sand Attack', 'Ground', null, 100, 'Lowers the opponent\'s accuracy by one stage.', function(attacker, defender, battle) {
    this.statsMultiplier(defender, 'accuracy', -1, battle);
  }),
  new Move(29, 'Hurricane', 'Flying', 110, 70, 'A special attack that deals damage with a 30% chance to confuse the opponent.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
    if (Math.random() < 0.3) this.inflictStatus(defender, 'confuse', battle);
  }),
  new Move(30, 'Hyper Fang', 'Normal', 80, 90, 'A physical attack that deals damage with a 10% chance to flinch the opponent.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
    if (Math.random() < 0.1) this.inflictStatus(defender, 'flinch', battle);
  }),
  new Move(31, 'Crunch', 'Dark', 80, 100, 'A physical attack that deals damage with a 20% chance to lower the opponent\'s Defense by one stage.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
    if (Math.random() < 0.2) this.statsMultiplier(defender, 'defense', -1, battle);
  }),
  new Move(32, 'Peck', 'Flying', 35, 100, 'A physical attack that deals damage.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
  }),
  new Move(33, 'Fury Attack', 'Normal', 15, 85, 'A physical attack that hits the target 2-5 times.', function(attacker, defender, battle) {
    const hits = Math.floor(Math.random() * 4) + 2; // Random between 2 and 5
    for (let i = 0; i < hits; i++) {
      this.dealDamage(attacker, defender, battle);
    }
  }),
  new Move(34, 'Drill Peck', 'Flying', 80, 100, 'A physical attack that deals damage.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
  }),
  new Move(35, 'Wrap', 'Normal', 15, 90, 'A physical attack that deals damage and prevents the opponent from escaping for 2-5 turns.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
    this.inflictStatus(defender, 'wrap', battle);
  }),
  new Move(36, 'Glare', 'Normal', null, 100, 'Paralyzes the opponent.', function(attacker, defender, battle) {
    this.inflictStatus(defender, 'paralyze', battle);
  }),
  new Move(37, 'Thunderbolt', 'Electric', 90, 100, 'A special attack that deals damage with a 10% chance to paralyze the opponent.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
    if (Math.random() < 0.1) this.inflictStatus(defender, 'paralyze', battle);
  }),
  new Move(38, 'Charm', 'Fairy', null, 100, 'Lowers the opponent\'s Attack by two stages.', function(attacker, defender, battle) {
    this.statsMultiplier(defender, 'attack', -2, battle);
  }),
  new Move(39, 'Bug Bite', 'Bug', 60, 100, 'A physical attack that deals damage and eats the opponent\'s Berry if it is holding one.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
  }),
  new Move(40, 'Quick Attack', 'Normal', 40, 100, 'A physical attack that always goes first.', function(attacker, defender, battle) {
    this.dealDamage(attacker, defender, battle);
  }),
  new Move(41, 'Giga Drain', 'Grass', 75, 100, 'A physical attack that deals damage and heals the user for a portion of the damage dealt.', function(attacker, defender, battle) {
    const damageDealt = this.dealDamage(attacker, defender, battle);
    this.healMove(attacker, damageDealt, battle, 0.5); // Heal for 50% of the damage dealt
  }),
  new Move(42, 'Soft Boiled', 'Normal', null, null, 'Heals the user for 50% of its max HP.', function(attacker, defender, battle) {
    this.healMove(attacker, attacker.hp, battle, 0.5);
  }),
  new Move(43, 'Swords Dance', 'Normal', null, null, 'Raises the user\'s Attack by two stages.', function(attacker, defender, battle) {
    this.statsMultiplier(attacker, 'attack', 2, battle);
  }),
  new Move(44, 'Drain Punch', 'Fighting', 75, 100, 'A physical attack that deals damage and heals the user for a portion of the damage dealt.', function(attacker, defender, battle) {
    const damageDealt = this.dealDamage(attacker, defender, battle);
    this.healMove(attacker, damageDealt, battle, 0.5);
  }),
  new Move(45, 'Drain Kiss', 'Fairy', 50, 100, 'A special attack that deals damage and heals the user for a portion of the damage dealt.', function(attacker, defender, battle) {
    const damageDealt = this.dealDamage(attacker, defender, battle);
    this.healMove(attacker, damageDealt, battle, 0.5);
  }),
  new Move(46, 'Recover', 'Normal', null, null, 'Heals the user for 50% of its max HP.', function(attacker, defender, battle) {
    this.healMove(attacker, attacker.hp, battle, 0.5);
  }),
  new Move(47, 'Rest', 'Psychic', null, null, 'Puts the user to sleep and heals it for 100% of its max HP.', function(attacker, defender, battle) {
    this.healMove(attacker, attacker.hp, battle);
    this.inflictStatus(attacker, 'sleep', battle);
  }),
];

// const attacker = pokemons[8];
// const defender = pokemons[1];
// const battle = {
//   battle_log: [],
//   turn: 1
// };

// moveset[29].executeMove(attacker, defender, battle);

// console.log(battle.battle_log);