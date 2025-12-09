const fs = require('fs');
const path = require('path');

// Load asset prices database
const priceDbPath = path.join(__dirname, '../data/assetPrices.json');
let assetPricesDb = null;

/**
 * Load asset prices from JSON file
 * @returns {Object} Asset prices database
 */
function loadPriceDatabase() {
  if (!assetPricesDb) {
    const data = fs.readFileSync(priceDbPath, 'utf8');
    assetPricesDb = JSON.parse(data);
  }
  return assetPricesDb;
}

/**
 * Find asset in database by ID
 * @param {string} assetId - Asset ID
 * @returns {Object|null} Asset object or null
 */
function findAssetById(assetId) {
  const db = loadPriceDatabase();
  return db.assets.find(asset => asset.id === assetId) || null;
}

/**
 * Search for asset by brand, model, and variant
 * @param {string} brand - Asset brand
 * @param {string} model - Asset model
 * @param {string} variant - Asset variant (optional)
 * @returns {Object|null} Best matching asset or null
 */
function findAssetByDetails(brand, model, variant = null) {
  const db = loadPriceDatabase();

  // Normalize strings for comparison
  const normalizeBrand = brand.toLowerCase().trim();
  const normalizeModel = model.toLowerCase().trim();
  const normalizeVariant = variant ? variant.toLowerCase().trim() : null;

  // Find exact match first
  let match = db.assets.find(asset => {
    const brandMatch = asset.brand.toLowerCase() === normalizeBrand;
    const modelMatch = asset.model.toLowerCase().includes(normalizeModel);
    const variantMatch = normalizeVariant ?
      asset.variant.toLowerCase().includes(normalizeVariant) : true;

    return brandMatch && modelMatch && variantMatch;
  });

  // If no exact match, try fuzzy match (just brand and model)
  if (!match) {
    match = db.assets.find(asset => {
      const brandMatch = asset.brand.toLowerCase() === normalizeBrand;
      const modelMatch = asset.model.toLowerCase().includes(normalizeModel);
      return brandMatch && modelMatch;
    });
  }

  return match || null;
}

/**
 * Get all assets from database
 * @param {string} type - Filter by asset type (optional)
 * @returns {Array} Array of assets
 */
function getAllAssets(type = null) {
  const db = loadPriceDatabase();

  if (type) {
    return db.assets.filter(asset => asset.type === type);
  }

  return db.assets;
}

/**
 * Search assets by query string
 * @param {string} query - Search query
 * @returns {Array} Matching assets
 */
function searchAssets(query) {
  const db = loadPriceDatabase();
  const normalizedQuery = query.toLowerCase().trim();

  return db.assets.filter(asset => {
    const brandMatch = asset.brand.toLowerCase().includes(normalizedQuery);
    const modelMatch = asset.model.toLowerCase().includes(normalizedQuery);
    const typeMatch = asset.type.toLowerCase().includes(normalizedQuery);

    return brandMatch || modelMatch || typeMatch;
  });
}

/**
 * Get asset types available in database
 * @returns {Array} Array of unique asset types
 */
function getAssetTypes() {
  const db = loadPriceDatabase();
  const types = [...new Set(db.assets.map(asset => asset.type))];
  return types;
}

/**
 * Reload price database from file (for updates)
 */
function reloadPriceDatabase() {
  assetPricesDb = null;
  return loadPriceDatabase();
}

module.exports = {
  loadPriceDatabase,
  findAssetById,
  findAssetByDetails,
  getAllAssets,
  searchAssets,
  getAssetTypes,
  reloadPriceDatabase
};
