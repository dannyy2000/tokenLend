const ipfsService = require('./ipfsService');

/**
 * Generate NFT metadata JSON for an asset
 * Follows OpenSea metadata standards: https://docs.opensea.io/docs/metadata-standards
 *
 * @param {Object} valuationData - Complete valuation data
 * @returns {Object} NFT metadata object
 */
function generateMetadata(valuationData) {
  const {
    asset,
    valuation,
    condition,
    loanTerms,
    metadata,
    images
  } = valuationData;

  // Main image (first uploaded image)
  const mainImage = images && images.length > 0
    ? (typeof images[0] === 'object' ? images[0].url : images[0])
    : '';

  // Generate name
  const name = `${asset.brand} ${asset.model}${asset.variant ? ' ' + asset.variant : ''}`;

  // Generate description
  const description = `Tokenized ${asset.type} asset for TokenLend collateral. AI-verified and valued at ${valuation.currency} ${valuation.finalValue.toLocaleString()}.`;

  // Build attributes array
  const attributes = [
    {
      trait_type: "Asset Type",
      value: asset.type
    },
    {
      trait_type: "Brand",
      value: asset.brand
    },
    {
      trait_type: "Model",
      value: asset.model
    },
    {
      trait_type: "Condition",
      value: condition.rating
    },
    {
      trait_type: "Condition Score",
      display_type: "number",
      value: condition.score,
      max_value: 1
    },
    {
      trait_type: "AI Confidence",
      display_type: "boost_percentage",
      value: Math.round(condition.confidence * 100)
    },
    {
      trait_type: "Valuation",
      value: `${valuation.currency} ${valuation.finalValue.toLocaleString()}`
    },
    {
      trait_type: "Max LTV",
      value: loanTerms.maxLTVPercent
    },
    {
      trait_type: "Max Loan Amount",
      value: `${valuation.currency} ${loanTerms.maxLoanAmount.toLocaleString()}`
    },
    {
      trait_type: "Asset Age",
      value: metadata.assetAge
    }
  ];

  // Add variant if exists
  if (asset.variant) {
    attributes.push({
      trait_type: "Variant",
      value: asset.variant
    });
  }

  // Add red flags if any
  if (condition.redFlags && condition.redFlags.length > 0) {
    attributes.push({
      trait_type: "Red Flags",
      value: condition.redFlags.join(', ')
    });
  }

  // Build NFT metadata object
  const nftMetadata = {
    name,
    description,
    image: mainImage,
    external_url: "https://tokenlend.app", // Update with your actual URL
    attributes,
    properties: {
      category: "collateral",
      files: images.map(img => ({
        uri: typeof img === 'object' ? img.url : img,
        type: "image"
      })),
      creators: [
        {
          address: "TokenLend",
          share: 100
        }
      ]
    },
    // Additional custom fields
    valuation: {
      originalPrice: valuation.originalPrice,
      currentMarketValue: valuation.currentMarketValue,
      depreciatedValue: valuation.depreciatedValue,
      conditionAdjustedValue: valuation.conditionAdjustedValue,
      currency: valuation.currency
    },
    ai_assessment: {
      detectedModel: asset.detectedModel,
      confirmedMatch: asset.confirmedMatch,
      conditionScore: condition.score,
      physicalCondition: condition.rating,
      confidence: condition.confidence,
      damageNotes: condition.notes || [],
      redFlags: condition.redFlags || []
    },
    loan_terms: {
      maxLTV: loanTerms.maxLTV,
      maxLTVPercent: loanTerms.maxLTVPercent,
      maxLoanAmount: loanTerms.maxLoanAmount,
      recommendedDuration: loanTerms.recommendedDuration,
      recommendedRate: loanTerms.recommendedRate
    },
    timestamp: metadata.timestamp,
    expiresAt: metadata.expiresAt
  };

  return nftMetadata;
}

/**
 * Generate metadata and upload to IPFS
 * @param {Object} valuationData - Complete valuation data
 * @returns {Promise<Object>} { metadataJson, metadataUri }
 */
async function generateAndUploadMetadata(valuationData) {
  console.log('📝 Generating NFT metadata...');

  // Generate metadata JSON
  const metadataJson = generateMetadata(valuationData);

  console.log('📤 Uploading metadata to IPFS...');

  // Upload JSON to IPFS using the uploadJSON method
  const uploadResult = await ipfsService.uploadJSON(metadataJson, {
    name: `asset-metadata-${Date.now()}`,
    type: 'nft-metadata'
  });

  console.log('✅ Metadata uploaded to IPFS:', uploadResult.url);

  return {
    metadataJson,
    metadataUri: uploadResult.url,
    metadataHash: uploadResult.ipfsHash
  };
}

/**
 * Update metadata for an existing NFT
 * Useful if valuation changes or asset condition updates
 *
 * @param {string} tokenId - NFT token ID
 * @param {Object} updatedData - Updated valuation data
 * @returns {Promise<Object>} Updated metadata URI
 */
async function updateMetadata(tokenId, updatedData) {
  console.log(`🔄 Updating metadata for token ${tokenId}...`);

  const result = await generateAndUploadMetadata(updatedData);

  return {
    tokenId,
    ...result
  };
}

module.exports = {
  generateMetadata,
  generateAndUploadMetadata,
  updateMetadata
};
