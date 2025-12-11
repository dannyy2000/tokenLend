const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },

  // User Profile
  profile: {
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    businessName: {
      type: String,
      trim: true
    },
    businessType: {
      type: String,
      enum: ['retail', 'wholesale', 'manufacturing', 'services', 'other']
    }
  },

  // Wallet Address
  walletAddress: {
    type: String,
    trim: true,
    lowercase: true
  },

  // KYC Status
  kyc: {
    status: {
      type: String,
      enum: ['not_started', 'pending', 'approved', 'rejected'],
      default: 'not_started'
    },
    submittedAt: Date,
    approvedAt: Date,
    documents: [String] // IPFS hashes or URLs
  },

  // User Role
  role: {
    type: String,
    enum: ['borrower', 'lender', 'both', 'admin'],
    default: 'borrower'
  },

  // Financial Data (for LTV calculation - optional)
  financialData: {
    monthlyRevenue: Number,
    averageTransactionValue: Number,
    businessAge: Number, // in months
    lastUpdated: Date
  },

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  // Statistics
  stats: {
    totalValuations: {
      type: Number,
      default: 0
    },
    totalLoans: {
      type: Number,
      default: 0
    },
    totalBorrowed: {
      type: Number,
      default: 0
    },
    totalLent: {
      type: Number,
      default: 0
    },
    activeLoans: {
      type: Number,
      default: 0
    }
  },

  // Password Reset
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Last Login
  lastLogin: Date

}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ walletAddress: 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.profile.firstName || this.profile.lastName || 'User';
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it's new or modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);

    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to increment valuation count
UserSchema.methods.incrementValuations = function() {
  this.stats.totalValuations += 1;
  return this.save();
};

// Method to update last login
UserSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find by email
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by wallet address
UserSchema.statics.findByWallet = function(walletAddress) {
  return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

// Remove sensitive data from JSON output
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  return user;
};

// Ensure JSON output includes virtuals
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', UserSchema);
