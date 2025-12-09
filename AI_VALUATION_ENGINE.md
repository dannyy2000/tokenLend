# AI Valuation Engine - Implementation Plan

## Overview
AI-powered asset valuation system using GPT Vision API for image recognition and condition assessment, combined with a price database and multi-factor risk analysis.

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
│  - User uploads asset photos                             │
│  - Inputs: type, brand, model, purchase date            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND API                             │
│  - Receives asset data & images                         │
│  - Calls GPT Vision API                                 │
│  - Performs LTV calculation                             │
│  - Returns valuation results                            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│            AI VALUATION ENGINE                           │
│                                                          │
│  1. Image Analysis (GPT Vision)                         │
│     → Model detection & verification                    │
│     → Condition assessment (0.0-1.0)                    │
│     → Security checks (stock photo detection)           │
│                                                          │
│  2. Price Lookup                                        │
│     → Query price database                              │
│     → Apply depreciation formula                        │
│     → Condition adjustment                              │
│                                                          │
│  3. Risk Analysis                                       │
│     → Asset type liquidity                              │
│     → Age factor                                        │
│     → Market demand                                     │
│     → Borrower creditworthiness                         │
│                                                          │
│  4. LTV Calculation                                     │
│     → Multi-factor risk assessment                      │
│     → Conservative loan limits                          │
│                                                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              SMART CONTRACTS                             │
│  - Mint AssetToken with AI valuation                    │
│  - Set maxLTV for loan limits                           │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### STEP 1: Prepare Inputs

**Frontend sends to backend:**
```json
{
  "assetType": "smartphone",
  "brand": "Apple",
  "model": "iPhone 12",
  "variant": "64GB",
  "purchaseDate": "2022-06-15",
  "condition": "good",
  "serialNumber": "ABC123456",
  "images": [
    "https://storage.../image1.jpg",
    "https://storage.../image2.jpg"
  ],
  "borrower": {
    "userId": "user_xyz",
    "monthlyRevenue": 500000
  }
}
```

---

### STEP 2: Price Database Structure

**Enhanced price database with depreciation:**

```json
{
  "assets": [
    {
      "id": "iphone-12-64gb",
      "type": "smartphone",
      "brand": "Apple",
      "model": "iPhone 12",
      "variant": "64GB",
      "originalPrice": 799,
      "currentMarketValue": 380000,
      "currency": "NGN",
      "depreciationRate": 0.20,
      "lastUpdated": "2024-12-08",
      "liquidity": "high",
      "marketDemand": "stable"
    },
    {
      "id": "hp-pavilion-15-i5",
      "type": "laptop",
      "brand": "HP",
      "model": "Pavilion 15",
      "variant": "i5, 8GB RAM",
      "originalPrice": 600,
      "currentMarketValue": 300000,
      "currency": "NGN",
      "depreciationRate": 0.30,
      "lastUpdated": "2024-12-08",
      "liquidity": "medium",
      "marketDemand": "stable"
    },
    {
      "id": "toyota-camry-2020",
      "type": "car",
      "brand": "Toyota",
      "model": "Camry",
      "variant": "2020 LE",
      "originalPrice": 25000,
      "currentMarketValue": 15000000,
      "currency": "NGN",
      "depreciationRate": 0.15,
      "lastUpdated": "2024-12-08",
      "liquidity": "high",
      "marketDemand": "high"
    }
  ]
}
```

**Depreciation Calculation:**
```javascript
function calculateCurrentValue(asset, purchaseDate) {
  const yearsOld = (Date.now() - new Date(purchaseDate)) / (365 * 24 * 60 * 60 * 1000);

  // Apply exponential depreciation
  const depreciatedValue = asset.currentMarketValue * Math.pow(
    (1 - asset.depreciationRate),
    yearsOld
  );

  // Set floor at 20% of market value (asset won't depreciate below this)
  const minValue = asset.currentMarketValue * 0.2;

  return Math.max(depreciatedValue, minValue);
}
```

---

### STEP 3: GPT Vision API Integration

**Enhanced GPT Prompt:**

```javascript
const prompt = `
You are an expert asset valuator. Analyze this image and provide a detailed assessment.

IMAGE URL: ${imageUrl}

USER INPUT:
- Asset Type: ${userInputType}
- Brand: ${userInputBrand}
- Model: ${userInputModel}
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
  "detectedModel": "iPhone 12 64GB",
  "detectedBrand": "Apple",
  "physicalCondition": "good",
  "conditionScore": 0.85,
  "damageNotes": ["Minor scratch on top-left corner", "Normal wear on edges"],
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
```

**API Call:**
```javascript
const response = await openai.chat.completions.create({
  model: "gpt-4-vision-preview",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageUrl } }
      ]
    }
  ],
  max_tokens: 500
});

const aiAssessment = JSON.parse(response.choices[0].message.content);
```

**Expected GPT Response:**
```json
{
  "matches": true,
  "detectedModel": "HP Pavilion 15",
  "detectedBrand": "HP",
  "physicalCondition": "good",
  "conditionScore": 0.85,
  "damageNotes": ["Minor scratches on lid", "Keyboard shows normal wear"],
  "confidence": 0.92,
  "redFlags": [],
  "isStockPhoto": false
}
```

---

### STEP 4: Simplified LTV Calculation (Hackathon Version)

**Simplified LTV Formula (No Borrower Data Required):**

```javascript
function calculateLTV(asset, conditionScore, purchaseDate) {
  // 1. Base LTV by asset type (liquidity-based)
  const baseLTV = {
    smartphone: 0.70,  // 70% - high liquidity, easy to resell
    laptop: 0.60,      // 60% - medium liquidity
    car: 0.75,         // 75% - established market, high demand
    machinery: 0.50,   // 50% - low liquidity, niche market
    inventory: 0.55    // 55% - depends on product type
  };

  // 2. Condition adjustment (from GPT assessment)
  // Score 0.5-1.0 directly multiplies the LTV
  const conditionMultiplier = conditionScore; // e.g., 0.85

  // 3. Age adjustment (newer assets = less depreciation risk)
  const age = calculateAge(purchaseDate);
  const ageMultiplier = age < 1 ? 1.0 :      // <1 year: no penalty
                        age < 2 ? 0.95 :     // 1-2 years: 5% reduction
                        age < 3 ? 0.90 :     // 2-3 years: 10% reduction
                        0.85;                // 3+ years: 15% reduction

  // 4. Liquidity adjustment (market demand)
  const liquidityMultiplier = asset.liquidity === 'high' ? 1.0 :
                              asset.liquidity === 'medium' ? 0.9 :
                              0.8; // low liquidity

  // 5. Final LTV calculation (NO BORROWER DATA NEEDED)
  const finalLTV = baseLTV[asset.type] *
                   conditionMultiplier *
                   ageMultiplier *
                   liquidityMultiplier;

  // 6. Convert to basis points for smart contract (7000 = 70%)
  return Math.floor(finalLTV * 10000);
}

// Helper function to calculate asset age
function calculateAge(purchaseDate) {
  const now = Date.now();
  const purchase = new Date(purchaseDate).getTime();
  const ageInYears = (now - purchase) / (365 * 24 * 60 * 60 * 1000);
  return ageInYears;
}
```

**Example Calculation:**

```javascript
// Asset: HP Pavilion 15, 1.5 years old, good condition
const example = {
  assetType: "laptop",
  purchaseDate: "2023-06-01",  // 1.5 years ago
  conditionScore: 0.85,        // From GPT
  liquidity: "medium"          // From database
};

// Step-by-step:
baseLTV = 0.60              // Laptop base
× 0.85                      // Condition (good)
× 0.95                      // Age (1.5 years)
× 0.90                      // Liquidity (medium)
= 0.60 × 0.85 × 0.95 × 0.90
= 0.4361
= 43.61% final LTV

// Convert to basis points: 4361
// Max loan = Market Value × LTV = ₦300,000 × 0.4361 = ₦130,830
```

---

### STEP 5: API Response Format

**Complete response to frontend:**

```json
{
  "success": true,
  "valuationId": "val_abc123",
  "asset": {
    "detectedModel": "HP Pavilion 15",
    "confirmedMatch": true,
    "type": "laptop",
    "brand": "HP",
    "variant": "i5, 8GB RAM"
  },
  "valuation": {
    "originalPrice": 600000,
    "currentMarketValue": 300000,
    "depreciatedValue": 270000,
    "conditionAdjustedValue": 229500,
    "currency": "NGN"
  },
  "condition": {
    "rating": "good",
    "score": 0.85,
    "notes": ["Minor scratches on lid", "Keyboard shows normal wear"],
    "confidence": 0.92,
    "redFlags": []
  },
  "loanTerms": {
    "maxLTV": 3264,
    "maxLTVPercent": "32.64%",
    "maxLoanAmount": 97920,
    "recommendedDuration": 30,
    "recommendedInterestRate": 1000
  },
  "riskBreakdown": {
    "baseLTV": "60%",
    "conditionAdjustment": "85%",
    "ageAdjustment": "95%",
    "liquidityAdjustment": "90%",
    "finalLTV": "43.61%"
  },
  "riskAssessment": {
    "assetLiquidity": "medium",
    "marketDemand": "stable",
    "overallRisk": "low-medium"
  },
  "metadata": {
    "timestamp": "2024-12-08T15:30:00Z",
    "expiresAt": "2024-12-09T15:30:00Z",
    "validFor": "24 hours"
  }
}
```

---

### STEP 6: Database Storage

**Valuation Schema (MongoDB):**

```javascript
const ValuationSchema = {
  valuationId: "val_abc123",
  userId: "user_xyz",

  // Input Data
  input: {
    assetType: "laptop",
    brand: "HP",
    model: "Pavilion 15",
    variant: "i5, 8GB",
    purchaseDate: "2022-06-15",
    serialNumber: "ABC123456",
    images: ["ipfs://Qm...", "ipfs://Qm..."],
    userCondition: "good"
  },

  // AI Assessment
  aiAssessment: {
    detectedModel: "HP Pavilion 15",
    detectedBrand: "HP",
    matchConfidence: 0.95,
    conditionScore: 0.85,
    physicalCondition: "good",
    damageNotes: ["minor scratches"],
    redFlags: [],
    isStockPhoto: false,
    gptConfidence: 0.92
  },

  // Valuation Results
  valuation: {
    originalPrice: 600000,
    currentMarketValue: 300000,
    depreciatedValue: 270000,
    conditionAdjustedValue: 229500,
    currency: "NGN"
  },

  // LTV Calculation
  ltvCalculation: {
    baseLTV: 0.60,
    conditionMultiplier: 0.85,
    ageMultiplier: 0.95,
    liquidityMultiplier: 0.90,
    borrowerMultiplier: 0.75,
    finalLTV: 0.3264,
    maxLoanAmount: 97920
  },

  // Loan Terms
  loanTerms: {
    maxLTV: 3264,
    maxLoanAmount: 97920,
    recommendedDuration: 30,
    recommendedRate: 1000
  },

  // Status & Metadata
  status: "pending",
  usedForLoan: false,
  loanId: null,
  createdAt: "2024-12-08T15:30:00Z",
  expiresAt: "2024-12-09T15:30:00Z"
};
```

---

## Security Considerations

### 1. Fraud Prevention

```javascript
// Security checks in valuation process
const securityChecks = {
  stockPhotoDetection: "Flag professional/stock images",
  exifVerification: "Check photo metadata (date, device)",
  serialNumberCheck: "Verify against manufacturer DB",
  reverseImageSearch: "Ensure image isn't from internet",
  multipleAngles: "Require 2-3 photos from different angles",
  watermarkDetection: "Flag images with watermarks"
};
```

### 2. Valuation Expiry

```javascript
const VALUATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

function isValuationValid(valuation) {
  return Date.now() < new Date(valuation.expiresAt).getTime();
}
```

### 3. Rate Limiting

```javascript
// Prevent abuse of GPT API
const rateLimits = {
  perUser: "5 valuations per hour",
  perIP: "10 valuations per hour",
  daily: "20 valuations per user per day"
};
```

---

## Cost Management

### GPT API Pricing

- **GPT-4 Vision**: ~$0.01-0.03 per image
- **GPT-3.5 Turbo**: ~$0.002-0.005 per image (cheaper alternative)

### Optimization Strategies

1. **Cache results**: Same asset + user = reuse valuation
2. **Batch processing**: Process multiple images in one call
3. **Use GPT-3.5**: For non-critical assessments
4. **Image compression**: Reduce image size before API call

---

## Price Database Maintenance

### Update Strategy

```javascript
// Option 1: Manual updates (weekly)
// - Research market prices
// - Update JSON file
// - Deploy to production

// Option 2: Automated scraping (advanced)
async function updateMarketPrices() {
  // Scrape prices from:
  // - Jumia, Konga (Nigeria)
  // - eBay, Swappa (Phones)
  // - Local marketplaces

  // Update database
  // Log changes
  // Notify admin of major price shifts
}

// Run weekly
cron.schedule('0 0 * * 0', updateMarketPrices);
```

---

## Project Structure

```
tokenLend/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── valuation.routes.js     # POST /api/valuate
│   │   │   ├── asset.routes.js         # GET /api/assets
│   │   ├── controllers/
│   │   │   ├── valuationController.js  # Main valuation logic
│   │   ├── services/
│   │   │   ├── gptService.js           # GPT API integration
│   │   │   ├── pricingService.js       # Price lookups & depreciation
│   │   │   ├── ltvCalculator.js        # LTV calculation
│   │   │   ├── ipfsService.js          # Image storage
│   │   │   ├── securityService.js      # Fraud detection
│   │   ├── models/
│   │   │   ├── Valuation.js            # Valuation schema
│   │   │   ├── Asset.js                # Asset schema
│   │   ├── data/
│   │   │   ├── assetPrices.json        # Price database
│   │   ├── utils/
│   │   │   ├── depreciation.js         # Depreciation formulas
│   │   │   ├── validation.js           # Input validation
│   │   │   ├── dateUtils.js            # Age calculation
│   │   ├── middleware/
│   │   │   ├── rateLimiter.js          # API rate limiting
│   │   │   ├── auth.js                 # User authentication
│   ├── .env
│   ├── package.json
│   ├── server.js
├── contracts/                           # Smart contracts (existing)
├── scripts/                             # Deployment scripts (existing)
├── test/                                # Contract tests (existing)
├── AI_VALUATION_ENGINE.md              # This document
├── PROJECT.md                           # Main roadmap
```

---

## Implementation Roadmap

### Phase 1: MVP (Week 1)
- [ ] Set up Express backend
- [ ] Create initial price database (10-20 items)
- [ ] Integrate GPT Vision API
- [ ] Build basic LTV calculator
- [ ] Create `/api/valuate` endpoint
- [ ] Test with sample images

### Phase 2: Enhancement (Week 2)
- [ ] Add MongoDB for storing valuations
- [ ] Implement IPFS for image storage
- [ ] Add security checks (stock photo detection)
- [ ] Build admin panel to update prices
- [ ] Add rate limiting & caching

### Phase 3: Integration
- [ ] Connect to smart contracts
- [ ] Frontend integration
- [ ] End-to-end testing
- [ ] Deploy to testnet

---

## API Endpoints

### POST /api/valuate
**Request:**
```json
{
  "assetType": "smartphone",
  "brand": "Apple",
  "model": "iPhone 12",
  "variant": "64GB",
  "purchaseDate": "2022-06-15",
  "serialNumber": "ABC123",
  "images": ["url1", "url2"],
  "borrower": {
    "userId": "user_xyz",
    "monthlyRevenue": 500000
  }
}
```

**Response:** See STEP 5 above

### GET /api/valuations/:userId
Get all valuations for a user

### GET /api/assets
Get all supported assets from price database

### POST /api/assets (Admin)
Add new asset to price database

### PUT /api/assets/:assetId (Admin)
Update asset price

---

## Testing Strategy

### Unit Tests
- Test depreciation calculations
- Test LTV formula with various inputs
- Test security checks

### Integration Tests
- Test GPT API integration
- Test database operations
- Test full valuation flow

### Manual Tests
- Test with real asset images
- Test fraud scenarios (stock photos)
- Test edge cases (very old assets, damaged items)

---

## Next Steps

1. ✅ Review and approve this plan
2. ✅ Explain LTV calculation in detail
3. ⏳ Set up backend project structure
4. ⏳ Create price database
5. ⏳ Integrate GPT Vision API
6. ⏳ Build LTV calculator
7. ⏳ Create API endpoints
8. ⏳ Test and iterate

---

## Notes & Decisions

- **Starting with smartphones & laptops** for MVP
- **24-hour valuation expiry** to prevent stale pricing
- **Conservative LTV approach** to minimize platform risk
- **GPT-4 Vision** for accuracy (can downgrade to GPT-3.5 for cost)
- **IPFS for decentralized image storage**
- **Manual price updates initially**, automated later

---

Last Updated: 2024-12-08
