const gptService = require('../services/gptService');
const pricingService = require('../services/pricingService');
const ltvCalculator = require('../services/ltvCalculator');
const { calculateAge } = require('../utils/dateUtils');
const { calculateAdjustedValue } = require('../utils/depreciation');
const crypto = require('crypto');

/**
 * Create a new asset valuation
 * POST /api/valuations
 */
async function createValuation(req, res) {
  try {
    const {
      assetType,
      brand,
      model,
      variant,
      purchaseDate,
      serialNumber,
      images,  // Array of image URLs
      userId
    } = req.body;

    // Validate required fields
    if (!assetType || !brand || !model || !purchaseDate || !images || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: assetType, brand, model, purchaseDate, images'
      });
    }

    console.log(`\n🔍 Starting valuation for ${brand} ${model}...`);

    // Step 1: Find asset in price database
    console.log('📊 Looking up asset in price database...');
    const asset = pricingService.findAssetByDetails(brand, model, variant);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: `Asset not found in database: ${brand} ${model}`,
        suggestion: 'Please check the brand and model, or contact support to add this asset'
      });
    }

    console.log(`✅ Found asset: ${asset.brand} ${asset.model} (${asset.id})`);

    // Step 2: Analyze image with GPT Vision (use first image for now)
    console.log('🤖 Analyzing image with GPT Vision...');
    const gptResult = await gptService.analyzeAssetImage(images[0], {
      assetType,
      brand,
      model,
      purchaseDate
    });

    if (!gptResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to analyze asset image',
        error: gptResult.error
      });
    }

    const aiAssessment = gptResult.assessment;
    console.log(`✅ AI Assessment: ${aiAssessment.physicalCondition} (score: ${aiAssessment.conditionScore})`);

    // Check for red flags
    if (aiAssessment.redFlags && aiAssessment.redFlags.length > 0) {
      console.log(`⚠️  Red flags detected: ${aiAssessment.redFlags.join(', ')}`);
    }

    // Step 3: Calculate asset age and depreciation
    console.log('📅 Calculating depreciation...');
    const ageInYears = calculateAge(purchaseDate);
    const valuation = calculateAdjustedValue(asset, ageInYears, aiAssessment.conditionScore);

    console.log(`   Age: ${ageInYears.toFixed(2)} years`);
    console.log(`   Market Value: ₦${valuation.currentMarketValue.toLocaleString()}`);
    console.log(`   Depreciated: ₦${valuation.depreciatedValue.toLocaleString()}`);
    console.log(`   After Condition: ₦${valuation.conditionAdjustedValue.toLocaleString()}`);

    // Step 4: Calculate LTV
    console.log('💰 Calculating LTV...');
    const ltvResult = ltvCalculator.calculateLTV(asset, aiAssessment.conditionScore, ageInYears);
    const maxLoanAmount = ltvCalculator.calculateMaxLoanAmount(
      valuation.conditionAdjustedValue,
      ltvResult.finalLTV
    );
    const recommendedTerms = ltvCalculator.getRecommendedTerms(asset, ltvResult.finalLTV);

    console.log(`   LTV: ${ltvResult.finalLTVPercent}`);
    console.log(`   Max Loan: ₦${maxLoanAmount.toLocaleString()}`);

    // Step 5: Generate valuation ID and set expiry
    const valuationId = `val_${crypto.randomBytes(8).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Step 6: Construct response
    const response = {
      success: true,
      valuationId,
      asset: {
        detectedModel: aiAssessment.detectedModel,
        confirmedMatch: aiAssessment.matches,
        type: asset.type,
        brand: asset.brand,
        model: asset.model,
        variant: asset.variant
      },
      valuation: {
        ...valuation,
        finalValue: valuation.conditionAdjustedValue
      },
      condition: {
        rating: aiAssessment.physicalCondition,
        score: aiAssessment.conditionScore,
        notes: aiAssessment.damageNotes,
        confidence: aiAssessment.confidence,
        redFlags: aiAssessment.redFlags || []
      },
      loanTerms: {
        maxLTV: ltvResult.ltvBasisPoints,
        maxLTVPercent: ltvResult.finalLTVPercent,
        maxLoanAmount: maxLoanAmount,
        ...recommendedTerms
      },
      riskBreakdown: {
        baseLTV: ltvResult.baseLTVPercent,
        conditionAdjustment: ltvResult.conditionPercent,
        ageAdjustment: ltvResult.agePercent,
        liquidityAdjustment: ltvResult.liquidityPercent,
        finalLTV: ltvResult.finalLTVPercent
      },
      riskAssessment: {
        assetLiquidity: asset.liquidity,
        marketDemand: asset.marketDemand,
        overallRisk: ltvResult.finalLTV < 0.4 ? 'low' : ltvResult.finalLTV < 0.6 ? 'medium' : 'high'
      },
      metadata: {
        timestamp,
        expiresAt,
        validFor: '24 hours',
        assetAge: `${ageInYears.toFixed(2)} years`
      }
    };

    console.log('✅ Valuation completed successfully!\n');

    // TODO: Save to database (MongoDB)
    // const valuation = new Valuation({ valuationId, userId, ...data });
    // await valuation.save();

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Valuation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create valuation',
      error: error.message
    });
  }
}

/**
 * Get a specific valuation by ID
 * GET /api/valuations/:valuationId
 */
async function getValuation(req, res) {
  try {
    const { valuationId } = req.params;

    // TODO: Fetch from database
    // const valuation = await Valuation.findOne({ valuationId });

    res.status(501).json({
      success: false,
      message: 'Get valuation endpoint not yet implemented',
      note: 'Database integration pending'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get valuation',
      error: error.message
    });
  }
}

/**
 * Get all valuations for a user
 * GET /api/valuations/user/:userId
 */
async function getUserValuations(req, res) {
  try {
    const { userId } = req.params;

    // TODO: Fetch from database
    // const valuations = await Valuation.find({ userId });

    res.status(501).json({
      success: false,
      message: 'Get user valuations endpoint not yet implemented',
      note: 'Database integration pending'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user valuations',
      error: error.message
    });
  }
}

module.exports = {
  createValuation,
  getValuation,
  getUserValuations
};
