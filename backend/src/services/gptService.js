const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Analyze asset image using GPT Vision API
 * @param {string} imageUrl - URL of the asset image
 * @param {Object} userInput - User-provided asset details
 * @returns {Promise<Object>} AI assessment
 */
async function analyzeAssetImage(imageUrl, userInput) {
  const { assetType, brand, model, purchaseDate } = userInput;

  const prompt = `
You are an expert asset valuator. Analyze this image and provide a detailed assessment.

IMAGE URL: ${imageUrl}

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
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.3  // Lower temperature for more consistent results
    });

    const content = response.choices[0].message.content;

    // Parse JSON response
    const aiAssessment = JSON.parse(content);

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

    // Return error with fallback
    return {
      success: false,
      error: error.message,
      fallback: {
        matches: null,
        detectedModel: userInput.model,
        detectedBrand: userInput.brand,
        physicalCondition: "unknown",
        conditionScore: 0.70,  // Conservative fallback score
        damageNotes: ["Unable to analyze image"],
        confidence: 0.0,
        redFlags: ["AI analysis failed"],
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
  analyzeMultipleImages
};
