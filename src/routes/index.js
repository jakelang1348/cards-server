
const express = require('express');
const helloRoutes = require('./helloRoutes');
const gameRoutes = require('./gameRoutes');

const router = express.Router();

// Use hello routes
router.use('/', helloRoutes);

// Use game routes
router.use('/game', gameRoutes);

module.exports = router;