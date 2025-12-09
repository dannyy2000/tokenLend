const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');

/**
 * GET /api/assets
 * Get all supported assets from price database
 */
router.get('/', assetController.getAllAssets);

/**
 * GET /api/assets/:assetId
 * Get specific asset details
 */
router.get('/:assetId', assetController.getAssetById);

/**
 * GET /api/assets/search
 * Search assets by brand, model, or type
 */
router.get('/search', assetController.searchAssets);

module.exports = router;
