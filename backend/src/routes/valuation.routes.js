const express = require('express');
const router = express.Router();
const valuationController = require('../controllers/valuationController');
const rateLimiter = require('../middleware/rateLimiter');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Apply rate limiting to valuation endpoints
router.use(rateLimiter);

/**
 * POST /api/valuations
 * Create a new asset valuation
 * Optional auth - works without login but better with it
 */
router.post('/', optionalAuth, valuationController.createValuation);

/**
 * GET /api/valuations/me
 * Get all valuations for the authenticated user
 * Requires authentication
 */
router.get('/me', authenticate, valuationController.getMyValuations);

/**
 * GET /api/valuations/:valuationId
 * Get a specific valuation by ID
 * Public endpoint
 */
router.get('/:valuationId', valuationController.getValuation);

/**
 * GET /api/valuations/user/:userId (Admin only - optional future feature)
 * Get all valuations for a specific user
 */
router.get('/user/:userId', authenticate, valuationController.getUserValuations);

module.exports = router;
