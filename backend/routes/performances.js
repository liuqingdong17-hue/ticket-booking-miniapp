// routes/performance.js
const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performance');

router.get('/recommend', performanceController.getRecommendedPerformances);
router.post('/updatePopularity', performanceController.updatePopularity);

module.exports = router;