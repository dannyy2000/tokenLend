/**
 * Backend API client for loan operations
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export interface CreateLoanData {
  loanId: number;
  borrower: string;
  assetTokenId: number;
  principal: number;
  interestRate: number;
  duration: number;
  stablecoin: string;
  txHash: string;
  blockNumber?: number;
  valuationId?: string;
  chainId?: number;
}

export interface FundLoanData {
  lender: string;
  txHash: string;
}

export interface RepayLoanData {
  amount: number;
  txHash: string;
}

export interface LiquidateLoanData {
  txHash: string;
}

/**
 * Create a new loan record in backend
 */
export async function createLoan(data: CreateLoanData) {
  const response = await fetch(`${BACKEND_URL}/api/loans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create loan');
  }

  return response.json();
}

/**
 * Mark loan as funded
 */
export async function fundLoan(loanId: number, data: FundLoanData) {
  const response = await fetch(`${BACKEND_URL}/api/loans/${loanId}/fund`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fund loan');
  }

  return response.json();
}

/**
 * Record loan repayment
 */
export async function repayLoan(loanId: number, data: RepayLoanData) {
  const response = await fetch(`${BACKEND_URL}/api/loans/${loanId}/repay`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to record repayment');
  }

  return response.json();
}

/**
 * Mark loan as liquidated
 */
export async function liquidateLoan(loanId: number, data: LiquidateLoanData) {
  const response = await fetch(`${BACKEND_URL}/api/loans/${loanId}/liquidate`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to liquidate loan');
  }

  return response.json();
}

/**
 * Get all loans with optional filters
 */
export async function getAllLoans(params?: {
  status?: string;
  borrower?: string;
  lender?: string;
  limit?: number;
  offset?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.borrower) queryParams.append('borrower', params.borrower);
  if (params?.lender) queryParams.append('lender', params.lender);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const response = await fetch(`${BACKEND_URL}/api/loans?${queryParams}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch loans');
  }

  return response.json();
}

/**
 * Get available loan requests
 */
export async function getAvailableLoans(limit?: number) {
  const queryParams = new URLSearchParams();
  if (limit) queryParams.append('limit', limit.toString());

  const response = await fetch(`${BACKEND_URL}/api/loans/available?${queryParams}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch available loans');
  }

  return response.json();
}

/**
 * Get specific loan by ID
 */
export async function getLoanById(loanId: number) {
  const response = await fetch(`${BACKEND_URL}/api/loans/${loanId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch loan');
  }

  return response.json();
}

/**
 * Get loans for a borrower
 */
export async function getBorrowerLoans(address: string, status?: string) {
  const queryParams = new URLSearchParams();
  if (status) queryParams.append('status', status);

  const response = await fetch(`${BACKEND_URL}/api/loans/borrower/${address}?${queryParams}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch borrower loans');
  }

  return response.json();
}

/**
 * Get loans for a lender
 */
export async function getLenderLoans(address: string, status?: string) {
  const queryParams = new URLSearchParams();
  if (status) queryParams.append('status', status);

  const response = await fetch(`${BACKEND_URL}/api/loans/lender/${address}?${queryParams}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch lender loans');
  }

  return response.json();
}

/**
 * Get user statistics
 */
export async function getUserStats(address: string) {
  const response = await fetch(`${BACKEND_URL}/api/loans/stats/${address}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch user stats');
  }

  return response.json();
}

/**
 * Get overdue loans
 */
export async function getOverdueLoans() {
  const response = await fetch(`${BACKEND_URL}/api/loans/overdue`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch overdue loans');
  }

  return response.json();
}
