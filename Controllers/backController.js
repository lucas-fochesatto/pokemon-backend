import db from "../database.js";
import Battle from "../Models/Battle.js";
import pokemons from "../utils/pokemons.js";
import { localSigner, provider } from "../ethers.js";
import { ethers } from "ethers";
import { bothPlayersMoved, createBattleInstance, getBattleFromDb, isUserPartOfBattle, performBattle, updateBattleInDatabase, updateMove } from "../utils/battleUtils.js";
import { moveset } from "../utils/moveset.js";
import { MT19937 } from "../utils/MT19937.js";

/* Essa função serve apenas para facilitar o mint de pokemons */
export const sendTransaction = async (req, res) => {
  try {
    const connectedLocalSigner = localSigner.connect(provider);

    const tx = {
      to: process.env.RECEIVER_ADDRESS,
      value: ethers.utils.parseEther('0.000777')
    }

    const transaction = await connectedLocalSigner.sendTransaction(tx);
    const receipt = await transaction.wait();

    res.status(200).json({ message: 'Transaction sent successfully', receipt });
  } catch (err) {
    console.log(err);
  }
}

/* função vai deixar de existir, apenas por smart contract no front */
export const assignPokemon = async (req, res) => {
  const { senderId, senderWallet } = req.body;

  const timestamp = Math.floor(Date.now() / 1000);

  const mt = new MT19937(timestamp);

  const pokemonId = mt.randomPokemon(1,25);

  db.get('SELECT * FROM players WHERE playerid = ?', [senderId], (err, row) => {
    if (err) {
      throw err;
    }

    const player = row;

    if(!player) {
      console.log('Player not found, creating new player');
      db.run('INSERT INTO players (playerid, wallet, inventory) VALUES (?, ?, ?)', [senderId, senderWallet, JSON.stringify([pokemonId])]);

      return res.status(200).json({ message: 'Player created successfully', pokemonId });
    }

    const inventory = JSON.parse(player.inventory);
    inventory.push(pokemonId);
    console.log(inventory);
    db.run('UPDATE players SET inventory = ? WHERE playerid = ?', [JSON.stringify(inventory), senderId], (err) => {
      if (err) {
        throw err;
      }

      res.status(200).json({ message: 'Pokemon assigned successfully', pokemonId });
    });    
  })
}

/* trocar para um read no smart contract */
export const pokemonsByPlayerId = async (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM players WHERE playerid = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Error getting inventory', error: err.message });
    }

    const inventory = row.inventory;

    res.status(200).json({inventory});
  });
}

export const createBattle = async (req, res) => {
  try {
    const { maker, maker_pokemons } = req.body;

    // maker_pokemons is an array of pokemon IDs
    // we need to convert it to an array of pokemon objects
    const makerPokemons = [];
    const makerPokemonsJSON = JSON.parse(maker_pokemons);
    
    makerPokemonsJSON.map((pokemon, index) => {
      makerPokemons.push(pokemons[pokemon-1]);
      makerPokemons[index].moveDetails = [];
    
      makerPokemons[index].moves.map(move => {
        makerPokemons[index].moveDetails.push(moveset[move]);
      })
    });

    const newBattle = new Battle(null, maker, null, JSON.stringify(makerPokemons), null, null, null, null, null, 'waiting', 0, null);

    const insert = db.prepare('INSERT INTO battles (maker, maker_pokemons, maker_battling_pokemons, status, current_turn, battle_log) VALUES (?, ?, ?, ?, ?, ?)');
    
    // Executa a inserção e obtém o ID do registro recém inserido
    insert.run(newBattle.maker, newBattle.maker_pokemons, '[0,1]', newBattle.status, 0, '[]', function(err) {
      if (err) {
        return res.status(500).json({ message: 'Error creating battle', error: err.message });
      }
      
      // Atribui o ID recém inserido à newBattle
      newBattle.id = this.lastID;
      
      // Retorna a batalha com o ID
      res.status(200).json({ message: 'Battle created successfully', newBattle });
    });
    
    insert.finalize();
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getBattleById = async (req, res) => {
  try {
    const { id } = req.params;

    db.get('SELECT * FROM  battles WHERE id = ?', [id], (err, row) => {
      if (err) {
        throw err;
      }

      const battle = createBattleInstance(row);

      res.status(200).json(battle);
    });
  } catch (error) {
    console.log(error);
  }
}

export const joinBattle = async (req, res) => {
  try {
    const { battleId, taker, taker_pokemons } = req.body;
    
    let takerPokemons = [];
    const takerPokemonsJSON = JSON.parse(taker_pokemons);

    console.log('Receieved taker', req.body);

    takerPokemonsJSON.map((pokemon, index) => {
      takerPokemons.push(pokemons[pokemon-1]);
      takerPokemons[index].moveDetails = [];
    
      takerPokemons[index].moves.map(move => {
        takerPokemons[index].moveDetails.push(moveset[move]);
      })
    });

    db.run('UPDATE battles SET taker = ?, taker_pokemons = ?, taker_battling_pokemons = ?, status = ? WHERE id = ?', [taker, JSON.stringify(takerPokemons), '[0,1]', 'ongoing', battleId], (err) => {
      if (err) {
        throw err;
      }

      console.log('Battle updated successfully');

      res.status(200).json({ message: 'Battle joined successfully' });
    });
  } catch (error) {
    console.log(error);
  }
}

export const selectPokemons = async (req, res) => {
  const { battleId, userFid, pokemons } = req.body;

  const row = await getBattleFromDb(battleId);
  if (!row) return res.status(404).json({ message: 'Battle not found' });

  const battle = createBattleInstance(row);

  if (!isUserPartOfBattle(battle, userFid)) {
    return res.status(400).json({ message: 'User is not part of the battle' });
  }

  if (battle.status !== 'waiting') {
    return res.status(400).json({ message: 'Battle has already started' });
  }

  const agent = battle.maker === userFid ? 'maker' : 'taker';
  battle[`${agent}_battling_pokemons`] = pokemons;

  const otherExecutor = agent === 'maker' ? 'taker' : 'maker';
  if(battle[`${otherExecutor}_battling_pokemons`]) {
    battle.status = 'ongoing';
  }

  const column = `${agent}_battling_pokemons`;
  db.run(`UPDATE battles SET ${column} = ?, status = ? WHERE id = ?`, [pokemons, battle.status, battleId], (err) => {
    if (err) {
      return res.status(500).json({ message: 'An error occurred' });
    }

    res.status(200).json({ message: 'Pokemons selected successfully' });
  });
}

export const makeMove = async (req, res) => {
  try {
    const { battleId, userFid, move } = req.body;

    const row = await getBattleFromDb(battleId);
    if (!row) return res.status(404).json({ message: 'Battle not found' });

    const battle = createBattleInstance(row);
    
    if (!isUserPartOfBattle(battle, userFid)) {
      return res.status(400).json({ message: 'User is not part of the battle' });
    }

    if (battle.status === 'ended') {
      return res.status(400).json({ message: 'Battle has already ended' });
    }

    if (battle.status === 'waiting') {
      return res.status(400).json({ message: 'Battle has not started yet' });
    }

    if (bothPlayersMoved(battle)) {
      return res.status(400).json({ message: 'Both players have already moved' });
    }

    // check if pokemon has the move
    const agent = battle.maker === userFid ? 'maker' : 'taker';
    const pokemon = battle[`${agent}_pokemons`][battle[`${agent}_battling_pokemons`][0]];
    
    const moveDetails = pokemon.moveDetails.find(m => m.id == move);
    if (!moveDetails) {
      return res.status(400).json({ message: 'Pokemon does not have the move' });
    }

    updateMove(battle, userFid, move);

    if (bothPlayersMoved(battle)) {
      console.log('performing battle...');
      performBattle(battle);
    }

    await updateBattleInDatabase(battle);

    if(battle.status === 'ended') {
      await registerBattleLog(battle);

      res.status(200).json({ message: 'Battle ended', battle });

      return;
    }

    res.status(200).json({ message: 'Battle status changed', battle });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
}

export const registerBattleLog = async (battle) => {
  try {
    db.run('INSERT INTO battle_logs (battle_id, log) VALUES (?, ?)', [battle.id, JSON.stringify(battle.battleLog)], (err) => {
      if (err) {
        console.error(err);
      }
    });

  } catch (error) {
    console.error(error);
  }
}

export const getPokemonById = async (req, res) => {
  const { id } = req.params;

  const pokemon = pokemons[id-1];

  res.status(200).json(pokemon);
}

export const getPokemonName = async (req, res) => {
  const { id } = req.params;

  console.log('received id', id);

  const pokemon = pokemons[id-1];

  res.status(200).json({ name: pokemon.name });
}