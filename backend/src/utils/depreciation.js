/**
 * Calculate depreciated value of an asset
 * @param {number} currentMarketValue - Current market value
 * @param {number} depreciationRate - Annual depreciation rate (0-1)
 * @param {number} yearsOld - Asset age in years
 * @returns {number} Depreciated value
 */
function calculateDepreciatedValue(currentMarketValue, depreciationRate, yearsOld) {
  // Apply exponential depreciation: value * (1 - rate)^years
  const depreciatedValue = currentMarketValue * Math.pow(1 - depreciationRate, yearsOld);

  // Set floor at 20% of current market value
  const minValue = currentMarketValue * 0.2;

  return Math.max(depreciatedValue, minValue);
}

/**
 * Apply condition adjustment to value
 * @param {number} value - Asset value
 * @param {number} conditionScore - Condition score (0-1)
 * @returns {number} Condition-adjusted value
 */
function applyConditionAdjustment(value, conditionScore) {
  return value * conditionScore;
}

/**
 * Calculate total adjusted value
 * @param {Object} asset - Asset from database
 * @param {number} yearsOld - Asset age
 * @param {number} conditionScore - Condition score
 * @returns {Object} Valuation breakdown
 */
function calculateAdjustedValue(asset, yearsOld, conditionScore) {
  const depreciatedValue = calculateDepreciatedValue(
    asset.currentMarketValue,
    asset.depreciationRate,
    yearsOld
  );

  const conditionAdjustedValue = applyConditionAdjustment(
    depreciatedValue,
    conditionScore
  );

  return {
    originalPrice: asset.originalPrice,
    currentMarketValue: asset.currentMarketValue,
    depreciatedValue: Math.round(depreciatedValue),
    conditionAdjustedValue: Math.round(conditionAdjustedValue),
    currency: asset.currency
  };
}

module.exports = {
  calculateDepreciatedValue,
  applyConditionAdjustment,
  calculateAdjustedValue
};
