const axios = require('axios');
const FormData = require('form-data');

/**
 * IPFS Service using Pinata
 * Handles file uploads to IPFS via Pinata's API
 */
class IPFSService {
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
    this.pinataGateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
    this.pinataApiUrl = 'https://api.pinata.cloud';
  }

  /**
   * Upload a file to Pinata IPFS
   * @param {Buffer} fileBuffer - File buffer from multer
   * @param {String} fileName - Original filename
   * @param {Object} metadata - Optional metadata
   * @returns {Object} { ipfsHash, url, size }
   */
  async uploadFile(fileBuffer, fileName, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, fileName);

      // Add metadata
      const pinataMetadata = JSON.stringify({
        name: fileName,
        keyvalues: metadata
      });
      formData.append('pinataMetadata', pinataMetadata);

      // Pin options
      const pinataOptions = JSON.stringify({
        cidVersion: 1
      });
      formData.append('pinataOptions', pinataOptions);

      const response = await axios.post(
        `${this.pinataApiUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          maxBodyLength: Infinity,
          headers: {
            ...formData.getHeaders(),
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey
          }
        }
      );

      const ipfsHash = response.data.IpfsHash;
      const url = this.getPublicUrl(ipfsHash);

      return {
        ipfsHash,
        url,
        size: response.data.PinSize
      };
    } catch (error) {
      console.error('IPFS upload error:', error.response?.data || error.message);
      throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
  }

  /**
   * Upload JSON data to Pinata IPFS
   * @param {Object} jsonData - JSON object to upload
   * @param {Object} metadata - Optional metadata
   * @returns {Object} { ipfsHash, url }
   */
  async uploadJSON(jsonData, metadata = {}) {
    try {
      const body = {
        pinataMetadata: {
          name: metadata.name || 'json-data',
          keyvalues: metadata
        },
        pinataContent: jsonData
      };

      const response = await axios.post(
        `${this.pinataApiUrl}/pinning/pinJSONToIPFS`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey
          }
        }
      );

      const ipfsHash = response.data.IpfsHash;
      const url = this.getPublicUrl(ipfsHash);

      return {
        ipfsHash,
        url
      };
    } catch (error) {
      console.error('IPFS JSON upload error:', error.response?.data || error.message);
      throw new Error(`Failed to upload JSON to IPFS: ${error.message}`);
    }
  }

  /**
   * Unpin a file from Pinata (cleanup)
   * @param {String} ipfsHash - IPFS hash to unpin
   * @returns {Boolean} success
   */
  async unpinFile(ipfsHash) {
    try {
      await axios.delete(
        `${this.pinataApiUrl}/pinning/unpin/${ipfsHash}`,
        {
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey
          }
        }
      );

      return true;
    } catch (error) {
      console.error('IPFS unpin error:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Get public URL for an IPFS hash
   * @param {String} ipfsHash - IPFS hash
   * @returns {String} Public gateway URL
   */
  getPublicUrl(ipfsHash) {
    return `https://${this.pinataGateway}/ipfs/${ipfsHash}`;
  }

  /**
   * Test Pinata connection
   * @returns {Boolean} connection status
   */
  async testConnection() {
    try {
      const response = await axios.get(
        `${this.pinataApiUrl}/data/testAuthentication`,
        {
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey
          }
        }
      );

      console.log('✅ Pinata connection successful:', response.data.message);
      return true;
    } catch (error) {
      console.error('❌ Pinata connection failed:', error.response?.data || error.message);
      return false;
    }
  }
}

// Create singleton instance
const ipfsService = new IPFSService();

module.exports = ipfsService;
