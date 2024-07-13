// src/routes/gameRoutes.js

const express = require('express');
const gameController = require('../controllers/gameController');

const router = express.Router();

// Define game routes
router.post('/start-game', gameController.startGame);
router.post('/add-player', gameController.addPlayer);
router.post('/play-card', gameController.playCard);
router.post('/judge-round', gameController.judgeRound);
router.get('/state/:gameId', gameController.getGameState);

module.exports = router;
