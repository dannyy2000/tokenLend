const express = require('express');
const router = express.Router();
const valuationController = require('../controllers/valuationController');
const rateLimiter = require('../middleware/rateLimiter');

// Apply rate limiting to valuation endpoints
router.use(rateLimiter);

/**
 * POST /api/valuations
 * Create a new asset valuation
 */
router.post('/', valuationController.createValuation);

/**
 * GET /api/valuations/:valuationId
 * Get a specific valuation by ID
 */
router.get('/:valuationId', valuationController.getValuation);

/**
 * GET /api/valuations/user/:userId
 * Get all valuations for a specific user
 */
router.get('/user/:userId', valuationController.getUserValuations);

module.exports = router;
