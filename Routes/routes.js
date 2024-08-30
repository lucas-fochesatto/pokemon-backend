import express from 'express';
import { assignPokemon, createBattle, getBattleById, getPokemonById, joinBattle, pokemonsByPlayerId, sendTransaction } from '../Controllers/backController.js';

const router = express.Router();

router.post('/create-battle', createBattle);
router.post('/assign-pokemon', assignPokemon);
router.post('/join-battle', joinBattle)
router.get('/battle/:id', getBattleById);
router.get('/user/:id/pokemons', pokemonsByPlayerId)
router.get('/send', sendTransaction);
router.get('/pokemon/:id', getPokemonById);

export default router;