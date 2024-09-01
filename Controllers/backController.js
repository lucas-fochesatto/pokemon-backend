import db from "../database.js";
import Battle from "../Models/Battle.js";
import pokemons from "../utils/pokemons.js";
import { localSigner, provider } from "../ethers.js";
import { BigNumber, ethers } from "ethers";
import { INPUTBOX_ABI } from "../utils/inputBoxAbi.js";
import { bothPlayersMoved, createBattleInstance, getBattleFromDb, isUserPartOfBattle, performBattle, updateMove } from "../utils/battleUtils.js";
import { moveset } from "../utils/moves.js";

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

export const assignPokemon = async (req, res) => {
  const { hash, senderId } = req.body;

  console.log('SenderId is', senderId);

  // Verifica se o hash já foi usado
  const row = await new Promise((resolve, reject) => {
    db.get('SELECT * FROM hashes WHERE hash = ?', [hash], (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row);
    });
  });

  if (row) {
    return res.status(400).json({ message: 'Hash already used' });
  }

  console.log("Hash not used yet");

  // Insere o hash no banco de dados após a transação
  const insert = db.prepare('INSERT INTO hashes (hash) VALUES (?)');
  insert.run(hash);
  insert.finalize();

  try {
    const connectedLocalSigner = localSigner.connect(provider);
    const senderWallet = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

    // Usa o signer para chamar o smart contract inputBox
    const inputBoxContract = new ethers.Contract(
      process.env.INPUTBOX_ADDRESS || '0x59b22D57D4f067708AB0c00552767405926dc768',
      INPUTBOX_ABI,
      connectedLocalSigner
    );
    console.log('Connected to inputBox contract');

    const tx = await inputBoxContract.addInput(
      process.env.DAPP_ADDRESS || '0xab7528bb862fb57e8a2bcd567a2e929a0be56a5e',
      ethers.utils.toUtf8Bytes(JSON.stringify({ senderId, senderWallet, action: 'mint-pokemon' }))
    );

    const receipt = await tx.wait();

    res.status(200).json({ message: 'Pokemon assigned successfully', pokemonId: receipt.events[0].args[1] });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
}


export const pokemonsByPlayerId = async (req, res) => {
  const { id } = req.params;

  const query = {
    senderId: Number(id),
    action: 'get-user-pokemons'
  }

  const hexQuery = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(JSON.stringify(query)));

  const response = await fetch(`${process.env.INSPECT_URL}/${hexQuery}`);
  const data = await response.json();
  const payload = data.reports[0].payload;

  const obj = JSON.parse(ethers.utils.toUtf8String(payload));
  const inventory = JSON.parse(obj.object.inventory);

  console.log(inventory);

  res.status(200).json({inventory});
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

    const insert = db.prepare('INSERT INTO battles (maker, maker_pokemons, status) VALUES (?, ?, ?)');
    
    // Executa a inserção e obtém o ID do registro recém inserido
    insert.run(newBattle.maker, newBattle.maker_pokemons, newBattle.status, function(err) {
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

      const battle = new Battle(row.id, row.maker, row.opponent, row.maker_pokemons, row.opponent_pokemons, row.maker_hp, row.opponent_hp, row.status);

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

    db.run('UPDATE battles SET taker = ?, taker_pokemons = ?, status = ? WHERE id = ?', [taker, JSON.stringify(takerPokemons), 'ongoing', battleId], (err) => {
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

  if (battle.maker === userFid) {
    // verify if the user has the pokemons
    const makerPokemons = JSON.parse(battle.maker_pokemons);
    for (let i = 0; i < pokemons.length; i++) {
      if (!makerPokemons.find(pokemon => pokemon.id === pokemons[i])) {
        return res.status(400).json({ message: 'User does not have the pokemons' });
      }
    }
    battle.maker_battling_pokemons = pokemons;
  } else {
    // verify if the user has the pokemons
    const takerPokemons = JSON.parse(battle.taker_pokemons);
    for (let i = 0; i < pokemons.length; i++) {
      if (!takerPokemons.find(pokemon => pokemon.id === pokemons[i])) {
        return res.status(400).json({ message: 'User does not have the pokemons' });
      }
    }
    battle.taker_battling_pokemons = pokemons;
  }

  const executor = battle.maker === userFid ? 'maker' : 'taker';
  const column = `${executor}_battling_pokemons`;
  db.run(`UPDATE battles SET ${column} = ? WHERE id = ?`, [JSON.stringify(pokemons), battleId], (err) => {
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
    console.log(battle);
    
    if (!isUserPartOfBattle(battle, userFid)) {
      return res.status(400).json({ message: 'User is not part of the battle' });
    }

    if (battle.status === 'ended') {
      return res.status(400).json({ message: 'Battle has already ended' });
    }

    if (bothPlayersMoved(battle)) {
      return res.status(400).json({ message: 'Both players have already moved' });
    }

    updateMove(battle, userFid, move);

    if (bothPlayersMoved(battle)) {
      console.log('performing battle...');
      await performBattle(battle);
    }

    res.status(200).json({ message: 'Move made successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
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