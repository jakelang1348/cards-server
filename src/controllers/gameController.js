// src/controllers/gameController.js

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Load cards from JSON file
const cardsPath = path.join(__dirname, '../../data/offical-cards.json');
const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));

// Helper function to shuffle an array
const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Helper function to save game state to a file
const saveGameState = (gameId, gameState) => {
  const gameStatePath = path.join(__dirname, `../../data/${gameId}.json`);
  fs.writeFileSync(gameStatePath, JSON.stringify(gameState, null, 2));
};

// Method to start a game
exports.startGame = (req, res) => {
  const { players } = req.body;

  if (!Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: 'Players array is required and cannot be empty' });
  }

  const gameId = uuidv4();

  // Combine all white cards from different packs
  let deck = [];
  cards.forEach(pack => {
    deck = deck.concat(pack.white);
  });

  // Combine all black cards from different packs
  let blackCardDeck = [];
  cards.forEach(pack => {
    blackCardDeck = blackCardDeck.concat(pack.black);
  });

  // Shuffle the decks
  deck = shuffle(deck);
  blackCardDeck = shuffle(blackCardDeck);

  // Draw the first black card
  const currentBlackCard = blackCardDeck.pop();

  // Initialize player hands
  const playerHands = players.map(player => {
    return {
      player,
      hand: deck.splice(0, 7), // Deal 7 cards to each player
      winningPile: []
    };
  });

  // Initialize game state
  const gameState = {
    gameId,
    deck,
    players: playerHands,
    roundPool: [],
    blackCardDeck,
    currentBlackCard
  };

  // Save the initial game state
  saveGameState(gameId, gameState);

  res.status(200).json(gameState);
};

// Method to add a player
exports.addPlayer = (req, res) => {
  const { gameId, player, deck, players, blackCardDeck, currentBlackCard, roundPool } = req.body;

  if (!gameId || !player || !Array.isArray(deck) || !Array.isArray(players) || !Array.isArray(blackCardDeck) || !currentBlackCard || !Array.isArray(roundPool)) {
    return res.status(400).json({ error: 'Game ID, player, deck, players array, black card deck, current black card, and round pool are required' });
  }

  // Shuffle the deck if not already shuffled
  if (deck.length > 0) {
    shuffle(deck);
  }

  // Deal 7 cards to the new player
  const newPlayerHand = deck.splice(0, 7);

  // Add the new player to the players array
  players.push({
    player,
    hand: newPlayerHand,
    winningPile: []
  });

  // Update the game state and save it
  const gameState = { gameId, deck, players, roundPool, blackCardDeck, currentBlackCard };
  saveGameState(gameId, gameState);

  res.status(200).json(gameState);
};

// Method to play a card
exports.playCard = (req, res) => {
  const { gameId, player, card, roundPool, players, deck, blackCardDeck, currentBlackCard } = req.body;

  if (!gameId || !player || !card || !Array.isArray(roundPool) || !Array.isArray(players) || !Array.isArray(deck) || !Array.isArray(blackCardDeck) || !currentBlackCard) {
    return res.status(400).json({ error: 'Game ID, player, card, roundPool, players array, deck, black card deck, and current black card are required' });
  }

  const playerObj = players.find(p => p.player === player);
  if (!playerObj) {
    return res.status(400).json({ error: 'Player not found' });
  }

  const cardIndex = playerObj.hand.findIndex(c => c.text === card.text && c.pack === card.pack);
  if (cardIndex === -1) {
    return res.status(400).json({ error: 'Card not found in player hand' });
  }

  // Remove card from player's hand and add to round pool
  playerObj.hand.splice(cardIndex, 1);
  roundPool.push({ player, card });

  // Update the game state and save it
  const gameState = { gameId, deck, players, roundPool, blackCardDeck, currentBlackCard };
  saveGameState(gameId, gameState);

  res.status(200).json(gameState);
};

// Method to judge a round
exports.judgeRound = (req, res) => {
  const { gameId, winningCard, roundPool, players, deck, blackCardDeck, currentBlackCard } = req.body;

  if (!gameId || !winningCard || !Array.isArray(roundPool) || !Array.isArray(players) || !Array.isArray(deck) || !Array.isArray(blackCardDeck) || !currentBlackCard) {
    return res.status(400).json({ error: 'Game ID, winning card, roundPool, players array, deck, black card deck, and current black card are required' });
  }

  // Ensure all players have played a card
  if (roundPool.length !== players.length) {
    return res.status(400).json({ error: 'Not all players have played a card' });
  }

  // Ensure the winning card is in the round pool
  const roundCard = roundPool.find(rc => rc.card.text === winningCard.text && rc.card.pack === winningCard.pack);
  if (!roundCard) {
    return res.status(400).json({ error: 'Winning card not found in round pool' });
  }

  // Find the player who played the winning card and add it to their winning pile
  const winningPlayer = players.find(p => p.player === roundCard.player);
  if (!winningPlayer) {
    return res.status(400).json({ error: 'Winning player not found' });
  }

  winningPlayer.winningPile.push(winningCard);

  // Clear the round pool and remove all played cards from players' hands
  roundPool.forEach(rc => {
    const player = players.find(p => p.player === rc.player);
    const cardIndex = player.hand.findIndex(c => c.text === rc.card.text && c.pack === rc.card.pack);
    if (cardIndex !== -1) {
      player.hand.splice(cardIndex, 1);
    }
  });

  // Clear the round pool
  roundPool.length = 0;

  // Draw a new black card
  const newBlackCard = blackCardDeck.pop();

  // Update the game state and save it
  const gameState = { gameId, deck, players, roundPool, blackCardDeck, currentBlackCard: newBlackCard };
  saveGameState(gameId, gameState);

  res.status(200).json(gameState);
};

// Method to get the game state
exports.getGameState = (req, res) => {
  const { gameId } = req.params;

  if (!gameId) {
    return res.status(400).json({ error: 'Game ID is required' });
  }

  const gameStatePath = path.join(__dirname, `../../data/${gameId}.json`);
  if (!fs.existsSync(gameStatePath)) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const gameState = JSON.parse(fs.readFileSync(gameStatePath, 'utf8'));
  res.status(200).json(gameState);
};
