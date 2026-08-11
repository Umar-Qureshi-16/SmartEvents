const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');

router.get('/match', vendorController.matchServices);

module.exports = router;
