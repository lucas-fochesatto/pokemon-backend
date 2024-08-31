class Battle {
  constructor(id, maker, taker, maker_pokemons,maker_active_mon, taker_pokemons,taker_active_mon, maker_move, taker_move, status, battle_log) {
    this.id = id;
    this.maker = maker;
    this.taker = taker;
    this.maker_pokemons = maker_pokemons;
    this.maker_active_mon = maker_active_mon;
    this.taker_pokemons = taker_pokemons;
    this.taker_active_mon = taker_active_mon;
    this.maker_move = maker_move;
    this.taker_move = taker_move;
    this.status = status;
    this.battle_log = battle_log; 
  }
}

export default Battle;