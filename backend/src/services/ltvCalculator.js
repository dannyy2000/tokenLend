const { getAgeMultiplier } = require('../utils/dateUtils');

/**
 * Calculate LTV (Loan-to-Value) ratio for an asset
 * This is the SIMPLIFIED version without borrower credit scoring
 *
 * @param {Object} asset - Asset from database
 * @param {number} conditionScore - Condition score from GPT (0.5-1.0)
 * @param {number} ageInYears - Asset age in years
 * @returns {Object} LTV calculation breakdown
 */
function calculateLTV(asset, conditionScore, ageInYears) {
  // 1. Base LTV by asset type (liquidity-based)
  const baseLTVMap = {
    smartphone: 0.70,  // 70% - high liquidity, easy to resell
    laptop: 0.60,      // 60% - medium liquidity
    car: 0.75,         // 75% - established market, high demand
    machinery: 0.50,   // 50% - low liquidity, niche market
    inventory: 0.55    // 55% - depends on product type
  };

  const baseLTV = baseLTVMap[asset.type] || 0.50; // Default to 50% if type not found

  // 2. Condition adjustment (from GPT assessment)
  const conditionMultiplier = conditionScore; // 0.5 - 1.0

  // 3. Age adjustment (newer assets = less depreciation risk)
  const ageMultiplier = getAgeMultiplier(ageInYears);

  // 4. Liquidity adjustment (market demand)
  const liquidityMultiplierMap = {
    high: 1.0,
    medium: 0.9,
    low: 0.8
  };
  const liquidityMultiplier = liquidityMultiplierMap[asset.liquidity] || 0.8;

  // 5. Final LTV calculation
  const finalLTV = baseLTV * conditionMultiplier * ageMultiplier * liquidityMultiplier;

  // 6. Convert to basis points for smart contract (7000 = 70%)
  const ltvBasisPoints = Math.floor(finalLTV * 10000);

  // Return detailed breakdown
  return {
    baseLTV: baseLTV,
    baseLTVPercent: `${(baseLTV * 100).toFixed(2)}%`,
    conditionMultiplier: conditionMultiplier,
    conditionPercent: `${(conditionMultiplier * 100).toFixed(2)}%`,
    ageMultiplier: ageMultiplier,
    agePercent: `${(ageMultiplier * 100).toFixed(2)}%`,
    liquidityMultiplier: liquidityMultiplier,
    liquidityPercent: `${(liquidityMultiplier * 100).toFixed(2)}%`,
    finalLTV: finalLTV,
    finalLTVPercent: `${(finalLTV * 100).toFixed(2)}%`,
    ltvBasisPoints: ltvBasisPoints
  };
}

/**
 * Calculate maximum loan amount based on value and LTV
 * @param {number} assetValue - Adjusted asset value
 * @param {number} finalLTV - Final LTV ratio (0-1)
 * @returns {number} Maximum loan amount
 */
function calculateMaxLoanAmount(assetValue, finalLTV) {
  return Math.floor(assetValue * finalLTV);
}

/**
 * Get recommended loan terms based on asset and LTV
 * @param {Object} asset - Asset from database
 * @param {number} ltvRatio - Final LTV ratio
 * @returns {Object} Recommended loan terms
 */
function getRecommendedTerms(asset, ltvRatio) {
  // Recommended duration based on asset type
  const durationMap = {
    smartphone: 30,   // 30 days
    laptop: 60,       // 60 days
    car: 180,         // 180 days (6 months)
    machinery: 365,   // 365 days (1 year)
    inventory: 90     // 90 days
  };

  // Recommended interest rate based on risk (LTV)
  // Lower LTV = lower risk = lower interest rate
  let interestRate;
  if (ltvRatio < 0.4) {
    interestRate = 800;   // 8% for low LTV (low risk)
  } else if (ltvRatio < 0.6) {
    interestRate = 1000;  // 10% for medium LTV
  } else {
    interestRate = 1200;  // 12% for high LTV (higher risk)
  }

  return {
    recommendedDuration: durationMap[asset.type] || 30,
    recommendedInterestRate: interestRate,
    interestRatePercent: `${interestRate / 100}%`
  };
}

module.exports = {
  calculateLTV,
  calculateMaxLoanAmount,
  getRecommendedTerms
};
