import db from "../database.js";
import Battle from "../Models/Battle.js";
import pokemons from "../utils/pokemons.js";
import { localSigner, provider } from "../ethers.js";
import { ethers } from "ethers";
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
  // this should verify if user has paid the fee
  // call the inputBox smart contract function
  // with our mnemonic and then generate a random number
  // from 1 to 25 and assign the pokemon to the user

  const { hash, senderId } = req.body;

  // verify if hash has already been used
  db.get('SELECT * FROM hashes WHERE hash = ?', [hash], (err, row) => {
    if (err) {
      throw err;
    }
    if (row) {
      res.status(400).json({ message: 'Hash already used' });
      return
    }
  });

  console.log("Hash not used yet");

  /* const transaction = await provider.getTransaction(hash);

  const senderWallet = transaction.from;

  if(transaction.to.toLowerCase() !== process.env.RECEIVER_ADDRESS.toLowerCase()) {
    res.status(400).json({ message: 'Invalid transaction' });
    return
  } */

  const connectedLocalSigner = localSigner.connect(provider);
  const senderWallet = connectedLocalSigner.address;

  // use the signer to call the inputBox smart contract
  // signed by us :)
  const inputBoxContract = new ethers.Contract(process.env.INPUTBOX_ADDRESS || '0x59b22D57D4f067708AB0c00552767405926dc768', INPUTBOX_ABI, connectedLocalSigner);
  console.log('Connected to inputBox contract');

  const tx = await inputBoxContract.addInput(process.env.DAPP_ADDRESS || '0xab7528bb862fb57e8a2bcd567a2e929a0be56a5e', ethers.utils.toUtf8Bytes(JSON.stringify({ senderId, senderWallet, action: 'mint-pokemon' })));

  const receipt = await tx.wait();

  const insert = db.prepare('INSERT INTO hashes (hash) VALUES (?)');
  insert.run(hash);
  insert.finalize();

  res.status(200).json({ message: 'Pokemon assigned successfully', receipt });
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

    const newBattle = new Battle(null, maker, null, maker_pokemons, null, null, null, null, null, 'waiting', null);

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
    const { battleId, opponent, opponent_pokemons } = req.body;

    let opponentPokemonsHP = [];
    const opponentPokemonsJSON = JSON.parse(opponent_pokemons);

    opponentPokemonsJSON.map(pokemon => {
      opponentPokemonsHP.push(pokemons[pokemon-1].hp);
    });

    db.run('UPDATE battles SET taker = ?, taker_pokemons = ?, taker_hp = ?, status = ? WHERE id = ?', [opponent, opponent_pokemons, JSON.stringify(opponentPokemonsHP), 'ongoing', battleId], (err) => {
      if (err) {
        throw err;
      }

      res.status(200).json({ message: 'Battle joined successfully' });
    });
  } catch (error) {
    console.log(error);
  }
}

export const makeMove = async (req, res) => {
  try {
    const { battleId, userFid, move } = req.body;

    db.get('SELECT * FROM battles WHERE id = ?', [battleId], async (err, row) => {
      if (err) {
        throw err;
      }

      const battle = new Battle(row.id, row.maker, row.taker, row.maker_pokemons, row.maker_active_mon, row.taker_pokemons, row.taker_active_mon, row.maker_move, row.taker_move, row.status, row.battle_log);

      //check if the user is the maker or the taker
      if (battle.maker !== userFid && battle.taker !== userFid) {
        res.status(400).json({ message: 'User is not part of the battle' });
        return;
      }

      if (battle.status === 'ended') {
        res.status(400).json({ message: 'Battle has already ended' });
        return;
      }


      
      if (battle.maker_move && battle.taker_move) {
        res.status(400).json({ message: 'Both players have already moved' });
        return;
      }

      if (battle.maker === req.body.senderId) {
        battle.maker_move = makerMove;
      } else {
        battle.taker_move = takerMove;
      }

      if (battle.maker_move && battle.taker_move) {
        await performBattle(battle);
      }

      res.status(200).json({ message: 'Move made successfully' });
    });

  } catch (error) {
    console.log(error); 
  }
}

async function performBattle(battle) {
  try {
    const { maker_pokemons, maker_active_mon, taker_pokemons, taker_active_mon } = battle;

    const makerPokemons = JSON.parse(maker_pokemons);
    const takerPokemons = JSON.parse(taker_pokemons);

    const makerPokemon = makerPokemons[maker_active_mon];
    const takerPokemon = takerPokemons[taker_active_mon];

    // Select the first move based on speed or random chance
    const { firstAttacker, firstMove, secondAttacker, secondMove } = determineMoveOrder(makerPokemon, takerPokemon);

    // Battle log initialization
    battle.battle_log = battle.battle_log || [];

    // First attacker deals damage
    const firstDamage = calculateDamage(firstAttacker, firstMove, secondAttacker);
    secondAttacker.hp -= firstDamage;

    battle.battle_log.push(createBattleLog(firstAttacker, firstMove, secondAttacker, firstDamage));

    // Check if the second attacker can retaliate
    let secondAttackerCanAttack = secondAttacker.hp > 0;

    if (!secondAttackerCanAttack) {
      battle.battle_log.push({ message: `${secondAttacker.name} fainted!` });
    }

    // If second attacker is still alive, it attacks
    if (secondAttackerCanAttack) {
      const secondDamage = calculateDamage(secondAttacker, secondMove, firstAttacker);
      firstAttacker.hp -= secondDamage;

      battle.battle_log.push(createBattleLog(secondAttacker, secondMove, firstAttacker, secondDamage));

      if (firstAttacker.hp <= 0) {
        battle.battle_log.push({ message: `${firstAttacker.name} fainted!` });
      }
    }

    // Determine the outcome of the battle
    determineBattleOutcome(battle, makerPokemon, takerPokemon);

    // Update the battle in the database
    await updateBattleInDatabase(battle, makerPokemons, takerPokemons);
  } catch (error) {
    console.error('Error performing battle:', error.message);
  }
}

// Determine the order of moves based on speed or random chance
function determineMoveOrder(makerPokemon, takerPokemon) {
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
    if (Math.random() < 0.5) {
      return {
        firstAttacker: makerPokemon,
        firstMove: makerPokemon.moves[0],
        secondAttacker: takerPokemon,
        secondMove: takerPokemon.moves[0]
      };
    } else {
      return {
        firstAttacker: takerPokemon,
        firstMove: takerPokemon.moves[0],
        secondAttacker: makerPokemon,
        secondMove: makerPokemon.moves[0]
      };
    }
  }
}

// Create a battle log entry
function createBattleLog(attacker, move, defender, damage) {
  return {
    move: move.name,
    attacker: attacker.name,
    damage,
    defender: defender.name,
    remainingHP: defender.hp
  };
}

// Determine the outcome of the battle
function determineBattleOutcome(battle, makerPokemon, takerPokemon) {
  if (makerPokemon.hp <= 0 && takerPokemon.hp <= 0) {
    battle.battle_log.push({ message: 'It\'s a tie!' }); //just for test purposes
    battle.status = 'ended';
  } else if (makerPokemon.hp <= 0) {
    battle.battle_log.push({ message: 'Taker wins!' });
    battle.status = 'ended';
  } else if (takerPokemon.hp <= 0) {
    battle.battle_log.push({ message: 'Maker wins!' });
    battle.status = 'ended';
  }
}

// Update the battle in the database
async function updateBattleInDatabase(battle, makerPokemons, takerPokemons) {
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


export const getPokemonById = async (req, res) => {
  const { id } = req.params;

  const pokemon = pokemons[id-1];

  res.status(200).json(pokemon);
}

export const getPokemonImage = async (req, res) => {
  const { id } = req.params;

  console.log('received id', id);

  const pokemon = pokemons[id-1];

  res.status(200).json({ image: pokemon.image });
}