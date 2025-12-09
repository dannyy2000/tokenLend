# TokenLend Backend - AI Valuation Engine

AI-powered asset valuation system for the TokenLend RWA lending platform.

## ✅ What's Built

- ✅ Express REST API server
- ✅ Price database with 15 assets (phones, laptops, cars)
- ✅ GPT Vision API integration for image analysis
- ✅ Multi-factor LTV calculator (4 factors: base, condition, age, liquidity)
- ✅ Depreciation calculator
- ✅ Rate limiting middleware
- ✅ Complete valuation endpoint

## 📁 Project Structure

```
backend/
├── src/
│   ├── routes/
│   │   ├── valuation.routes.js    # POST /api/valuations
│   │   └── asset.routes.js        # GET /api/assets
│   ├── controllers/
│   │   ├── valuationController.js # Main valuation logic
│   │   └── assetController.js     # Asset queries
│   ├── services/
│   │   ├── gptService.js          # GPT Vision integration
│   │   ├── pricingService.js      # Price database queries
│   │   └── ltvCalculator.js       # LTV calculation
│   ├── utils/
│   │   ├── dateUtils.js           # Age calculations
│   │   └── depreciation.js        # Depreciation formulas
│   ├── data/
│   │   └── assetPrices.json       # 15 assets database
│   └── middleware/
│       └── rateLimiter.js         # API rate limiting
├── server.js                       # Express server
├── package.json
├── .env
└── README.md                       # This file
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Edit `.env` file:

```bash
# Get your OpenAI API key from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-actual-key-here

PORT=5000
NODE_ENV=development
```

### 3. Start Server

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Server will run on `http://localhost:5000`

## 📡 API Endpoints

### Health Check

```bash
GET /health
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-12-09T17:00:00.000Z"
}
```

---

### Get All Assets

```bash
GET /api/assets
```

**Query Parameters:**
- `type` (optional): Filter by asset type (smartphone, laptop, car)

**Response:**
```json
{
  "success": true,
  "count": 15,
  "assetTypes": ["smartphone", "laptop", "car"],
  "assets": [...]
}
```

---

### Search Assets

```bash
GET /api/assets/search?q=iphone
```

**Response:**
```json
{
  "success": true,
  "query": "iphone",
  "count": 4,
  "assets": [...]
}
```

---

### Create Valuation

```bash
POST /api/valuations
Content-Type: application/json
```

**Request Body:**
```json
{
  "assetType": "smartphone",
  "brand": "Apple",
  "model": "iPhone 14",
  "variant": "128GB",
  "purchaseDate": "2023-01-15",
  "serialNumber": "ABC123456",
  "images": [
    "https://example.com/image1.jpg"
  ],
  "userId": "user_123"
}
```

**Response:**
```json
{
  "success": true,
  "valuationId": "val_abc123...",
  "asset": {
    "detectedModel": "iPhone 14 128GB",
    "confirmedMatch": true,
    "type": "smartphone",
    "brand": "Apple"
  },
  "valuation": {
    "currentMarketValue": 650000,
    "depreciatedValue": 585000,
    "conditionAdjustedValue": 497250,
    "currency": "NGN"
  },
  "condition": {
    "rating": "good",
    "score": 0.85,
    "notes": ["Minor scratches on edges"],
    "confidence": 0.92,
    "redFlags": []
  },
  "loanTerms": {
    "maxLTV": 4361,
    "maxLTVPercent": "43.61%",
    "maxLoanAmount": 216781,
    "recommendedDuration": 30,
    "recommendedInterestRate": 1000
  },
  "riskBreakdown": {
    "baseLTV": "70.00%",
    "conditionAdjustment": "85.00%",
    "ageAdjustment": "95.00%",
    "liquidityAdjustment": "100.00%",
    "finalLTV": "43.61%"
  },
  "riskAssessment": {
    "assetLiquidity": "high",
    "marketDemand": "high",
    "overallRisk": "medium"
  },
  "metadata": {
    "timestamp": "2024-12-09T17:00:00.000Z",
    "expiresAt": "2024-12-10T17:00:00.000Z",
    "validFor": "24 hours",
    "assetAge": "1.91 years"
  }
}
```

---

## 🧮 LTV Calculation Explained

The system uses a **4-factor formula** to calculate a safe Loan-to-Value ratio:

```javascript
finalLTV = baseLTV × conditionScore × ageMultiplier × liquidityMultiplier
```

### Factor Breakdown:

| Factor | Source | Example |
|--------|--------|---------|
| **Base LTV** | Asset type | Smartphones: 70%, Laptops: 60%, Cars: 75% |
| **Condition** | GPT Vision analysis | 0.85 (good condition) |
| **Age** | Purchase date | 1.5 years → 0.95 multiplier |
| **Liquidity** | Price database | High liquidity → 1.0 multiplier |

**Example Calculation:**

iPhone 14 (1.9 years old, good condition):
```
= 0.70 × 0.85 × 0.95 × 1.0
= 0.5643
= 56.43% final LTV
```

If the phone is worth ₦650,000:
- **Max loan = ₦366,795**

---

## 🗄️ Price Database

Located at: `src/data/assetPrices.json`

**Current Assets:**
- **Smartphones:** iPhone 15 Pro, iPhone 14, iPhone 13, iPhone 12, Samsung S24 Ultra, Samsung S23
- **Laptops:** MacBook Air M2, MacBook Pro M1, HP Pavilion 15, Dell Inspiron 15, Lenovo ThinkPad X1
- **Cars:** Toyota Camry 2022, Toyota Corolla 2021, Honda Accord 2020, Lexus ES350 2019

### Adding New Assets

Edit `src/data/assetPrices.json`:

```json
{
  "id": "asset-unique-id",
  "type": "smartphone|laptop|car|machinery",
  "brand": "Apple",
  "model": "iPhone 16",
  "variant": "256GB",
  "originalPrice": 1299,
  "currentMarketValue": 1100000,
  "currency": "NGN",
  "depreciationRate": 0.20,
  "liquidity": "high|medium|low",
  "marketDemand": "high|stable|low",
  "lastUpdated": "2024-12-09"
}
```

---

## 🤖 GPT Vision Integration

The system uses OpenAI's GPT-4 Vision API to analyze asset images.

**What it does:**
- Verifies asset matches user description
- Detects exact model from image
- Assesses physical condition (scratches, damage, wear)
- Assigns condition score (0.5-1.0)
- Detects stock photos or fraud attempts

**Condition Score Guide:**
- `1.0` = Mint/New (perfect, no wear)
- `0.9-0.95` = Excellent (minimal wear)
- `0.8-0.89` = Good (light wear)
- `0.6-0.79` = Fair (moderate wear)
- `0.4-0.59` = Poor (heavy wear)
- `<0.4` = Very Poor (severe damage)

---

## 🧪 Testing

### Test Assets Endpoint

```bash
curl http://localhost:5000/api/assets | json_pp
```

### Test Search

```bash
curl "http://localhost:5000/api/assets/search?q=macbook" | json_pp
```

### Test Valuation (requires OpenAI API key)

```bash
curl -X POST http://localhost:5000/api/valuations \
  -H "Content-Type: application/json" \
  -d '{
    "assetType": "smartphone",
    "brand": "Apple",
    "model": "iPhone 14",
    "variant": "128GB",
    "purchaseDate": "2023-01-15",
    "images": ["https://example.com/iphone.jpg"],
    "userId": "user_123"
  }' | json_pp
```

---

## 💰 Cost Management

**GPT-4 Vision API Pricing:**
- ~$0.01-0.03 per image analysis
- Use rate limiting to prevent abuse
- Cache results to avoid duplicate calls

**Current Rate Limits:**
- 100 requests per 15 minutes per IP
- Configurable in `.env`

---

## 🔐 Security Features

- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ Input validation
- ✅ Error handling
- ✅ Stock photo detection
- ✅ Fraud prevention (red flags)

---

## 🚧 TODO (Future Enhancements)

- [ ] MongoDB integration for storing valuations
- [ ] User authentication (JWT)
- [ ] Multiple image analysis (average scores)
- [ ] IPFS integration for image storage
- [ ] Webhook notifications
- [ ] Admin panel for price updates
- [ ] Automated price scraping
- [ ] Loan history tracking
- [ ] Analytics dashboard

---

## 📝 Environment Variables

```bash
# Server
PORT=5000
NODE_ENV=development|production

# Database (optional)
MONGODB_URI=mongodb://localhost:27017/tokenlend

# OpenAI
OPENAI_API_KEY=sk-...

# Security
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🐛 Troubleshooting

### Server won't start
- Check if port 5000 is already in use
- Verify `.env` file exists
- Run `npm install` again

### GPT API errors
- Verify `OPENAI_API_KEY` is valid
- Check API quota/billing
- Ensure image URLs are accessible

### Asset not found
- Check spelling of brand/model
- View all assets: `GET /api/assets`
- Add missing asset to `assetPrices.json`

---

## 📚 Related Documentation

- [AI Valuation Engine Plan](../AI_VALUATION_ENGINE.md)
- [Project Roadmap](../PROJECT.md)
- [Smart Contracts](../contracts/)

---

**Built for TokenLend - RWA-Backed SME Lending Platform**
