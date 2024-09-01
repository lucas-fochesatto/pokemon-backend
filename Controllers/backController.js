import db from "../database.js";
import Battle from "../Models/Battle.js";
import pokemons from "../utils/pokemons.js";
import { localSigner, provider } from "../ethers.js";
import { BigNumber, ethers } from "ethers";
import { INPUTBOX_ABI } from "../utils/inputBoxAbi.js";

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

    let makerPokemonsHP = [];
    const makerPokemonsJSON = JSON.parse(maker_pokemons);

    makerPokemonsJSON.map(pokemon => {
      makerPokemonsHP.push(pokemons[pokemon-1].hp);
    });

    const newBattle = new Battle(null, maker, null, maker_pokemons, null, JSON.stringify(makerPokemonsHP), null, 'waiting');

    const insert = db.prepare('INSERT INTO battles (maker, maker_pokemons, maker_hp, status) VALUES (?, ?, ?, ?)');
    
    // Executa a inserção e obtém o ID do registro recém inserido
    insert.run(newBattle.maker, newBattle.maker_pokemons, newBattle.maker_hp, newBattle.status, function(err) {
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

    console.log('Receieved taker', req.body);

    let opponentPokemonsHP = [];
    const opponentPokemonsJSON = JSON.parse(taker_pokemons);

    opponentPokemonsJSON.map(pokemon => {
      opponentPokemonsHP.push(pokemons[pokemon-1].hp);
    });

    db.run('UPDATE battles SET taker = ?, taker_pokemons = ?, taker_hp = ?, status = ? WHERE id = ?', [taker, taker_pokemons, JSON.stringify(opponentPokemonsHP), 'ongoing', battleId], (err) => {
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