const pricingService = require('../services/pricingService');

/**
 * Get all supported assets
 * GET /api/assets
 */
async function getAllAssets(req, res) {
  try {
    const { type } = req.query;

    const assets = pricingService.getAllAssets(type);

    res.status(200).json({
      success: true,
      count: assets.length,
      assetTypes: pricingService.getAssetTypes(),
      assets
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get assets',
      error: error.message
    });
  }
}

/**
 * Get specific asset by ID
 * GET /api/assets/:assetId
 */
async function getAssetById(req, res) {
  try {
    const { assetId } = req.params;

    const asset = pricingService.findAssetById(assetId);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: `Asset not found: ${assetId}`
      });
    }

    res.status(200).json({
      success: true,
      asset
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get asset',
      error: error.message
    });
  }
}

/**
 * Search assets by query
 * GET /api/assets/search?q=iphone
 */
async function searchAssets(req, res) {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query required (q parameter)'
      });
    }

    const assets = pricingService.searchAssets(q);

    res.status(200).json({
      success: true,
      query: q,
      count: assets.length,
      assets
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search assets',
      error: error.message
    });
  }
}

module.exports = {
  getAllAssets,
  getAssetById,
  searchAssets
};
