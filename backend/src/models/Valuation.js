const mongoose = require('mongoose');

const ValuationSchema = new mongoose.Schema({
  valuationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional - allows testing without authentication
    index: true
  },

  // Input Data
  input: {
    assetType: {
      type: String,
      required: true,
      enum: ['smartphone', 'laptop', 'car', 'machinery', 'inventory']
    },
    brand: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    variant: String,
    purchaseDate: {
      type: Date,
      required: true
    },
    serialNumber: String,
    images: [{
      url: String, // Public gateway URL
      ipfsHash: String, // Raw IPFS hash
      fileSize: Number // File size in bytes
    }],
    userCondition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor']
    }
  },

  // AI Assessment Results
  aiAssessment: {
    detectedModel: String,
    detectedBrand: String,
    matchConfidence: Number,
    conditionScore: {
      type: Number,
      min: 0,
      max: 1
    },
    physicalCondition: {
      type: String,
      enum: ['mint', 'excellent', 'good', 'fair', 'poor', 'very poor']
    },
    damageNotes: [String],
    redFlags: [String],
    isStockPhoto: Boolean,
    gptConfidence: Number
  },

  // Valuation Results
  valuation: {
    originalPrice: Number,
    currentMarketValue: {
      type: Number,
      required: true
    },
    depreciatedValue: Number,
    conditionAdjustedValue: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'NGN'
    }
  },

  // LTV Calculation Breakdown
  ltvCalculation: {
    baseLTV: Number,
    conditionMultiplier: Number,
    ageMultiplier: Number,
    liquidityMultiplier: Number,
    finalLTV: Number, // Decimal (0-1)
    maxLoanAmount: {
      type: Number,
      required: true
    }
  },

  // Loan Terms
  loanTerms: {
    maxLTV: {
      type: Number,
      required: true
    }, // Basis points (0-10000)
    maxLoanAmount: {
      type: Number,
      required: true
    },
    recommendedDuration: Number, // Days
    recommendedRate: Number // Basis points
  },

  // Risk Assessment
  riskAssessment: {
    assetLiquidity: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    marketDemand: {
      type: String,
      enum: ['high', 'stable', 'low']
    },
    overallRisk: {
      type: String,
      enum: ['low', 'low-medium', 'medium', 'medium-high', 'high']
    }
  },

  // Status & Metadata
  status: {
    type: String,
    enum: ['pending', 'used_for_loan', 'expired', 'rejected'],
    default: 'pending',
    index: true
  },

  usedForLoan: {
    type: Boolean,
    default: false
  },

  loanId: {
    type: Number,
    default: null
  },

  // NFT Token ID if minted
  assetTokenId: {
    type: Number,
    default: null
  },

  // NFT Metadata
  nftMetadata: {
    uri: String,         // IPFS URI for metadata JSON
    hash: String         // IPFS hash
  },

  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for efficient queries
ValuationSchema.index({ userId: 1, status: 1 });
ValuationSchema.index({ userId: 1, createdAt: -1 });
ValuationSchema.index({ expiresAt: 1 });

// Virtual for checking if valuation is still valid
ValuationSchema.virtual('isValid').get(function() {
  return this.status === 'pending' && new Date() < this.expiresAt;
});

// Method to check if valuation is expired
ValuationSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to mark as used for loan
ValuationSchema.methods.markAsUsed = function(loanId, assetTokenId) {
  this.status = 'used_for_loan';
  this.usedForLoan = true;
  this.loanId = loanId;
  this.assetTokenId = assetTokenId;
  return this.save();
};

// Static method to find valid valuations for a user
ValuationSchema.statics.findValidByUser = function(userId) {
  return this.find({
    userId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

// Static method to expire old valuations
ValuationSchema.statics.expireOldValuations = async function() {
  const result = await this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    {
      $set: { status: 'expired' }
    }
  );
  return result;
};

// Auto-expire valuations before querying (middleware)
ValuationSchema.pre('find', function() {
  // Optionally filter out expired pending valuations
  // This can be expensive, so use sparingly or run as a cron job
});

// Ensure JSON output includes virtuals
ValuationSchema.set('toJSON', { virtuals: true });
ValuationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Valuation', ValuationSchema);
