# Mock Feedback Generator

> **A Cloudflare Workers-based API that uses AI to generate realistic user feedback for any product or service.**

This is a prototype project that demonstrates how to use Cloudflare's AI capabilities to generate mock user feedback at scale. Perfect for testing, demos, populating a feedback database, or training sentiment analysis models.

---

## 📋 Table of Contents

- [What This Does](#what-this-does)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Generating Feedbacks in Bulk](#generating-feedbacks-in-bulk)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Customization Ideas](#customization-ideas)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## 🎯 What This Does

This project creates an API that:

1. **Generates realistic user feedback** using Cloudflare's AI (Llama 3.1 8B model)
2. **Stores feedback in R2** (Cloudflare's object storage) as individual JSON files
3. **Tracks progress** toward generating 1,000 feedbacks
4. **Provides endpoints** to generate, list, and check progress

The feedback varies in:
- **User types**: Customizable based on your product (customers, admins, power users, beginners, etc.)
- **Tones**: positive, negative, excited, frustrated, constructive
- **Content**: features, bugs, praise, complaints, feature requests

---

## 🛠 Tech Stack

- **[Cloudflare Workers](https://workers.cloudflare.com/)** - Serverless functions at the edge
- **[Cloudflare AI](https://developers.cloudflare.com/workers-ai/)** - AI inference using Llama 3.1
- **[Cloudflare R2](https://developers.cloudflare.com/r2/)** - Object storage (S3-compatible)
- **[Wrangler](https://developers.cloudflare.com/workers/wrangler/)** - CLI for deploying Workers
- **Python 3.x** - For the batch generation script

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works!)
- Python 3.x (for the bulk generation script)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd ai-feedback-generator
npm install
```

### 2. Set Up Cloudflare

You'll need to connect this project to your Cloudflare account:

```bash
# Login to Cloudflare (opens browser)
npx wrangler login
```

### 3. Create an R2 Bucket

```bash
# Create a bucket for storing feedback
npx wrangler r2 bucket create audio-uploads
```

> 💡 **Note**: The bucket name "audio-uploads" is hardcoded in `wrangler.jsonc`. You can change it there if you want a different name.

### 4. Customize for Your Product

Before running, edit `src/index.js` to describe your product. Find the `context` variable (around line 26) and update it:

```javascript
const context = `[DESCRIBE YOUR PRODUCT HERE]
Example: "Our app is a mobile training platform that helps teams improve skills 
through AI-driven scenarios. It includes admin dashboards, mobile reference tools, 
and data integration capabilities."`;
```

**Tips for writing good context:**
- Describe what your product does in 2-3 sentences
- Mention key features users would give feedback on
- Include your target audience/user types
- Be specific enough to generate relevant feedback

### 5. Run Locally

```bash
npm run dev
```

Your API will be available at `http://localhost:8787`

### 5. Test It Out

```bash
# Generate 5 feedbacks
curl -X POST http://localhost:8787/generate \
  -H "Content-Type: application/json" \
  -d '{"count": 5}'

# Check progress
curl http://localhost:8787/progress

# List all feedbacks
curl http://localhost:8787/list
```

### 6. Deploy to Production

```bash
npm run deploy
```

After deployment, Wrangler will give you a URL like:
```
https://feedback-generator.<your-subdomain>.workers.dev
```

---

## 📡 API Reference

### `POST /generate`

Generate new feedbacks using AI.

**Request Body:**
```json
{
  "count": 10
}
```
- `count` (optional): Number of feedbacks to generate. Default: 10

**Response:**
```json
{
  "success": true,
  "generated": 10,
  "totalCount": 10,
  "feedbacks": [
    {
      "id": 1,
      "feedback": "Love the app! The scenarios feel so real.",
      "timestamp": "2024-11-11T12:00:00.000Z"
    }
  ]
}
```

### `GET /progress`

Check how many feedbacks have been generated.

**Response:**
```json
{
  "count": 10,
  "progress": "1.00%",
  "lastUpdated": "2024-11-11T12:00:00.000Z"
}
```

### `GET /list`

List all feedback files in R2.

**Response:**
```json
{
  "count": 10,
  "files": [
    "mock_feedback/feedback_0001.json",
    "mock_feedback/feedback_0002.json"
  ]
}
```

### `GET /`

Returns API information and available endpoints.

---

## 🔄 Generating Feedbacks in Bulk

The `generate_feedbacks.py` script automates the process of generating large batches of feedback.

### How to Use

1. Make sure your worker is running (locally or deployed):
```bash
# For local development
npm run dev

# OR deploy first
npm run deploy
```

2. Update the `WORKER_URL` in `generate_feedbacks.py`:
```python
# For local development:
WORKER_URL = "http://localhost:8787"

# For production:
WORKER_URL = "https://feedback-generator.<your-subdomain>.workers.dev"
```

3. Run the script:
```bash
python generate_feedbacks.py
```

### What It Does

- Generates feedbacks in batches of 10 (configurable via `BATCH_SIZE`)
- Targets 1,000 total feedbacks (configurable via `TARGET`)
- Adds a 2-second delay between batches to avoid rate limits
- Shows progress with emojis 🎉

### Customizing the Script

```python
TARGET = 500        # Change total number of feedbacks
BATCH_SIZE = 5      # Change batch size
time.sleep(2)       # Change delay between batches
```

---

## 📁 Project Structure

```
ai-feedback-generator/
├── src/
│   └── index.js              # Main Worker code (API endpoints)
├── test/
│   └── index.spec.js         # Vitest tests (starter template)
├── node_modules/             # Dependencies
├── generate_feedbacks.py     # Python script for bulk generation
├── package.json              # Node.js dependencies and scripts
├── wrangler.jsonc            # Cloudflare Worker configuration
└── vitest.config.js          # Test configuration
```

### Key Files

- **`src/index.js`**: Contains all API logic
  - `generateFeedback()` - Calls AI and stores results
  - `getProgress()` - Reads metadata from R2
  - `listFeedbacks()` - Lists all feedback files

- **`wrangler.jsonc`**: Configuration for:
  - Worker name: `feedback-generator`
  - AI binding: `AI`
  - R2 bucket: `audio-uploads`

- **`generate_feedbacks.py`**: Automation script for bulk generation

---

## 🧠 How It Works

### 1. Feedback Generation Flow

```
User Request → Worker → Cloudflare AI (Llama 3.1) → R2 Storage
```

1. **Receive Request**: Worker gets a POST to `/generate` with `count`
2. **Check Metadata**: Reads `mock_feedback/metadata.json` from R2 to get current count
3. **Generate Loop**: For each feedback needed:
   - Construct a unique prompt with context about First Pro
   - Call Cloudflare AI with the prompt
   - Store result as `feedback_XXXX.json` in R2
4. **Update Metadata**: Increment count and timestamp
5. **Return Response**: Send back generated feedbacks to client

### 2. Data Storage Format

**Metadata File** (`mock_feedback/metadata.json`):
```json
{
  "count": 100,
  "lastUpdated": "2024-11-11T12:00:00.000Z"
}
```

**Individual Feedback** (`mock_feedback/feedback_0001.json`):
```json
{
  "id": 1,
  "feedback": "Love the app! The quick scenarios are perfect for our busy team.",
  "timestamp": "2024-11-11T12:00:00.000Z"
}
```

### 3. AI Prompt Engineering

The prompt includes:
- **Context** about your product (what it does, who uses it) - *customize this in `src/index.js`*
- **Instructions** to vary user type and tone
- **Examples** of the desired style
- **Uniqueness** via feedback ID number

This ensures diverse, realistic feedback that sounds like real users.

> 💡 **Tip**: Edit the `context` variable in `src/index.js` to describe your own product and get feedback tailored to your use case!

---

## 🎨 Customization Ideas

Here are some ways you could extend this project:

### Easy

- **Customize for your product**: Edit the `context` variable in `src/index.js` to describe your own product/service
- **Change the target count**: Modify `TARGET` in the Python script or check against a different number in progress endpoint
- **Adjust batch size**: Change `BATCH_SIZE` to generate more/fewer at once
- **Different AI model**: Try other models like `@cf/meta/llama-3-8b-instruct` or `@cf/mistral/mistral-7b-instruct-v0.1`

### Moderate

- **Add filtering**: Create an endpoint to filter feedbacks by sentiment, length, or keywords
- **Export functionality**: Add an endpoint to export all feedbacks as CSV or single JSON file
- **Sentiment analysis**: Use AI to analyze and tag each feedback with sentiment scores
- **Search**: Implement keyword search across all feedbacks

### Advanced

- **User authentication**: Add API keys or authentication to protect endpoints
- **Rate limiting**: Implement rate limiting to prevent abuse
- **Database integration**: Store feedbacks in D1 (Cloudflare's SQL database) instead of R2
- **Analytics dashboard**: Build a frontend that visualizes feedback trends
- **Webhook notifications**: Notify a Slack channel when new feedback is generated

---

## 🐛 Troubleshooting

### "Error: R2 bucket not found"

**Solution**: Create the bucket first:
```bash
npx wrangler r2 bucket create audio-uploads
```

### "Error: AI binding not available"

**Solution**: Make sure your Cloudflare account has Workers AI enabled. It's included in the free tier but may need to be activated in the dashboard.

### Python script can't connect

**Solution**: 
1. Make sure the worker is running (`npm run dev` or deployed)
2. Check the `WORKER_URL` in `generate_feedbacks.py` matches your worker URL
3. For local development, use `http://localhost:8787`

### Feedback looks repetitive

**Solution**: The AI model can sometimes generate similar responses. Try:
- Increasing the variety in your prompt
- Using a different model
- Adding more example feedback in the prompt

### "Error: Too many requests"

**Solution**: 
- Increase the delay in `generate_feedbacks.py`: `time.sleep(5)`
- Reduce batch size: `BATCH_SIZE = 5`
- Cloudflare has rate limits on AI inference in the free tier

---

## 🤝 Contributing

This is a prototype/learning project, so contributions and improvements are welcome!

### Ideas for Contributions

- Add tests for the API endpoints
- Improve the AI prompt for more diverse feedback
- Create a simple web UI for generating/viewing feedback
- Add TypeScript types
- Implement the "Customization Ideas" above
- Better error handling and validation
- Documentation improvements

### How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test locally: `npm run dev`
5. Commit: `git commit -m 'Add some amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

---

## 📚 Learn More

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
- [R2 Storage Docs](https://developers.cloudflare.com/r2/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)

---

## 📝 License

This is a student prototype project - feel free to use, modify, and learn from it!

---

## 🙏 Acknowledgments

- Uses Cloudflare's generous free tier
- AI model: Meta's Llama 3.1 8B Instruct
- Inspired by the need for realistic test data in product development

---

**Questions or ideas?** Open an issue or submit a PR. This is a learning project, so all skill levels are welcome! 🚀