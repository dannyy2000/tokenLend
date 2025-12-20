const Loan = require('../models/Loan');
const Valuation = require('../models/Valuation');

/**
 * Create a new loan record from blockchain data
 * Called when a loan is created on-chain
 */
exports.createLoan = async (req, res) => {
  try {
    const {
      loanId,
      borrower,
      assetTokenId,
      principal,
      interestRate,
      duration,
      stablecoin,
      txHash,
      blockNumber,
      valuationId
    } = req.body;

    // Validate required fields (handle 0 as valid for loanId and assetTokenId)
    if (loanId === undefined || loanId === null || !borrower || assetTokenId === undefined || assetTokenId === null || !principal || interestRate === undefined || !duration || !stablecoin) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if loan already exists
    const existingLoan = await Loan.findOne({ loanId });
    if (existingLoan) {
      return res.status(409).json({
        success: false,
        message: 'Loan already exists',
        loan: existingLoan
      });
    }

    // Calculate total repayment amount
    // Formula: principal * (1 + (interestRate / 10000) * (duration / 365))
    const totalRepayment = principal * (1 + (interestRate / 10000) * (duration / 365));

    // Create loan record
    const loan = new Loan({
      loanId,
      borrower: borrower.toLowerCase(),
      assetTokenId,
      principal,
      interestRate,
      duration,
      stablecoin: stablecoin.toLowerCase(),
      totalRepayment,
      status: 'active',
      txHashes: {
        created: txHash
      },
      blockNumber,
      valuationId,
      chainId: req.body.chainId || 31337
    });

    await loan.save();

    // If valuationId is provided, mark valuation as used
    if (valuationId) {
      try {
        await Valuation.findOneAndUpdate(
          { valuationId },
          {
            status: 'used_for_loan',
            usedForLoan: true,
            loanId,
            assetTokenId
          }
        );
      } catch (err) {
        console.error('Error updating valuation:', err);
        // Don't fail the loan creation if valuation update fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Loan created successfully',
      loan
    });

  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating loan',
      error: error.message
    });
  }
};

/**
 * Update loan status when funded
 */
exports.fundLoan = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { lender, txHash } = req.body;

    if (!lender || !txHash) {
      return res.status(400).json({
        success: false,
        message: 'Missing lender address or transaction hash'
      });
    }

    const loan = await Loan.findOne({ loanId: parseInt(loanId) });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    if (loan.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Loan is not available for funding'
      });
    }

    // Mark as funded
    await loan.markAsFunded(lender, txHash);

    res.json({
      success: true,
      message: 'Loan funded successfully',
      loan
    });

  } catch (error) {
    console.error('Fund loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error funding loan',
      error: error.message
    });
  }
};

/**
 * Record loan repayment
 */
exports.repayLoan = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { amount, txHash } = req.body;

    if (!amount || !txHash) {
      return res.status(400).json({
        success: false,
        message: 'Missing repayment amount or transaction hash'
      });
    }

    const loan = await Loan.findOne({ loanId: parseInt(loanId) });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    if (loan.status !== 'funded') {
      return res.status(400).json({
        success: false,
        message: 'Loan is not in funded status'
      });
    }

    // Record repayment
    await loan.recordRepayment(amount, txHash);

    res.json({
      success: true,
      message: loan.status === 'repaid' ? 'Loan fully repaid' : 'Partial repayment recorded',
      loan
    });

  } catch (error) {
    console.error('Repay loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error recording repayment',
      error: error.message
    });
  }
};

/**
 * Mark loan as liquidated
 */
exports.liquidateLoan = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { txHash } = req.body;

    const loan = await Loan.findOne({ loanId: parseInt(loanId) });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    await loan.markAsLiquidated(txHash);

    res.json({
      success: true,
      message: 'Loan liquidated successfully',
      loan
    });

  } catch (error) {
    console.error('Liquidate loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error liquidating loan',
      error: error.message
    });
  }
};

/**
 * Get all loans (with filtering)
 */
exports.getAllLoans = async (req, res) => {
  try {
    const { status, borrower, lender, limit = 50, offset = 0 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (borrower) filter.borrower = borrower.toLowerCase();
    if (lender) filter.lender = lender.toLowerCase();

    const loans = await Loan.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Loan.countDocuments(filter);

    res.json({
      success: true,
      loans,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > (parseInt(offset) + parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get all loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching loans',
      error: error.message
    });
  }
};

/**
 * Get specific loan by ID
 */
exports.getLoanById = async (req, res) => {
  try {
    const { loanId } = req.params;

    const loan = await Loan.findOne({ loanId: parseInt(loanId) });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    // Optionally populate valuation data
    let valuation = null;
    if (loan.valuationId) {
      valuation = await Valuation.findOne({ valuationId: loan.valuationId });
    }

    res.json({
      success: true,
      loan,
      valuation
    });

  } catch (error) {
    console.error('Get loan by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching loan',
      error: error.message
    });
  }
};

/**
 * Get loans for a specific borrower
 */
exports.getBorrowerLoans = async (req, res) => {
  try {
    const { address } = req.params;
    const { status } = req.query;

    const filter = { borrower: address.toLowerCase() };
    if (status) filter.status = status;

    const loans = await Loan.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      loans,
      count: loans.length
    });

  } catch (error) {
    console.error('Get borrower loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching borrower loans',
      error: error.message
    });
  }
};

/**
 * Get loans for a specific lender
 */
exports.getLenderLoans = async (req, res) => {
  try {
    const { address } = req.params;
    const { status } = req.query;

    const filter = {
      lender: address.toLowerCase(),
      status: { $ne: 'active' } // Exclude unfunded loan requests
    };

    if (status) filter.status = status;

    const loans = await Loan.find(filter).sort({ fundedAt: -1 });

    res.json({
      success: true,
      loans,
      count: loans.length
    });

  } catch (error) {
    console.error('Get lender loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching lender loans',
      error: error.message
    });
  }
};

/**
 * Get available loan requests (not yet funded)
 */
exports.getAvailableLoans = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const loans = await Loan.findAvailableLoans().limit(parseInt(limit));

    res.json({
      success: true,
      loans,
      count: loans.length
    });

  } catch (error) {
    console.error('Get available loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching available loans',
      error: error.message
    });
  }
};

/**
 * Get user statistics
 */
exports.getUserStats = async (req, res) => {
  try {
    const { address } = req.params;

    const stats = await Loan.getUserStats(address);

    res.json({
      success: true,
      address: address.toLowerCase(),
      stats
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user stats',
      error: error.message
    });
  }
};

/**
 * Get overdue loans
 */
exports.getOverdueLoans = async (req, res) => {
  try {
    const loans = await Loan.findOverdueLoans();

    res.json({
      success: true,
      loans,
      count: loans.length
    });

  } catch (error) {
    console.error('Get overdue loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching overdue loans',
      error: error.message
    });
  }
};
