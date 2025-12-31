const User = require('../models/User');

/**
 * Create/Update SME Business Profile
 * POST /api/verification/business-profile
 */
exports.createBusinessProfile = async (req, res) => {
  try {
    const {
      walletAddress,
      businessName,
      cacNumber,
      businessType,
      businessAddress,
      businessPhone,
      businessEmail,
      registrationDate,
      numberOfEmployees,
      verificationConsent
    } = req.body;

    // Validate required fields
    if (!walletAddress || !businessName || !businessType) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address, business name and type are required'
      });
    }

    // Find or create user based on wallet address
    let user = await User.findByWallet(walletAddress);

    if (!user) {
      // Create new user for MVP
      user = new User({
        walletAddress: walletAddress.toLowerCase(),
        email: `${walletAddress.toLowerCase()}@wallet.local`, // Temporary email for MVP
        password: 'wallet_auth', // Not used for wallet auth
        role: 'borrower'
      });
    }

    // Update business profile
    user.businessProfile = {
      ...user.businessProfile,
      businessName,
      cacNumber: cacNumber || user.businessProfile?.cacNumber,
      businessType,
      businessAddress: businessAddress || user.businessProfile?.businessAddress,
      businessPhone: businessPhone || user.businessProfile?.businessPhone,
      businessEmail: businessEmail || user.businessProfile?.businessEmail,
      registrationDate: registrationDate || user.businessProfile?.registrationDate,
      numberOfEmployees: numberOfEmployees || user.businessProfile?.numberOfEmployees,
      verificationConsent: verificationConsent || user.businessProfile?.verificationConsent,
      consentDate: verificationConsent ? new Date() : user.businessProfile?.consentDate,
      documents: user.businessProfile?.documents || []
    };

    // Set role to borrower if not already set
    if (user.role !== 'both' && user.role !== 'admin') {
      user.role = 'borrower';
    }

    await user.save();

    // Auto-verify if criteria met
    await user.autoVerifySME();

    res.status(200).json({
      success: true,
      message: 'Business profile updated successfully',
      data: {
        businessProfile: user.businessProfile,
        verificationStatus: user.verificationStatus,
        verifiedAt: user.verifiedAt
      }
    });

  } catch (error) {
    console.error('Error creating business profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create business profile',
      details: error.message
    });
  }
};

/**
 * Upload Business Document
 * POST /api/verification/upload-document
 */
exports.uploadDocument = async (req, res) => {
  try {
    const { walletAddress, documentType, documentUrl, fileName, ipfsHash, fileSize } = req.body;

    if (!walletAddress || !documentType || !documentUrl) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address, document type and URL are required'
      });
    }

    const user = await User.findByWallet(walletAddress);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found. Please create a business profile first.'
      });
    }

    // Initialize documents array if it doesn't exist
    if (!user.businessProfile) {
      user.businessProfile = { documents: [] };
    }
    if (!user.businessProfile.documents) {
      user.businessProfile.documents = [];
    }

    // Add document
    user.businessProfile.documents.push({
      type: documentType,
      url: documentUrl,
      ipfsHash: ipfsHash || null,
      fileName: fileName || 'document',
      fileSize: fileSize || null,
      uploadedAt: new Date()
    });

    await user.save();

    // Auto-verify after document upload
    await user.autoVerifySME();

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        documents: user.businessProfile.documents,
        verificationStatus: user.verificationStatus
      }
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload document',
      details: error.message
    });
  }
};

/**
 * Get Business Profile
 * GET /api/verification/business-profile/:walletAddress
 */
exports.getBusinessProfile = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const user = await User.findByWallet(walletAddress);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        businessProfile: user.businessProfile || null,
        verificationStatus: user.verificationStatus,
        verifiedAt: user.verifiedAt,
        verificationMethod: user.verificationMethod,
        canCreateLoan: user.canCreateLoan()
      }
    });

  } catch (error) {
    console.error('Error fetching business profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business profile',
      details: error.message
    });
  }
};

/**
 * Acknowledge Lender Risk
 * POST /api/verification/lender-risk
 */
exports.acknowledgeLenderRisk = async (req, res) => {
  try {
    const { walletAddress, acknowledged, investmentPreferences } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // Find or create user
    let user = await User.findByWallet(walletAddress);

    if (!user) {
      // Create new user for lenders
      user = new User({
        walletAddress: walletAddress.toLowerCase(),
        email: `${walletAddress.toLowerCase()}@wallet.local`,
        password: 'wallet_auth',
        role: 'lender'
      });
    }

    // Initialize lenderProfile if it doesn't exist
    if (!user.lenderProfile) {
      user.lenderProfile = {};
    }

    user.lenderProfile.riskAcknowledged = acknowledged || false;
    user.lenderProfile.riskAcknowledgedAt = acknowledged ? new Date() : null;

    // Update investment preferences if provided
    if (investmentPreferences) {
      user.lenderProfile.investmentPreferences = {
        ...user.lenderProfile.investmentPreferences,
        ...investmentPreferences
      };
    }

    // Set role to lender if not already set
    if (user.role !== 'both' && user.role !== 'admin') {
      user.role = 'lender';
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Lender profile updated successfully',
      data: {
        lenderProfile: user.lenderProfile,
        canFundLoan: user.canFundLoan()
      }
    });

  } catch (error) {
    console.error('Error acknowledging lender risk:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lender profile',
      details: error.message
    });
  }
};

/**
 * Get Lender Profile
 * GET /api/verification/lender-profile/:walletAddress
 */
exports.getLenderProfile = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const user = await User.findByWallet(walletAddress);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        lenderProfile: user.lenderProfile || null,
        canFundLoan: user.canFundLoan()
      }
    });

  } catch (error) {
    console.error('Error fetching lender profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lender profile',
      details: error.message
    });
  }
};

/**
 * Get Verification Status
 * GET /api/verification/status/:walletAddress
 */
exports.getVerificationStatus = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    const user = await User.findByWallet(walletAddress);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        role: user.role,
        verificationStatus: user.verificationStatus,
        verifiedAt: user.verifiedAt,
        verificationMethod: user.verificationMethod,
        canCreateLoan: user.canCreateLoan(),
        canFundLoan: user.canFundLoan(),
        hasBusinessProfile: !!user.businessProfile?.businessName,
        hasLenderProfile: !!user.lenderProfile,
        riskAcknowledged: user.lenderProfile?.riskAcknowledged || false
      }
    });

  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch verification status',
      details: error.message
    });
  }
};
