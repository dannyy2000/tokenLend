const gptService = require('../services/gptService');
const pricingService = require('../services/pricingService');
const ltvCalculator = require('../services/ltvCalculator');
const { calculateAge } = require('../utils/dateUtils');
const { calculateAdjustedValue } = require('../utils/depreciation');
const Valuation = require('../models/Valuation');
const User = require('../models/User');
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
      images  // Array of image URLs
    } = req.body;

    // Use authenticated user ID if available, otherwise null
    const userId = req.userId || req.body.userId || null;

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

    // Use fallback if GPT API fails (for testing without valid API key)
    let aiAssessment;
    if (!gptResult.success) {
      console.log('⚠️  GPT API failed, using fallback mode for testing');
      console.log('   Error:', gptResult.error);
      aiAssessment = gptResult.fallback;
    } else {
      aiAssessment = gptResult.assessment;
    }
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

    // Save to database
    try {
      const valuationDoc = new Valuation({
        valuationId,
        userId: userId || null, // Optional - can be used without auth for testing
        input: {
          assetType,
          brand,
          model,
          variant,
          purchaseDate: new Date(purchaseDate),
          serialNumber,
          images,
          userCondition: req.body.condition
        },
        aiAssessment: {
          detectedModel: aiAssessment.detectedModel,
          detectedBrand: aiAssessment.detectedBrand,
          matchConfidence: aiAssessment.confidence,
          conditionScore: aiAssessment.conditionScore,
          physicalCondition: aiAssessment.physicalCondition,
          damageNotes: aiAssessment.damageNotes || [],
          redFlags: aiAssessment.redFlags || [],
          isStockPhoto: aiAssessment.isStockPhoto || false,
          gptConfidence: aiAssessment.confidence
        },
        valuation: {
          originalPrice: valuation.originalPrice,
          currentMarketValue: valuation.currentMarketValue,
          depreciatedValue: valuation.depreciatedValue,
          conditionAdjustedValue: valuation.conditionAdjustedValue,
          currency: valuation.currency
        },
        ltvCalculation: {
          baseLTV: ltvResult.baseLTV,
          conditionMultiplier: aiAssessment.conditionScore,
          ageMultiplier: ltvResult.ageMultiplier,
          liquidityMultiplier: ltvResult.liquidityMultiplier,
          finalLTV: ltvResult.finalLTV,
          maxLoanAmount: maxLoanAmount
        },
        loanTerms: {
          maxLTV: ltvResult.ltvBasisPoints,
          maxLoanAmount: maxLoanAmount,
          recommendedDuration: recommendedTerms.recommendedDuration,
          recommendedRate: recommendedTerms.recommendedInterestRate
        },
        riskAssessment: {
          assetLiquidity: asset.liquidity,
          marketDemand: asset.marketDemand,
          overallRisk: ltvResult.finalLTV < 0.4 ? 'low' : ltvResult.finalLTV < 0.6 ? 'medium' : 'high'
        },
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      await valuationDoc.save();
      console.log('💾 Valuation saved to database');

      // Increment user valuation count if userId provided
      if (userId) {
        try {
          await User.findByIdAndUpdate(userId, {
            $inc: { 'stats.totalValuations': 1 }
          });
        } catch (err) {
          console.log('⚠️  Could not update user stats:', err.message);
        }
      }
    } catch (dbError) {
      console.error('⚠️  Database save failed:', dbError.message);
      // Don't fail the request if database save fails - return the valuation anyway
    }

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

    // Fetch from database
    const valuation = await Valuation.findOne({ valuationId });

    if (!valuation) {
      return res.status(404).json({
        success: false,
        message: 'Valuation not found'
      });
    }

    // Check if valuation is expired and update status
    if (valuation.isExpired() && valuation.status === 'pending') {
      valuation.status = 'expired';
      await valuation.save();
    }

    res.status(200).json({
      success: true,
      data: {
        valuation: {
          valuationId: valuation.valuationId,
          userId: valuation.userId,
          asset: {
            type: valuation.input.assetType,
            brand: valuation.input.brand,
            model: valuation.input.model,
            variant: valuation.input.variant,
            detectedModel: valuation.aiAssessment.detectedModel,
            confirmedMatch: valuation.aiAssessment.detectedModel === valuation.input.model
          },
          valuation: valuation.valuation,
          condition: {
            rating: valuation.aiAssessment.physicalCondition,
            score: valuation.aiAssessment.conditionScore,
            notes: valuation.aiAssessment.damageNotes,
            confidence: valuation.aiAssessment.gptConfidence,
            redFlags: valuation.aiAssessment.redFlags
          },
          loanTerms: {
            maxLTV: valuation.loanTerms.maxLTV,
            maxLTVPercent: `${(valuation.loanTerms.maxLTV / 100).toFixed(2)}%`,
            maxLoanAmount: valuation.loanTerms.maxLoanAmount,
            recommendedDuration: valuation.loanTerms.recommendedDuration,
            recommendedRate: valuation.loanTerms.recommendedRate
          },
          riskBreakdown: {
            baseLTV: `${(valuation.ltvCalculation.baseLTV * 100).toFixed(2)}%`,
            conditionAdjustment: `${(valuation.ltvCalculation.conditionMultiplier * 100).toFixed(2)}%`,
            ageAdjustment: `${(valuation.ltvCalculation.ageMultiplier * 100).toFixed(2)}%`,
            liquidityAdjustment: `${(valuation.ltvCalculation.liquidityMultiplier * 100).toFixed(2)}%`,
            finalLTV: `${(valuation.ltvCalculation.finalLTV * 100).toFixed(2)}%`
          },
          riskAssessment: valuation.riskAssessment,
          status: valuation.status,
          usedForLoan: valuation.usedForLoan,
          loanId: valuation.loanId,
          assetTokenId: valuation.assetTokenId,
          isValid: valuation.isValid,
          createdAt: valuation.createdAt,
          expiresAt: valuation.expiresAt
        }
      }
    });

  } catch (error) {
    console.error('Get valuation error:', error);
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
    const { status, limit = 50, page = 1 } = req.query;

    // Build query
    const query = { userId };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch valuations from database
    const valuations = await Valuation.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const totalCount = await Valuation.countDocuments(query);

    // Auto-expire old valuations
    await Valuation.expireOldValuations();

    // Format response
    const formattedValuations = valuations.map(v => ({
      valuationId: v.valuationId,
      asset: {
        type: v.input.assetType,
        brand: v.input.brand,
        model: v.input.model,
        variant: v.input.variant,
        images: v.input.images
      },
      valuation: {
        currentMarketValue: v.valuation.currentMarketValue,
        conditionAdjustedValue: v.valuation.conditionAdjustedValue,
        currency: v.valuation.currency
      },
      condition: {
        rating: v.aiAssessment.physicalCondition,
        score: v.aiAssessment.conditionScore
      },
      loanTerms: {
        maxLTV: v.loanTerms.maxLTV,
        maxLTVPercent: `${(v.loanTerms.maxLTV / 100).toFixed(2)}%`,
        maxLoanAmount: v.loanTerms.maxLoanAmount
      },
      status: v.status,
      usedForLoan: v.usedForLoan,
      loanId: v.loanId,
      assetTokenId: v.assetTokenId,
      isValid: v.isValid,
      createdAt: v.createdAt,
      expiresAt: v.expiresAt
    }));

    res.status(200).json({
      success: true,
      data: {
        valuations: formattedValuations,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalCount / parseInt(limit))
        },
        summary: {
          total: totalCount,
          pending: await Valuation.countDocuments({ userId, status: 'pending' }),
          used: await Valuation.countDocuments({ userId, status: 'used_for_loan' }),
          expired: await Valuation.countDocuments({ userId, status: 'expired' })
        }
      }
    });

  } catch (error) {
    console.error('Get user valuations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user valuations',
      error: error.message
    });
  }
}

/**
 * Get all valuations for the authenticated user
 * GET /api/valuations/me
 */
async function getMyValuations(req, res) {
  try {
    // req.userId is set by authenticate middleware
    const userId = req.userId;
    const { status, limit = 50, page = 1 } = req.query;

    // Build query
    const query = { userId };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch valuations from database
    const valuations = await Valuation.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const totalCount = await Valuation.countDocuments(query);

    // Auto-expire old valuations
    await Valuation.expireOldValuations();

    // Format response
    const formattedValuations = valuations.map(v => ({
      valuationId: v.valuationId,
      asset: {
        type: v.input.assetType,
        brand: v.input.brand,
        model: v.input.model,
        variant: v.input.variant,
        images: v.input.images
      },
      valuation: {
        currentMarketValue: v.valuation.currentMarketValue,
        conditionAdjustedValue: v.valuation.conditionAdjustedValue,
        currency: v.valuation.currency
      },
      condition: {
        rating: v.aiAssessment.physicalCondition,
        score: v.aiAssessment.conditionScore
      },
      loanTerms: {
        maxLTV: v.loanTerms.maxLTV,
        maxLTVPercent: `${(v.loanTerms.maxLTV / 100).toFixed(2)}%`,
        maxLoanAmount: v.loanTerms.maxLoanAmount
      },
      status: v.status,
      usedForLoan: v.usedForLoan,
      loanId: v.loanId,
      assetTokenId: v.assetTokenId,
      isValid: v.isValid,
      createdAt: v.createdAt,
      expiresAt: v.expiresAt
    }));

    res.status(200).json({
      success: true,
      data: {
        valuations: formattedValuations,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalCount / parseInt(limit))
        },
        summary: {
          total: totalCount,
          pending: await Valuation.countDocuments({ userId, status: 'pending' }),
          used: await Valuation.countDocuments({ userId, status: 'used_for_loan' }),
          expired: await Valuation.countDocuments({ userId, status: 'expired' })
        }
      }
    });

  } catch (error) {
    console.error('Get my valuations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get your valuations',
      error: error.message
    });
  }
}

module.exports = {
  createValuation,
  getValuation,
  getUserValuations,
  getMyValuations
};
