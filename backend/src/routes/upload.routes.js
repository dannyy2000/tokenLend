const express = require('express');
const multer = require('multer');
const router = express.Router();
const ipfsService = require('../services/ipfsService');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Validate file types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: images (JPG, PNG, WEBP), PDF, DOC, DOCX`), false);
    }
  }
});

/**
 * POST /api/upload/document
 * Upload a single document (verification docs, etc.)
 */
router.post('/document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log(`📤 Uploading document to IPFS: ${req.file.originalname} (${req.file.size} bytes)`);

    // Upload to Pinata
    const result = await ipfsService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      {
        type: req.body.type || 'document',
        uploadedBy: req.body.walletAddress || 'unknown'
      }
    );

    console.log(`✅ Document uploaded to IPFS: ${result.ipfsHash}`);

    res.json({
      success: true,
      data: {
        ipfsHash: result.ipfsHash,
        url: result.url,
        fileName: req.file.originalname,
        fileSize: result.size,
        mimeType: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message
    });
  }
});

/**
 * POST /api/upload/images
 * Upload multiple images (asset photos, etc.)
 */
router.post('/images', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    console.log(`📤 Uploading ${req.files.length} images to IPFS...`);

    // Upload all files to IPFS in parallel
    const uploadPromises = req.files.map(file =>
      ipfsService.uploadFile(
        file.buffer,
        file.originalname,
        {
          type: 'asset_image',
          uploadedBy: req.body.walletAddress || 'unknown'
        }
      )
    );

    const results = await Promise.all(uploadPromises);

    console.log(`✅ ${results.length} images uploaded to IPFS`);

    res.json({
      success: true,
      data: results.map((result, index) => ({
        ipfsHash: result.ipfsHash,
        url: result.url,
        fileName: req.files[index].originalname,
        fileSize: result.size,
        mimeType: req.files[index].mimetype
      }))
    });
  } catch (error) {
    console.error('Images upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
});

/**
 * DELETE /api/upload/:ipfsHash
 * Unpin a file from IPFS (cleanup)
 */
router.delete('/:ipfsHash', async (req, res) => {
  try {
    const { ipfsHash } = req.params;

    console.log(`🗑️  Unpinning file from IPFS: ${ipfsHash}`);

    const success = await ipfsService.unpinFile(ipfsHash);

    if (success) {
      res.json({
        success: true,
        message: 'File unpinned from IPFS'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to unpin file'
      });
    }
  } catch (error) {
    console.error('Unpin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unpin file',
      error: error.message
    });
  }
});

/**
 * GET /api/upload/test
 * Test Pinata connection
 */
router.get('/test', async (req, res) => {
  try {
    const isConnected = await ipfsService.testConnection();

    if (isConnected) {
      res.json({
        success: true,
        message: 'Pinata connection successful'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Pinata connection failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to test connection',
      error: error.message
    });
  }
});

// Error handler for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
});

module.exports = router;
