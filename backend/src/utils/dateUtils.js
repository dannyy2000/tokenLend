/**
 * Calculate asset age in years from purchase date
 * @param {string} purchaseDate - Date string in format YYYY-MM-DD
 * @returns {number} Age in years
 */
function calculateAge(purchaseDate) {
  const now = Date.now();
  const purchase = new Date(purchaseDate).getTime();
  const ageInYears = (now - purchase) / (365 * 24 * 60 * 60 * 1000);
  return ageInYears;
}

/**
 * Get age multiplier for LTV calculation
 * @param {number} age - Asset age in years
 * @returns {number} Age multiplier
 */
function getAgeMultiplier(age) {
  if (age < 1) return 1.0;      // <1 year: no penalty
  if (age < 2) return 0.95;     // 1-2 years: 5% reduction
  if (age < 3) return 0.90;     // 2-3 years: 10% reduction
  return 0.85;                  // 3+ years: 15% reduction
}

/**
 * Format date to ISO string
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return new Date(date).toISOString();
}

/**
 * Add hours to a date
 * @param {Date} date
 * @param {number} hours
 * @returns {Date}
 */
function addHours(date, hours) {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

module.exports = {
  calculateAge,
  getAgeMultiplier,
  formatDate,
  addHours
};
