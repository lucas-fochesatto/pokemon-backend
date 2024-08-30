class Battle {
  constructor(id, maker, taker, maker_pokemons, taker_pokemons, maker_hp, taker_hp, status) {
    this.id = id;
    this.maker = maker;
    this.taker = taker;
    this.maker_pokemons = maker_pokemons;
    this.taker_pokemons = taker_pokemons;
    this.maker_hp = maker_hp;
    this.taker_hp = taker_hp;
    this.status = status;
  }
}

export default Battle;