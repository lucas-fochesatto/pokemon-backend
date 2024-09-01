import pokemons from "./pokemons.js";

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

  executeMove(attacker, defender, battle) {
    battle.battle_log.push(`${this.name} was used!`);
    if (Math.random() * 100 <= this.accuracy) {
      this.onExecute(attacker, defender);
    } else {
      console.log(`${this.name} missed!`);
      battle.battle_log.push(`${this.name} missed!`);
    }
  }

  swapMove(owner, battle) {
    this.onExecute(owner, battle);
  }

  buffStat(pokemon, stat, amount, battle) {
    pokemon[stat] += amount;
    
    battle.battle_log.push('Pokemon' + pokemon.name + ' has increased its ' + stat + ' by ' + amount);
  }
}

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
    this.buffStat(attacker, 'attack', 10, battle);
  }),
  new Move(2, 'Vine Whip', 'Grass', 0, 100, 'A physical attack that deals damage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(3, 'Growl', 'Normal', 0, 100, 'Lowers the opponent\'s Attack by one stage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(4, 'Razor Leaf', 'Grass', 55, 95, 'A physical attack that deals damage with a high critical hit ratio.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(5, 'Solar Beam', 'Grass', 120, 100, 'Charges on the first turn, then attacks on the second.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(6, 'Sleep Powder', 'Grass', 0, 75, 'Puts the opponent to sleep.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(7, 'Leech Seed', 'Grass', 0, 90, 'Plants a seed on the opponent to absorb HP each turn.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(8, 'Scratch', 'Normal', 40, 100, 'A physical attack that deals damage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(9, 'Ember', 'Fire', 40, 100, 'Deals damage with a 10% chance to burn the opponent.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(10, 'Flamethrower', 'Fire', 90, 100, 'Deals damage with a 10% chance to burn the opponent.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(11, 'Smokescreen', 'Normal', null, 100, 'Lowers the opponent\'s accuracy by one stage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'accuracy', -10, battle);
  }),
  new Move(12, 'Wing Attack', 'Flying', 60, 100, 'A physical attack that deals damage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(13, 'Dragon Claw', 'Dragon', 80, 100, 'A physical attack that deals damage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(14, 'Water Gun', 'Water', 40, 100, 'A special attack that deals damage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(15, 'Tail Whip', 'Normal', null, 100, 'Lowers the opponent\'s Defense by one stage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'defense', -10, battle);
  }),
  new Move(16, 'Water Pulse', 'Water', 60, 100, 'A special attack that deals damage with a 20% chance to confuse the opponent.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(17, 'Bite', 'Dark', 60, 100, 'A physical attack that deals damage with a 30% chance to make the opponent flinch.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(18, 'Hydro Pump', 'Water', 110, 80, 'A powerful water attack that deals damage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(19, 'Skull Bash', 'Normal', 130, 100, 'The user tucks in its head, then attacks on the next turn.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(20, 'String Shot', 'Bug', null, 95, 'Lowers the opponent\'s speed by one stage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'speed', -10, battle);
  }),
  new Move(21, 'Harden', 'Normal', null, null, 'Raises the user\'s Defense by one stage.', function(attacker, defender, battle) {
    this.buffStat(attacker, 'defense', 10, battle);
  }),
  new Move(22, 'Gust', 'Flying', 40, 100, 'A special attack that deals damage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(23, 'Confusion', 'Psychic', 50, 100, 'A special attack that deals damage with a 10% chance to confuse the opponent.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(24, 'Poison Sting', 'Poison', 15, 100, 'A physical attack that deals damage with a 30% chance to poison the opponent.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(25, 'Twineedle', 'Bug', 25, 100, 'A physical attack that strikes the opponent twice.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(26, 'Poison Jab', 'Poison', 80, 100, 'A physical attack that deals damage with a 30% chance to poison the opponent.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(27, 'Agility', 'Psychic', null, null, 'Raises the user\'s Speed by two stages.', function(attacker, defender, battle) {
    this.buffStat(attacker, 'speed', 20, battle);
  }),
  new Move(28, 'Sand Attack', 'Ground', null, 100, 'Lowers the opponent\'s accuracy by one stage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'accuracy', -10, battle);
  }),
  new Move(29, 'Hurricane', 'Flying', 110, 70, 'A special attack that deals damage with a 30% chance to confuse the opponent.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(30, 'Hyper Fang', 'Normal', 80, 90, 'A physical attack that deals damage with a 10% chance to make the opponent flinch.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(31, 'Crunch', 'Dark', 80, 100, 'A physical attack that deals damage with a 20% chance to lower the opponent\'s Defense by one stage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'defense', -10, battle);
  }),
  new Move(32, 'Peck', 'Flying', 35, 100, 'A physical attack that deals damage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(33, 'Fury Attack', 'Normal', 15, 85, 'A physical attack that hits 2-5 times in a row.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(34, 'Drill Peck', 'Flying', 80, 100, 'A physical attack that deals damage.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(35, 'Wrap', 'Normal', 15, 90, 'A physical attack that deals damage and traps the opponent for 4-5 turns.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(36, 'Glare', 'Normal', null, 100, 'Paralyzes the opponent.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(37, 'Thunderbolt', 'Electric', 90, 100, 'Deals damage with a 10% chance to paralyze the opponent.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(38, 'Charm', 'Fairy', null, 100, 'Lowers the opponent\'s Attack by two stages.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(39, 'Bug Bite', 'Bug', 60, 100, 'A physical attack that deals damage and eats the opponent\'s Berry if it is holding one.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  }),
  new Move(40, 'Quick Attack', 'Normal', 40, 100, 'A physical attack that always goes first.', function(attacker, defender, battle) {
    this.buffStat(defender, 'attack', -10, battle);
  })
]