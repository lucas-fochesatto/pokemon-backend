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

  executeMove(agent, battle) {
    const attacker = agent == 'maker' ? battle.maker_pokemons[battle.maker_battling_pokemons[0]] : battle.taker_pokemons[battle.taker_battling_pokemons[0]];
    const defender = agent == 'maker' ? battle.taker_pokemons[battle.taker_battling_pokemons[0]] : battle.maker_pokemons[battle.maker_battling_pokemons[0]];
    // pensar num log decente aqui
    // battle.battle_log.push(`${attacker.name} used ${this.name}!`);
    console.log(this.onExecute.arguments);
    if (Math.random() * 100 <= this.accuracy) { //implement accuracy and evasion
      this.onExecute(agent, battle, attacker, defender);
    } else {
      console.log(`${this.name} missed!`);
      battle.battle_log.push(`${this.name} missed!`);
    }
  }

  dealDamage(agent, battle, attacker, defender) {
    const modifier = typeMatchup[this.type][defender.type[0]] * (defender.type[1] ? typeMatchup[this.type][defender.type[1]] : 1);

    console.log(attacker, defender);

    console.log(modifier);

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
  
    const getStatusMultiplier = (status) => {
      const multipliers = {
        "-6": 0.25,
        "-5": 0.285,
        "-4": 0.33,
        "-3": 0.4,
        "-2": 0.5,
        "-1": 0.66,
        "0": 1,
        "1": 1.5,
        "2": 2,
        "3": 2.5,
        "4": 3,
        "5": 3.5,
        "6": 4
      };
      return multipliers[status] || 1;
    };
  
    const atkMultiplier = getStatusMultiplier(attacker.status.statusMultipliers.attack);
    const defMultiplier = getStatusMultiplier(defender.status.statusMultipliers.defense);
    //implement accuracy and evasion

    console.log(atkMultiplier, defMultiplier);
  
    const stab = attacker.type.includes(this.type) ? 1.5 : 1;
    const damage = Math.floor(
      Math.floor(
        Math.floor(
          Math.floor((2 * (attacker.level || 10) / 5 + 2) * this.power * (attacker.attack * atkMultiplier / defender.defense * defMultiplier) / 50) + 2
        ) * stab * modifier
      )
    );
  
    defender.hp -= damage;
    battle.battle_log.push(`${defender.name} has taken ${damage} damage!`);
  }

  statsMultiplier(pokemon, stat, amount, battle) {
    pokemon.status[stat] += amount;
    battle.battle_log.push(`${pokemon.name}'s ${stat} was ${amount > 0 ? 'raised' : 'lowered'}!`);
  }

  inflictStatus(defender, status, battle) {
    const validStatuses = ['paralyze', 'burn', 'freeze', 'poison', 'sleep', 'confuse', 'flinch', 'wrap'];
    
    if (!validStatuses.includes(status) || defender.status.currentStatus.includes(status)) {
      battle.battle_log.push(`${defender.name} is already affected by ${status} or cannot be affected!`);
      return;
    }
    
    defender.status.currentStatus.push(status);
  
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
  new Move(1, 'Tackle', 'Normal', 40, 100, 'A physical attack that deals damage.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
  }),
  new Move(2, 'Vine Whip', 'Grass', 45, 100, 'A physical attack that deals damage.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
  }),
  new Move(3, 'Growl', 'Normal', 0, 100, 'Lowers the opponent\'s Attack by one stage.', function(agent, battle, attacker, defender) {
    this.statsMultiplier(defender, 'attack', -1, battle);
  }),
  new Move(4, 'Razor Leaf', 'Grass', 55, 95, 'A physical attack that deals damage with a high critical hit ratio.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
  }),
  new Move(5, 'Solar Beam', 'Grass', 120, 100, 'Charges on the first turn, then attacks on the second.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
  }),
  new Move(6, 'Sleep Powder', 'Grass', 0, 75, 'Puts the opponent to sleep.', function(agent, battle, attacker, defender) {
    this.inflictStatus(defender, 'sleep', battle);
  }),
  new Move(7, 'Leech Seed', 'Grass', 0, 90, 'Plants a seed on the opponent to absorb HP each turn.', function(agent, battle, attacker, defender) {
    this.inflictStatus(defender, 'leech seed', battle);
  }),
  new Move(8, 'Scratch', 'Normal', 40, 100, 'A physical attack that deals damage.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
  }),
  new Move(9, 'Ember', 'Fire', 40, 100, 'Deals damage with a 10% chance to burn the opponent.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
    if (Math.random() < 0.1) this.inflictStatus(defender, 'burn', battle);
  }),
  new Move(10, 'Flamethrower', 'Fire', 90, 100, 'Deals damage with a 10% chance to burn the opponent.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
    if (Math.random() < 0.1) this.inflictStatus(defender, 'burn', battle);
  }),
  new Move(11, 'Smokescreen', 'Normal', null, 100, 'Lowers the opponent\'s accuracy by one stage.', function(agent, battle, attacker, defender) {
    this.statsMultiplier(defender, 'accuracy', -1, battle);
  }),
  new Move(12, 'Wing Attack', 'Flying', 60, 100, 'A physical attack that deals damage.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
  }),
  new Move(13, 'Dragon Claw', 'Dragon', 80, 100, 'A physical attack that deals damage.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
  }),
  new Move(14, 'Water Gun', 'Water', 40, 100, 'A special attack that deals damage.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
  }),
  new Move(15, 'Tail Whip', 'Normal', null, 100, 'Lowers the opponent\'s Defense by one stage.', function(agent, battle, attacker, defender) {
    this.statsMultiplier(defender, 'defense', -1, battle);
  }),
  new Move(16, 'Water Pulse', 'Water', 60, 100, 'A special attack that deals damage with a 20% chance to confuse the opponent.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
    if (Math.random() < 0.2) this.inflictStatus(defender, 'confuse', battle);
  }),
  new Move(17, 'Bite', 'Dark', 60, 100, 'A physical attack that deals damage with a 30% chance to flinch.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
    if (Math.random() < 0.3) this.inflictStatus(defender, 'flinch', battle);
  }),
  new Move(18, 'Hydro Pump', 'Water', 110, 80, 'A special attack that deals damage.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
  }),
  new Move(19, 'Skull Bash', 'Normal', 130, 100, 'A physical attack that raises Defense on the first turn, then deals damage on the second.', function(agent, battle, attacker, defender) {
    this.statsMultiplier(attacker, 'defense', 1, battle);
    this.dealDamage(agent, battle, attacker, defender);
  }),
  new Move(20, 'String Shot', 'Bug', null, 95, 'Lowers the opponent\'s Speed by one stage.', function(agent, battle, attacker, defender) {
    this.statsMultiplier(defender, 'speed', -1, battle);
  }),
  new Move(21, 'Harden', 'Normal', null, null, 'Raises the user\'s Defense by one stage.', function(agent, battle, attacker, defender) {
    this.statsMultiplier(attacker, 'defense', 1, battle);
  }),
  new Move(22, 'Gust', 'Flying', 40, 100, 'A special attack that deals damage.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
  }),
  new Move(23, 'Confusion', 'Psychic', 50, 100, 'A special attack that deals damage with a 10% chance to confuse the opponent.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
    if (Math.random() < 0.1) this.inflictStatus(defender, 'confuse', battle);
  }),
  new Move(24, 'Poison Sting', 'Poison', 15, 100, 'A physical attack that deals damage with a 30% chance to poison the opponent.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
    if (Math.random() < 0.3) this.inflictStatus(defender, 'poison', battle);
  }),
  new Move(25, 'Twineedle', 'Bug', 25, 100, 'A physical attack that hits the target twice.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
    this.dealDamage(agent, battle, attacker, defender);
  }),
  new Move(26, 'Poison Jab', 'Poison', 80, 100, 'A physical attack that deals damage with a 30% chance to poison the opponent.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
    if (Math.random() < 0.3) this.inflictStatus(defender, 'poison', battle);
  }),
  new Move(27, 'Agility', 'Psychic', null, null, 'Raises the user\'s Speed by two stages.', function(agent, battle, attacker, defender) {
    this.statsMultiplier(attacker, 'speed', 2, battle);
  }),
  new Move(28, 'Sand Attack', 'Ground', null, 100, 'Lowers the opponent\'s accuracy by one stage.', function(agent, battle, attacker, defender) {
    this.statsMultiplier(defender, 'accuracy', -1, battle);
  }),
  new Move(29, 'Hurricane', 'Flying', 110, 70, 'A special attack that deals damage with a 30% chance to confuse the opponent.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
    if (Math.random() < 0.3) this.inflictStatus(defender, 'confuse', battle);
  }),
  new Move(30, 'Hyper Fang', 'Normal', 80, 90, 'A physical attack that deals damage with a 10% chance to flinch the opponent.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
    if (Math.random() < 0.1) this.inflictStatus(defender, 'flinch', battle);
  }),
  new Move(31, 'Crunch', 'Dark', 80, 100, 'A physical attack that deals damage with a 20% chance to lower the opponent\'s Defense by one stage.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
    if (Math.random() < 0.2) this.statsMultiplier(defender, 'defense', -1, battle);
  }),
  new Move(32, 'Peck', 'Flying', 35, 100, 'A physical attack that deals damage.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
  }),
  new Move(33, 'Fury Attack', 'Normal', 15, 85, 'A physical attack that hits the target 2-5 times.', function(agent, battle, attacker, defender) {
    const hits = Math.floor(Math.random() * 4) + 2; // Random between 2 and 5
    for (let i = 0; i < hits; i++) {
      this.dealDamage(agent, battle, attacker, defender);
    }
  }),
  new Move(34, 'Drill Peck', 'Flying', 80, 100, 'A physical attack that deals damage.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
  }),
  new Move(35, 'Wrap', 'Normal', 15, 90, 'A physical attack that deals damage and prevents the opponent from escaping for 2-5 turns.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
    this.inflictStatus(defender, 'wrap', battle);
  }),
  new Move(36, 'Glare', 'Normal', null, 100, 'Paralyzes the opponent.', function(agent, battle, attacker, defender) {
    this.inflictStatus(defender, 'paralyze', battle);
  }),
  new Move(37, 'Thunderbolt', 'Electric', 90, 100, 'A special attack that deals damage with a 10% chance to paralyze the opponent.', function(agent, battle, attacker, defender) {
    this.dealDamage(agent, battle, attacker, defender);
    if (Math.random() < 0.1) this.inflictStatus(defender, 'paralyze', battle);
  }),
  new Move(38, 'Charm', 'Fairy', null, 100, 'Lowers the opponent\'s Attack by two stages.', function(agent, battle, attacker, defender) {
    this.statsMultiplier(defender, 'attack', -2, battle);
  }),
  new Move(39, 'Bug Bite', 'Bug', 60, 100, 'A physical attack that deals damage and eats the opponent\'s Berry if it is holding one.', function(agent, battle, attacker, defender) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(40, 'Quick Attack', 'Normal', 40, 100, 'A physical attack that always goes first.', function(agent, battle, attacker, defender) {
    this.buffStat(defender, 'attack', -10, battle);
  })
];

/* let atker = pokemons[5];
let defndr = pokemons[2];
let battle = {battle_log: []};

moveset[9].executeMove(atker, defndr, battle);

console.log(battle.battle_log); */
// moveset[1].executeMove(atker, defndr, battle);

//moveset.find(move => move.id == 1).onExecute(pokemon1, 'defender');