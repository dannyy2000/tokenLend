const OpenAI = require('openai');
const axios = require('axios');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Download image from URL and convert to base64
 * @param {string} imageUrl - URL of the image
 * @returns {Promise<string>} Base64 encoded image with data URI prefix
 */
async function downloadImageAsBase64(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const contentType = response.headers['content-type'] || 'image/jpeg';

    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Failed to download image:', error.message);
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

/**
 * Analyze asset image using GPT Vision API
 * @param {string} imageUrl - URL of the asset image (can be http/https URL or base64)
 * @param {Object} userInput - User-provided asset details
 * @returns {Promise<Object>} AI assessment
 */
async function analyzeAssetImage(imageUrl, userInput) {
  const { assetType, brand, model, purchaseDate } = userInput;

  // Download image and convert to base64 for reliable GPT processing
  let imageContent;
  if (imageUrl.startsWith('data:image')) {
    // Already base64
    console.log('📷 Using provided base64 image');
    imageContent = { type: "image_url", image_url: { url: imageUrl } };
  } else {
    // Download from URL and convert to base64
    console.log('📥 Downloading image from IPFS...');
    try {
      const base64Image = await downloadImageAsBase64(imageUrl);
      console.log('✅ Image downloaded and converted to base64');
      imageContent = { type: "image_url", image_url: { url: base64Image } };
    } catch (error) {
      console.error('❌ Failed to download image, trying URL directly...');
      // Fallback to URL if download fails
      imageContent = { type: "image_url", image_url: { url: imageUrl, detail: "high" } };
    }
  }

  const prompt = `
You are an expert asset valuator. Analyze this image and provide a detailed assessment.

USER INPUT:
- Asset Type: ${assetType}
- Brand: ${brand}
- Model: ${model}
- Purchase Date: ${purchaseDate}

TASKS:
1. Verify the asset matches the user's description
2. Identify the exact model if visible
3. Assess physical condition based on:
   - Screen/body damage (scratches, cracks, dents)
   - Wear and tear
   - Visible defects
4. Estimate functional condition (if determinable from image)
5. Check if this is a stock photo or professional product image

RETURN ONLY THIS JSON FORMAT (no additional text):
{
  "matches": true,
  "detectedModel": "exact model name",
  "detectedBrand": "brand name",
  "physicalCondition": "mint/excellent/good/fair/poor",
  "conditionScore": 0.85,
  "damageNotes": ["scratch on top-left corner", "minor wear on edges"],
  "confidence": 0.92,
  "redFlags": [],
  "isStockPhoto": false
}

CONDITION SCORE GUIDE:
- 1.0 = Mint/New (perfect condition, no visible wear)
- 0.9-0.95 = Excellent (minimal wear, like new)
- 0.8-0.89 = Good (light wear, fully functional)
- 0.6-0.79 = Fair (moderate wear, some cosmetic damage)
- 0.4-0.59 = Poor (heavy wear, visible damage)
- <0.4 = Very Poor (severe damage, questionable functionality)

Be conservative in your assessment. If uncertain, lower the condition score.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert asset valuator. Always respond with valid JSON only, no additional text."
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            imageContent
          ]
        }
      ],
      response_format: { type: "json_object" }, // Force JSON response
      max_tokens: 500,
      temperature: 0.3  // Lower temperature for more consistent results
    });

    const content = response.choices[0].message.content;

    console.log('🤖 GPT Response received, parsing JSON...');

    // Parse JSON response
    let aiAssessment;
    try {
      aiAssessment = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ Failed to parse GPT response as JSON');
      console.error('Raw response:', content.substring(0, 200)); // Log first 200 chars
      throw new Error(`Invalid JSON from GPT: ${content.substring(0, 100)}...`);
    }

    // Log what AI detected
    console.log(`🔍 AI Detection:`);
    console.log(`   Detected: ${aiAssessment.detectedBrand} ${aiAssessment.detectedModel}`);
    console.log(`   User Said: ${userInput.brand} ${userInput.model}`);
    console.log(`   Match: ${aiAssessment.matches ? '✅' : '❌'}`);
    console.log(`   Confidence: ${(aiAssessment.confidence * 100).toFixed(1)}%`);

    // Validate condition score is within range
    if (aiAssessment.conditionScore < 0 || aiAssessment.conditionScore > 1) {
      throw new Error('Invalid condition score from AI');
    }

    return {
      success: true,
      assessment: aiAssessment,
      tokensUsed: response.usage.total_tokens,
      model: response.model
    };

  } catch (error) {
    console.error('GPT Vision API Error:', error.message);

    // Return error with fallback (using "good" as safe default)
    return {
      success: false,
      error: error.message,
      fallback: {
        matches: true,  // Assume match for testing
        detectedModel: userInput.model,
        detectedBrand: userInput.brand,
        physicalCondition: "good",  // Valid enum: mint/excellent/good/fair/poor/very poor
        conditionScore: 0.70,  // Conservative fallback score
        damageNotes: ["AI analysis unavailable - using fallback assessment"],
        confidence: 0.0,
        redFlags: ["AI analysis not performed (testing mode)"],
        isStockPhoto: false
      }
    };
  }
}

/**
 * Analyze multiple images and get average assessment
 * @param {Array<string>} imageUrls - Array of image URLs
 * @param {Object} userInput - User-provided asset details
 * @returns {Promise<Object>} Combined AI assessment
 */
async function analyzeMultipleImages(imageUrls, userInput) {
  const assessments = [];

  for (const imageUrl of imageUrls) {
    const result = await analyzeAssetImage(imageUrl, userInput);
    if (result.success) {
      assessments.push(result.assessment);
    }
  }

  if (assessments.length === 0) {
    throw new Error('Failed to analyze any images');
  }

  // Average condition scores
  const avgConditionScore = assessments.reduce((sum, a) => sum + a.conditionScore, 0) / assessments.length;

  // Combine damage notes
  const allDamageNotes = [...new Set(assessments.flatMap(a => a.damageNotes))];

  // Combine red flags
  const allRedFlags = [...new Set(assessments.flatMap(a => a.redFlags))];

  return {
    success: true,
    assessment: {
      matches: assessments[0].matches,
      detectedModel: assessments[0].detectedModel,
      detectedBrand: assessments[0].detectedBrand,
      physicalCondition: assessments[0].physicalCondition,
      conditionScore: avgConditionScore,
      damageNotes: allDamageNotes,
      confidence: assessments.reduce((sum, a) => sum + a.confidence, 0) / assessments.length,
      redFlags: allRedFlags,
      isStockPhoto: assessments.some(a => a.isStockPhoto)
    },
    imagesAnalyzed: assessments.length
  };
}

module.exports = {
  analyzeAssetImage,
  analyzeMultipleImages,
  downloadImageAsBase64
};
