const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface BusinessProfile {
  businessName: string;
  cacNumber?: string;
  businessType: string;
  businessAddress?: {
    street: string;
    city: string;
    state: string;
    country: string;
  };
  businessPhone?: string;
  businessEmail?: string;
  registrationDate?: string;
  numberOfEmployees?: string;
  verificationConsent: boolean;
  documents?: Array<{
    type: string;
    url: string;
    fileName: string;
    uploadedAt: string;
  }>;
}

export interface LenderProfile {
  riskAcknowledged: boolean;
  riskAcknowledgedAt?: string;
  investmentPreferences?: {
    minLoanAmount?: number;
    maxLoanAmount?: number;
    preferredAssetTypes?: string[];
    preferredLoanTerms?: number[];
  };
}

export interface VerificationStatus {
  role: string;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  verifiedAt?: string;
  verificationMethod?: string;
  canCreateLoan: boolean;
  canFundLoan: boolean;
  hasBusinessProfile: boolean;
  hasLenderProfile: boolean;
  riskAcknowledged: boolean;
}

/**
 * Create or update business profile
 */
export async function createBusinessProfile(
  walletAddress: string,
  profile: Partial<BusinessProfile>
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/verification/business-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress,
        ...profile
      })
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create business profile'
    };
  }
}

/**
 * Get business profile
 */
export async function getBusinessProfile(
  walletAddress: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/verification/business-profile/${walletAddress}`, {
      method: 'GET'
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch business profile'
    };
  }
}

/**
 * Upload business document
 */
export async function uploadBusinessDocument(
  walletAddress: string,
  documentType: string,
  file: File
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Import dynamically to avoid circular dependencies
    const { uploadToIPFS } = await import('../utils/ipfs');

    // Upload file to IPFS first
    const ipfsResult = await uploadToIPFS(file, walletAddress);

    // Then save metadata to backend
    const response = await fetch(`${API_BASE_URL}/api/verification/upload-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress,
        documentType,
        documentUrl: ipfsResult.url,
        fileName: ipfsResult.fileName,
        ipfsHash: ipfsResult.ipfsHash,
        fileSize: ipfsResult.fileSize
      })
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to upload document'
    };
  }
}

/**
 * Acknowledge lender risk
 */
export async function acknowledgeLenderRisk(
  walletAddress: string,
  acknowledged: boolean,
  investmentPreferences?: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/verification/lender-risk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ walletAddress, acknowledged, investmentPreferences })
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to acknowledge lender risk'
    };
  }
}

/**
 * Get lender profile
 */
export async function getLenderProfile(
  walletAddress: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/verification/lender-profile/${walletAddress}`, {
      method: 'GET'
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch lender profile'
    };
  }
}

/**
 * Get verification status
 */
export async function getVerificationStatus(
  walletAddress: string
): Promise<{ success: boolean; data?: VerificationStatus; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/verification/status/${walletAddress}`, {
      method: 'GET'
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch verification status'
    };
  }
}

/**
 * Check if wallet can create loans
 */
export async function checkCanCreateLoan(
  walletAddress: string
): Promise<{
  success: boolean;
  canCreate?: boolean;
  reason?: string;
  requiresAction?: string;
  verificationStatus?: string;
  hasBusinessProfile?: boolean;
  message?: string;
  verifiedAt?: string;
  data?: any;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/loans/can-create/${walletAddress}`, {
      method: 'GET'
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      canCreate: false,
      reason: error.message || 'Failed to check loan creation eligibility'
    };
  }
}
