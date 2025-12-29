const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { optionalAuth } = require('../middleware/auth');

// Optional authentication for MVP (allows wallet-based tokens)
router.use(optionalAuth);

/**
 * @route   POST /api/verification/business-profile
 * @desc    Create/Update SME business profile (requires walletAddress in body)
 * @access  Public (MVP)
 */
router.post('/business-profile', verificationController.createBusinessProfile);

/**
 * @route   GET /api/verification/business-profile/:walletAddress
 * @desc    Get SME business profile
 * @access  Public (MVP)
 */
router.get('/business-profile/:walletAddress', verificationController.getBusinessProfile);

/**
 * @route   POST /api/verification/upload-document
 * @desc    Upload business verification document (requires walletAddress in body)
 * @access  Public (MVP)
 */
router.post('/upload-document', verificationController.uploadDocument);

/**
 * @route   POST /api/verification/lender-risk
 * @desc    Acknowledge lender risk (requires walletAddress in body)
 * @access  Public (MVP)
 */
router.post('/lender-risk', verificationController.acknowledgeLenderRisk);

/**
 * @route   GET /api/verification/lender-profile/:walletAddress
 * @desc    Get lender profile
 * @access  Public (MVP)
 */
router.get('/lender-profile/:walletAddress', verificationController.getLenderProfile);

/**
 * @route   GET /api/verification/status/:walletAddress
 * @desc    Get overall verification status
 * @access  Public (MVP)
 */
router.get('/status/:walletAddress', verificationController.getVerificationStatus);

module.exports = router;
