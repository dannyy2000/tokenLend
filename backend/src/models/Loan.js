const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema({
  // Blockchain Data
  loanId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },

  borrower: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: props => `${props.value} is not a valid Ethereum address!`
    }
  },

  lender: {
    type: String,
    lowercase: true,
    index: true,
    validate: {
      validator: function(v) {
        return !v || /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: props => `${props.value} is not a valid Ethereum address!`
    }
  },

  // Asset Details
  assetTokenId: {
    type: Number,
    required: true,
    index: true
  },

  valuationId: {
    type: String,
    index: true
  },

  // Loan Terms
  principal: {
    type: Number,
    required: true,
    min: 0
  },

  interestRate: {
    type: Number,
    required: true,
    min: 0,
    max: 10000 // Basis points (0-100%)
  },

  duration: {
    type: Number,
    required: true,
    min: 1 // Days
  },

  stablecoin: {
    type: String,
    required: true,
    lowercase: true
  },

  // Calculated Fields
  totalRepayment: {
    type: Number,
    required: true
  },

  dueDate: {
    type: Date,
    index: true
  },

  // Repayment Tracking
  amountRepaid: {
    type: Number,
    default: 0,
    min: 0
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'funded', 'repaid', 'liquidated', 'defaulted'],
    default: 'active',
    required: true,
    index: true
  },

  // Transaction Hashes
  txHashes: {
    created: String,
    funded: String,
    repaid: String,
    liquidated: String
  },

  // Important Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  fundedAt: {
    type: Date,
    index: true
  },

  repaidAt: Date,

  liquidatedAt: Date,

  // Blockchain Metadata
  chainId: {
    type: Number,
    default: 31337 // Hardhat default
  },

  blockNumber: Number,

  // Platform Metadata
  platformFee: {
    type: Number,
    default: 0
  },

  notes: String

}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for efficient queries
LoanSchema.index({ borrower: 1, status: 1 });
LoanSchema.index({ lender: 1, status: 1 });
LoanSchema.index({ borrower: 1, createdAt: -1 });
LoanSchema.index({ lender: 1, fundedAt: -1 });
LoanSchema.index({ status: 1, dueDate: 1 });

// Virtual for checking if loan is overdue
LoanSchema.virtual('isOverdue').get(function() {
  if (this.status !== 'funded') return false;
  return new Date() > this.dueDate;
});

// Virtual for days until due
LoanSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const diff = this.dueDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for repayment progress percentage
LoanSchema.virtual('repaymentProgress').get(function() {
  if (this.totalRepayment === 0) return 0;
  return (this.amountRepaid / this.totalRepayment) * 100;
});

// Instance method to mark as funded
LoanSchema.methods.markAsFunded = function(lenderAddress, txHash) {
  this.status = 'funded';
  this.lender = lenderAddress;
  this.fundedAt = new Date();
  this.txHashes.funded = txHash;

  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + this.duration);
  this.dueDate = dueDate;

  return this.save();
};

// Instance method to record repayment
LoanSchema.methods.recordRepayment = function(amount, txHash) {
  this.amountRepaid += amount;
  this.txHashes.repaid = txHash;

  // If fully repaid
  if (this.amountRepaid >= this.totalRepayment) {
    this.status = 'repaid';
    this.repaidAt = new Date();
  }

  return this.save();
};

// Instance method to mark as liquidated
LoanSchema.methods.markAsLiquidated = function(txHash) {
  this.status = 'liquidated';
  this.liquidatedAt = new Date();
  this.txHashes.liquidated = txHash;
  return this.save();
};

// Instance method to mark as defaulted
LoanSchema.methods.markAsDefaulted = function() {
  this.status = 'defaulted';
  return this.save();
};

// Static method to find active loans for a borrower
LoanSchema.statics.findActiveLoansByBorrower = function(borrowerAddress) {
  return this.find({
    borrower: borrowerAddress.toLowerCase(),
    status: { $in: ['active', 'funded'] }
  }).sort({ createdAt: -1 });
};

// Static method to find funded loans for a lender
LoanSchema.statics.findFundedLoansByLender = function(lenderAddress) {
  return this.find({
    lender: lenderAddress.toLowerCase(),
    status: { $in: ['funded', 'repaid'] }
  }).sort({ fundedAt: -1 });
};

// Static method to find available loan requests
LoanSchema.statics.findAvailableLoans = function() {
  return this.find({
    status: 'active'
  }).sort({ createdAt: -1 });
};

// Static method to find overdue loans
LoanSchema.statics.findOverdueLoans = function() {
  return this.find({
    status: 'funded',
    dueDate: { $lt: new Date() }
  });
};

// Static method to get loan statistics for a user
LoanSchema.statics.getUserStats = async function(userAddress) {
  const address = userAddress.toLowerCase();

  const [borrowerStats, lenderStats] = await Promise.all([
    // Borrower stats
    this.aggregate([
      { $match: { borrower: address } },
      {
        $group: {
          _id: null,
          totalLoans: { $sum: 1 },
          totalBorrowed: { $sum: '$principal' },
          totalRepaid: { $sum: '$amountRepaid' },
          activeLoans: {
            $sum: { $cond: [{ $in: ['$status', ['active', 'funded']] }, 1, 0] }
          }
        }
      }
    ]),

    // Lender stats
    this.aggregate([
      { $match: { lender: address, status: { $ne: 'active' } } },
      {
        $group: {
          _id: null,
          totalLoansFunded: { $sum: 1 },
          totalLent: { $sum: '$principal' },
          totalReceived: { $sum: '$amountRepaid' },
          activeLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'funded'] }, 1, 0] }
          }
        }
      }
    ])
  ]);

  return {
    asBorrower: borrowerStats[0] || {
      totalLoans: 0,
      totalBorrowed: 0,
      totalRepaid: 0,
      activeLoans: 0
    },
    asLender: lenderStats[0] || {
      totalLoansFunded: 0,
      totalLent: 0,
      totalReceived: 0,
      activeLoans: 0
    }
  };
};

// Ensure JSON output includes virtuals
LoanSchema.set('toJSON', { virtuals: true });
LoanSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Loan', LoanSchema);
