// src/routes/helloRoutes.js

const express = require('express');
const helloController = require('../controllers/helloController');

const router = express.Router();

// Define hello route
router.get('/hello', helloController.sayHello);

module.exports = router;
