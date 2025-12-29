const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { protect, optional } = require('../middleware/auth');

/**
 * @route   POST /api/loans
 * @desc    Create a new loan record (called after blockchain transaction)
 * @access  Public (no auth required for MVP, blockchain is source of truth)
 */
router.post('/', loanController.createLoan);

/**
 * @route   PUT /api/loans/:loanId/fund
 * @desc    Mark loan as funded (called after blockchain transaction)
 * @access  Public
 */
router.put('/:loanId/fund', loanController.fundLoan);

/**
 * @route   PUT /api/loans/:loanId/repay
 * @desc    Record loan repayment (called after blockchain transaction)
 * @access  Public
 */
router.put('/:loanId/repay', loanController.repayLoan);

/**
 * @route   PUT /api/loans/:loanId/liquidate
 * @desc    Mark loan as liquidated (called after blockchain transaction)
 * @access  Public
 */
router.put('/:loanId/liquidate', loanController.liquidateLoan);

/**
 * @route   GET /api/loans
 * @desc    Get all loans with optional filtering
 * @access  Public
 * @query   ?status=active&borrower=0x123...&lender=0x456...&limit=50&offset=0
 */
router.get('/', loanController.getAllLoans);

/**
 * @route   GET /api/loans/can-create/:address
 * @desc    Check if a wallet address can create loans (verification check)
 * @access  Public
 */
router.get('/can-create/:address', loanController.checkCanCreateLoan);

/**
 * @route   GET /api/loans/available
 * @desc    Get available loan requests (not yet funded)
 * @access  Public
 * @query   ?limit=20
 */
router.get('/available', loanController.getAvailableLoans);

/**
 * @route   GET /api/loans/overdue
 * @desc    Get overdue loans
 * @access  Public
 */
router.get('/overdue', loanController.getOverdueLoans);

/**
 * @route   GET /api/loans/:loanId
 * @desc    Get specific loan by ID
 * @access  Public
 */
router.get('/:loanId', loanController.getLoanById);

/**
 * @route   GET /api/loans/borrower/:address
 * @desc    Get all loans for a specific borrower
 * @access  Public
 * @query   ?status=funded
 */
router.get('/borrower/:address', loanController.getBorrowerLoans);

/**
 * @route   GET /api/loans/lender/:address
 * @desc    Get all loans for a specific lender
 * @access  Public
 * @query   ?status=funded
 */
router.get('/lender/:address', loanController.getLenderLoans);

/**
 * @route   GET /api/loans/stats/:address
 * @desc    Get loan statistics for a user (as both borrower and lender)
 * @access  Public
 */
router.get('/stats/:address', loanController.getUserStats);

module.exports = router;
