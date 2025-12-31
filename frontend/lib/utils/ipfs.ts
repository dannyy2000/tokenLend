/**
 * IPFS Upload Utilities
 * Handles file uploads to IPFS via backend Pinata service
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface IPFSUploadResult {
  ipfsHash: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Upload a single document to IPFS
 * @param file - File object to upload
 * @param walletAddress - Optional wallet address for metadata
 * @returns Upload result with IPFS hash and URL
 */
export async function uploadToIPFS(
  file: File,
  walletAddress?: string
): Promise<IPFSUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (walletAddress) {
    formData.append('walletAddress', walletAddress);
  }

  const response = await fetch(`${API_URL}/api/upload/document`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload to IPFS');
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || 'Upload failed');
  }

  return result.data;
}

/**
 * Upload multiple images to IPFS
 * @param files - Array of File objects to upload
 * @param walletAddress - Optional wallet address for metadata
 * @returns Array of upload results
 */
export async function uploadMultipleToIPFS(
  files: File[],
  walletAddress?: string
): Promise<IPFSUploadResult[]> {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  if (walletAddress) {
    formData.append('walletAddress', walletAddress);
  }

  const response = await fetch(`${API_URL}/api/upload/images`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload images to IPFS');
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || 'Upload failed');
  }

  return result.data;
}

/**
 * Unpin a file from IPFS (cleanup)
 * @param ipfsHash - IPFS hash to unpin
 * @returns Success status
 */
export async function unpinFromIPFS(ipfsHash: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/upload/${ipfsHash}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to unpin from IPFS:', error);
    return false;
  }
}

/**
 * Test IPFS/Pinata connection
 * @returns Connection status
 */
export async function testIPFSConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/upload/test`);
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to test IPFS connection:', error);
    return false;
  }
}

/**
 * Validate file before upload
 * @param file - File to validate
 * @param maxSize - Maximum file size in bytes (default 10MB)
 * @param allowedTypes - Allowed MIME types
 * @returns Validation result
 */
export function validateFile(
  file: File,
  maxSize: number = 10 * 1024 * 1024, // 10MB
  allowedTypes: string[] = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.mimetype || file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Allowed: JPG, PNG, WEBP, PDF, DOC, DOCX'
    };
  }

  return { valid: true };
}
