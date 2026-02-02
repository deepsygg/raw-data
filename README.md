# raw.data 

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://github.com/deepsygg/raw-data)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green?logo=node.js)](https://nodejs.org/)
[![Claude](https://img.shields.io/badge/AI-Claude%20Sonnet%204.5-orange)](https://www.anthropic.com/)

**Making the web AI-readable** — Chrome extension that converts web pages into structured, AI-readable format.

>  Perfect for AI analysis, automation, testing, and research.

---

##  Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [How to Use](#-how-to-use)
- [Scan Modes](#-scan-modes)
- [PDF Support](#-pdf-support)
- [AI Chat](#-ai-chat)
- [Scan History](#-scan-history)
- [Settings](#-settings)
- [Use Cases](#-use-cases)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

##  Features

###  Three Scan Modes

| Mode | Icon | What it does | Use case |
|------|------|-------------|----------|
| **Quick Scan** | `>` | Extract all UI elements with IDs | Automation, testing, quick analysis |
| **Full Scan** | `>>` | Full content + AI summary | Page analysis, documentation |
| **Deep Scan** | `>>>` | API data + AI analysis | GitHub repos, blockchain explorers |

###  Built-in AI Assistant

-  **Free Claude Sonnet 4.5 chat** (we cover API costs)
-  Automatic AI summaries for Full/Deep scans
-  Keyboard shortcut: `Cmd/Ctrl + Shift + K`
-  Context-aware responses about scanned pages

###  Visual Overlay System

After scanning, see element IDs directly on the page:

```
[BTN-01] Submit Button
[INP-01] Email Input Field
[LINK-01] Homepage Link
```

Perfect for automation and testing!

###  Shareable AI-Readable Links

Generate links in one click that AI can actually read:

- `http://178.18.240.104:3000/scan/:id` - Beautiful HTML view
- `http://178.18.240.104:3000/scan/:id/ai` - Clean Markdown for AI
- `http://178.18.240.104:3000/scan/:id/json` - Raw JSON data

 TTL: 30 minutes

###  PDF Support with OCR

- Extract text from PDF documents
- Handle both text-based and image-based PDFs
- OCR for scanned documents (Tesseract.js)
- Page count, word count, character count

###  Scan History

- Last 10 scans stored locally
- Quick access to previous analyses
- Export and manage history

###  Chrome Side Panel Integration

- Modern side-by-side view
- Toggle between popup and side panel
- Seamless workflow integration

---

##  Installation

### Method 1: Install from Source

1. **Clone the repository:**

```bash
git clone https://github.com/deepsygg/raw-data.git
cd raw-data
```

2. **Open Chrome Extensions page:**

Navigate to: `chrome://extensions/`

Or: Menu () → **More tools** → **Extensions**

3. **Enable Developer Mode:**

Toggle the **"Developer mode"** switch in the top right corner.

4. **Load the extension:**

- Click **"Load unpacked"** button (top left)
- Navigate to the `raw-data` folder
- Select the folder and click **"Select Folder"**

The extension should now appear in your extensions list!

5. **Pin the extension (recommended):**

- Click the **puzzle icon** () in Chrome toolbar
- Find **"raw.data"** in the list
- Click the **pin icon** next to it

Now the extension icon will always be visible in your toolbar!

### Troubleshooting Installation

**Extension doesn't appear:**
- Make sure you selected the correct folder (containing `manifest.json`)
- Check the Extensions page for error messages
- Try disabling and re-enabling the extension

**"Manifest version not supported":**
- Update Chrome to the latest version (88+)
- Chrome must support Manifest V3

**Side Panel not opening:**
- Chrome 114+ required for Side Panel API
- Try switching to Popup mode using the toggle button
- Restart Chrome

---

##  Quick Start

### Step 1: Open a Website

Navigate to any website you want to analyze (e.g., `https://github.com`, `https://docs.anthropic.com`).

### Step 2: Launch raw.data

Click the extension icon in your toolbar.

The extension will open in **Side Panel mode** by default (or Popup mode if Side Panel is unavailable).

### Step 3: Choose Scan Mode

Click one of the scan buttons:

- **`>` Quick Scan** - Fast UI element extraction (5-10 seconds)
- **`>>` Full Scan** - Complete page analysis with AI summary (15-30 seconds)
- **`>>>` Deep Scan** - Advanced scanning for GitHub/Etherscan/etc. (20-40 seconds)

### Step 4: Get Results

After scanning, you can:

- **👁️ View Results** - See extracted elements in the panel
- ** Get Link** - Generate shareable AI-readable URL
- ** Copy for AI** - Copy formatted text to clipboard
- **💾 Raw JSON** - Export raw scan data

### Step 5: Use AI Chat

- Click **"AI Chat"** button
- Or press `Cmd/Ctrl + Shift + K`
- Ask questions about the scanned page!

**Example:**
```
You: What are the main features of this website?
AI: Based on the scan, this website offers...
```

---

##  How to Use

### Scanning a Regular Website

1. Open any website (e.g., `https://docs.anthropic.com`)
2. Click raw.data icon
3. Click **Full Scan (>>)**
4. Wait for results (15-30 seconds)
5. Review the extracted content:
   - UI elements (buttons, inputs, links)
   - Text content (headings, paragraphs)
   - Tables and lists
   - AI-generated summary

### Scanning a PDF Document

1. Open any PDF in Chrome (`file:///...` or online PDF)
2. Click raw.data icon
3. Click **Full Scan (>>)** or **Quick Scan (>)**
4. Wait for extraction (may take longer for large PDFs)
5. See results:
   - Number of pages extracted
   - Word count
   - Character count
   - Extracted text

**Supported:**
- Text-based PDFs (fast extraction)
- Image-based PDFs (OCR with Tesseract.js)
- Mixed PDFs (text + images)

**Limits:**
- Up to 50 pages per scan
- Max 500KB of extracted text
- OCR may take 10-30 seconds for image-heavy PDFs

### Scanning GitHub Repositories

1. Open any GitHub repo (e.g., `https://github.com/torvalds/linux`)
2. Click raw.data icon
3. Click **Deep Scan (>>>)**
4. Wait for API data extraction (20-40 seconds)
5. Get comprehensive analysis:
   - Repository info (stars, forks, language)
   - File structure
   - README content
   - Recent commits
   - Technologies used
   - AI analysis of the project

### Scanning Blockchain Addresses

1. Open blockchain explorer:
   - Etherscan: `https://etherscan.io/address/0x...`
   - BSCScan: `https://bscscan.com/address/0x...`
   - Polygonscan: `https://polygonscan.com/address/0x...`
   - Solscan: `https://solscan.io/account/...`
2. Click raw.data icon
3. Click **Deep Scan (>>>)**
4. Get detailed analysis:
   - Wallet balance
   - Token holdings
   - Transaction history
   - Contract information (if smart contract)
   - AI analysis of activity

### Generating AI-Readable Links

After any scan:

1. Click **"Get Link"** button
2. Wait for upload to server (2-5 seconds)
3. Link is automatically copied to clipboard
4. Paste into Claude/ChatGPT/any AI:

```
You: Analyze this website: http://178.18.240.104:3000/scan/abc123
AI: [AI can now read the full structured content]
```

### Using Overlay Labels

After Quick or Full scan:

1. Toggle **"Show labels on page"** (enabled by default)
2. See colored labels appear on the page:
   -  **Coral** - Buttons
   -  **Blue** - Input fields
   -  **Green** - Links
   -  **Purple** - Dropdowns
   -  **Yellow** - Forms
3. Use IDs for automation:

```javascript
// Playwright example
await page.click('[data-id="BTN-01"]');
      await page.fill('[data-id="INP-01"]', 'test@example.com');
```

---

##  Scan Modes

### Quick Scan `>`

**What it does:**
- Finds all interactive elements (buttons, inputs, links, forms)
- Assigns unique IDs (BTN-01, INP-02, LINK-03)
- Shows overlay labels on the page
- Fast execution (5-10 seconds)

**When to use:**
- Need to understand UI structure quickly
- Planning automation (Puppeteer, Playwright, Selenium)
- Looking for specific elements
- Testing and QA

**Output includes:**
- Element type (button, input, link, etc.)
- Element text/label
- Element attributes (id, class, placeholder, etc.)
- Element position on page
- Total count by type

**Example:**
```json
{
  "ui_elements": [
    {
      "id": "BTN-01",
      "type": "button",
      "text": "Sign In",
      "attributes": { "class": "btn-primary" }
    },
    {
      "id": "INP-01",
      "type": "input",
      "placeholder": "Enter email",
      "attributes": { "type": "email", "name": "email" }
    }
  ]
}
```

### Full Scan `>>`

**What it does:**
- Everything from Quick Scan +
- Extracts all text content
- Parses headings (H1-H6)
- Extracts tables and lists
- Generates **AI Summary** via Claude Sonnet 4.5
- For PDFs: extracts all text with page numbers

**When to use:**
- Need complete page content
- Analyzing articles/documentation
- Want AI analysis of structure
- Creating content summaries
- Cloning website content

**Output includes:**
- All UI elements (from Quick Scan)
- Full text content organized by sections
- Headings hierarchy
- Tables (as structured data)
- Lists (ordered and unordered)
- AI-generated summary (key points, purpose, features)

**Example AI Summary:**
```
"This is Claude API documentation covering:
- Authentication with API keys (X-API-Key header)
- Message streaming for real-time responses
- Token counting and limits (200K context)
- Error handling (rate limits, invalid requests)
- Best practices for prompt engineering

Key endpoints:
- POST /v1/messages - Create message
- POST /v1/complete - Legacy completion
- GET /v1/models - List available models"
```

### Deep Scan `>>>` (Special Sites Only)

**What it does:**
- Everything from Full Scan +
- Fetches additional data via APIs
- Extracts metadata from specialized sites
- Generates **AI Analysis** of the data
- Supports GitHub, blockchain explorers, and more

**Supported sites:**

| Platform | What it extracts |
|----------|------------------|
| **GitHub** | Repo info, stars, forks, languages, file tree, README, commits |
| **Etherscan** | ETH balance, transactions, token holdings, contract info |
| **BSCScan** | BNB balance, BEP-20 tokens, transactions |
| **Polygonscan** | MATIC balance, transactions, contract data |
| **Arbiscan** | Arbitrum data, L2 transactions |
| **Optimism** | Optimism network data |
| **Solscan** | SOL balance, SPL tokens, Solana transactions |

**When to use:**
- Analyzing GitHub repositories
- Researching blockchain addresses
- Understanding smart contracts
- Tracking wallet activity
- Comparing projects

**GitHub Deep Scan Example:**
```json
{
  "deep_scan": {
    "platform": "github",
    "repository": "torvalds/linux",
    "stars": 150000,
    "forks": 40000,
    "language": "C",
    "description": "Linux kernel source tree",
    "topics": ["linux", "kernel", "operating-system"],
    "file_structure": ["arch/", "drivers/", "fs/", ...],
    "recent_commits": 50,
    "contributors": 20000
  },
  "ai_analysis": "The Linux kernel is a massive open-source project..."
}
```

**Blockchain Deep Scan Example:**
```json
{
  "deep_scan": {
    "platform": "etherscan",
    "address": "0x...",
    "balance": "150.5 ETH",
    "transactions": 1234,
    "token_holdings": [
      { "token": "USDC", "amount": "50000" },
      { "token": "USDT", "amount": "25000" }
    ],
    "contract_type": "ERC-721 (NFT Collection)"
  },
  "ai_analysis": "This is an NFT collection contract with significant activity..."
}
```

---

##  PDF Support

### How PDF Extraction Works

raw.data supports two methods for extracting text from PDFs:

1. **Chrome Native Viewer** (fastest)
   - Uses Chrome's built-in PDF rendering
   - Extracts text directly from the DOM
   - Works for text-based PDFs
   - ~1-3 seconds

2. **PDF.js Library** (fallback)
   - Parses PDF files directly
   - Works when Chrome viewer fails
   - Handles complex PDF structures
   - ~3-10 seconds

3. **OCR with Tesseract.js** (for image PDFs)
   - Optical Character Recognition
   - Extracts text from scanned documents
   - Supports image-based PDFs
   - ~10-30 seconds depending on pages

### PDF Scan Output

```json
{
  "meta": {
    "url": "file:///path/to/document.pdf",
    "title": "Research Paper",
    "scan_type": "full_pdf"
  },
  "content": {
    "pdf": true,
    "text": "--- Page 1 ---\nTitle: Research...\n--- Page 2 ---\nAbstract...",
    "word_count": 5234,
    "char_count": 32145,
    "extraction_method": "pdfjs",
    "pages_extracted": 15,
    "total_pages": 15
  }
}
```

### PDF Limitations

- **Page limit:** 50 pages per scan
- **Text limit:** 500KB of extracted text
- **OCR speed:** Image-heavy PDFs take longer
- **Languages:** OCR supports English (more languages can be added)

### Testing PDFs

Try these test PDFs:
- https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
- Any PDF file on your computer (`file:///...`)
- Online documentation PDFs

---

##  AI Chat

### Opening AI Chat

Three ways to open:

1. Click **"AI Chat"** button in the extension
2. Press `Cmd/Ctrl + Shift + K` keyboard shortcut
3. Right-click on page → **"Open AI Chat"** (if enabled)

### How to Use AI Chat

1. **Scan first** (optional but recommended):
   - Quick/Full/Deep scan the page
   - AI will have context about the page

2. **Ask questions:**
   ```
   You: What is this website about?
   You: How do I sign up?
   You: What are the pricing plans?
   You: Summarize this article in 3 bullet points
   ```

3. **AI responds** with context-aware answers based on:
   - Scanned page content
   - UI elements found
   - Page structure
   - Your conversation history

### AI Chat Features

-  **Context-aware** - Understands the current page
-  **Persistent history** - Conversation saved during session
-  **Code generation** - Can write automation scripts
-  **Free to use** - We cover API costs
-  **Claude Sonnet 4.5** - Latest model

### Example Conversations

**Website Analysis:**
```
You: What are the main sections of this page?
AI: Based on the scan, the page has 5 main sections:
    1. Hero section with CTA "Start Free Trial"
    2. Features section (3 feature cards)
    3. Pricing table (3 plans: Free, Pro, Enterprise)
    4. Testimonials (5 customer quotes)
    5. Footer with links and contact form
```

**Automation Help:**
```
You: Write Playwright code to fill the signup form
AI: Here's the code based on the scanned elements:
    
    await page.fill('[data-id="INP-01"]', 'user@example.com');
    await page.fill('[data-id="INP-02"]', 'SecurePass123');
    await page.click('[data-id="BTN-03"]');
```

**Content Summary:**
```
You: Summarize this article in 3 points
AI: Key points from the article:
    • The new AI model achieves 95% accuracy on benchmarks
    • Training time reduced from 10 days to 2 days
    • Open-source release planned for Q2 2025
```

---

##  Scan History

### Viewing History

1. Click **"Scan History"** button in the extension
2. See your last 10 scans with:
   - Website URL
   - Page title
   - Scan type (Quick/Full/Deep)
   - Element count
   - Timestamp

### Managing History

- **View Details** - Click any entry to see full scan results
- **Export** - Download scan as JSON file
- **Delete** - Remove individual scans
- **Clear All** - Delete entire history

### History Storage

- Stored locally in Chrome storage
- Max 10 scans (oldest auto-deleted)
- No server upload (privacy-first)
- Persists across browser restarts

---

##  Settings

### Opening Settings

Click the **gear icon** () in the extension header.

### Available Settings

**1. Interface Language**
- English
- Chinese (中文)

**2. Default Translation Language**
- Set preferred language for future features

**3. OCR Settings**
- Enable/disable OCR for PDFs
- Select OCR language
- Adjust OCR accuracy vs speed

**4. AI Model Selection**
- Currently: Claude Sonnet 4.5
- More models coming soon

**5. Display Settings**
- Overlay label size
- Color scheme
- Animation speed

All settings are saved automatically.

---

##  Use Cases

### 1. AI Website Analysis

**Problem:** AI assistants can't read websites from URLs.

**Solution:** Generate AI-readable links.

```
You: Analyze this site: http://178.18.240.104:3000/scan/abc123
AI: This is a SaaS landing page with:
    - Hero section with CTA "Start Free Trial"
    - 3 feature blocks
    - Pricing table (3 plans: $0, $29, $99/mo)
    - Registration form requiring email + password
    - 14-day free trial offer
```

### 2. Automated Testing & QA

**Problem:** Manual testing is slow and error-prone.

**Solution:** Scan pages to generate test scripts.

```
You: Write Playwright tests for the login flow
AI: Based on the scan:

await test('login flow', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('[data-id="INP-01"]', 'user@test.com');
  await page.fill('[data-id="INP-02"]', 'password123');
  await page.click('[data-id="BTN-01"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### 3. Design Cloning & Research

**Problem:** Recreating a design requires manual inspection.

**Solution:** AI generates code from scanned structure.

```
You: Create a React component for this hero section
AI: Based on the scan:

export default function Hero() {
  return (
    <section className="hero">
      <h1>Transform Your Workflow</h1>
      <p>Automate tasks with AI-powered tools</p>
      <button className="cta">Start Free Trial</button>
    </section>
  );
}
```

### 4. GitHub Repository Research

**Problem:** Understanding large codebases is time-consuming.

**Solution:** Deep scan extracts structure and AI explains it.

```
Deep Scan: github.com/openai/gpt-4

AI Analysis:
"This is a Python-based machine learning project for GPT-4:
• Main training code: src/train.py
• Model architecture: src/model/transformer.py  
• Uses PyTorch, Hugging Face Transformers
• 50K+ lines of code across 200+ files
• Key dependencies: torch, transformers, numpy
• Active development with 500+ commits"
```

### 5. Blockchain Address Analysis

**Problem:** Tracking wallet activity requires multiple tools.

**Solution:** One-click deep scan of any address.

```
Deep Scan: etherscan.io/address/0xabc123...

AI Analysis:
"Smart contract with 150 ETH balance:
• ERC-721 NFT collection (OpenSea compatible)
• 245 transactions in last 30 days  
• Holds 15 different tokens (mainly USDC, WETH)
• Contract verified and open-source
• No suspicious activity detected"
```

### 6. Documentation & Content Research

**Problem:** Reading long documentation is tedious.

**Solution:** AI summarizes with key points.

```
Full Scan: docs.anthropic.com/claude/reference

AI Summary:
"Claude API documentation with 3 main sections:

1. Authentication
   • API key via X-API-Key header
   • Organization ID optional
   
2. Endpoints
   • /v1/messages - Main chat endpoint
   • /v1/complete - Legacy completions
   
3. Models
   • claude-3-opus - Most capable
   • claude-3-sonnet - Balanced
   • claude-3-haiku - Fastest

Rate limits: 60 req/min, 200K tokens context"
```

---

##  Architecture

```
┌─────────────────────────────────────────────────┐
│  Chrome Extension (Client)                      │
│  ┌──────────┬──────────┬────────────┐          │
│  │  Popup   │  Content │ Background │          │
│  │   UI     │  Scanner │   Worker   │          │
│  └──────────┴──────────┴────────────┘          │
└──────────────────┬─────────────────────────────┘
                   │ POST /scan
                   ▼
┌─────────────────────────────────────────────────┐
│  Node.js Server (VPS)                           │
│  📍 http://178.18.240.104:3000                  │
│                                                  │
│  In-memory storage (Map)                        │
│  TTL: 30 minutes                                │
│                                                  │
│  Endpoints:                                     │
│  • POST /scan          → Upload scan data       │
│  • GET  /scan/:id      → HTML view              │
│  • GET  /scan/:id/ai   → Markdown for AI        │
│  • GET  /scan/:id/json → Raw JSON               │
└─────────────────────────────────────────────────┘
```

### Components

**1. Popup/Side Panel (UI)**
- User interface
- Scan controls
- Results display
- Settings access

**2. Content Script (Scanner)**
- DOM traversal
- Element extraction
- PDF parsing
- Overlay rendering

**3. Background Worker (API)**
- Claude API integration
- Server communication
- Message routing
- State management

**4. Node.js Server (Storage)**
- Scan data storage (in-memory)
- Multiple output formats (HTML/Markdown/JSON)
- Auto-cleanup (30min TTL)
- CORS enabled for API access

---

##  Tech Stack

### Chrome Extension

**Core:**
- **Manifest V3** - Latest Chrome Extension standard
- **Vanilla JavaScript** - No frameworks, pure performance
- **Chrome APIs** - tabs, storage, scripting, sidePanel

**Libraries:**
- **PDF.js** (320KB) - PDF document parsing
- **Tesseract.js** - OCR for image-based PDFs
- **Claude API** - Sonnet 4.5 for AI features

**Design:**
- **IBM Plex Mono** - Monospace font
- **Dark theme** - Easy on the eyes
- **Coral accents** (#E8998D) - Brand color
- **SVG icons** - Crisp and scalable

### Server

**Backend:**
- **Node.js 18+** - JavaScript runtime
- **Express** - Fast and minimal web framework
- **CORS** - Cross-origin support
- **PM2** - Process manager (24/7 operation)

**Storage:**
- **In-memory Map** - Fast caching
- **TTL cleanup** - Auto-delete after 30 minutes
- **No database** - Simple and fast

**Deployment:**
- **Ubuntu VPS** - 178.18.240.104
- **PM2 Daemon** - Auto-restart, monitoring
- **Nginx** (optional) - Reverse proxy

---

##  Roadmap

###  Completed Features

- [x] Quick/Full/Deep scan modes
- [x] Visual overlay with element IDs
- [x] Built-in AI chat (Claude Sonnet 4.5)
- [x] Automatic AI summaries
- [x] Server with shareable links (24/7)
- [x] Three output formats (HTML, Markdown, JSON)
- [x] Deep scan: GitHub, Etherscan, BSCScan, Polygonscan, Arbiscan, Optimism, Solscan
- [x] Export options: Copy for AI, Raw JSON, Get Link
- [x] Keyboard shortcuts (Cmd/Ctrl + Shift + K)
- [x] Free API (we cover costs)
- [x] Scan history (last 10 scans)
- [x] Chrome Side Panel integration
- [x] PDF support with OCR
- [x] Settings page
- [x] Multi-language UI (English, Chinese)

### 🔜 Coming Soon

The extension displays a preview of these upcoming features:

**1.  Scam Detector**
- AI-powered scam and phishing detection
- Real-time website legitimacy analysis
- Fake login form detection
- Contract security warnings
- Domain reputation checking

**2.  Macro Recorder**
- Record and replay user actions
- Save macros for later use
- Edit recorded actions
- Loop and conditional execution
- Export/import macros

**3.  Action Mode**
- AI-assisted task automation
- Natural language commands
- Smart form filling
- One-click complex workflows
- Integration with macro recorder

**4.  Auto-fill Forms**
- Intelligent form auto-completion
- Profile-based auto-fill
- AI-powered field detection
- Multiple profile support
- Secure data storage

**5.  Wallet Context**
- Web3 wallet integration
- Wallet balance display
- Transaction simulation
- Gas optimization suggestions
- Token approval warnings

**6.  Site Cloner**
- Clone and save website states
- Full page download
- Assets preservation
- Interactive clone preview
- Export as HTML/PDF

###  Long-term Plans

- [ ] More deep scan integrations (Twitter, LinkedIn, Reddit)
- [ ] Browser history analysis
- [ ] Batch scanning (multiple pages)
- [ ] Custom AI prompts
- [ ] Export to PDF/CSV
- [ ] Chrome Web Store publication
- [ ] Firefox extension
- [ ] Edge extension

---

##  Contributing

Contributions are welcome! For major changes, please open an issue first.

### How to Contribute

1. **Fork the project**
2. **Create your feature branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Commit your changes:**
   ```bash
   git commit -m 'feat: Add amazing feature'
   ```
6. **Push to the branch:**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Setup

1. Clone the repository
2. Load extension in Chrome (Developer mode)
3. Make changes to the code
4. Reload extension to test (`chrome://extensions/` → Reload)
5. Check browser console for errors (F12)

### Code Style

- Use ES6+ features (const, let, arrow functions)
- Meaningful variable names
- Comments for complex logic
- Keep functions small and focused
- Use async/await instead of promise chains

### Commit Message Format

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
```

Examples:
```
feat(scanner): Add support for Shadow DOM elements
fix(chat): Prevent duplicate messages in AI chat
docs(readme): Update installation instructions
```

---

##  License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2025 raw.data team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

##  Credits

**Made by the raw.data team**

Powered by:
- [Claude](https://www.anthropic.com/) (Anthropic) - AI capabilities
- [Node.js](https://nodejs.org/) - Server runtime
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/) - Browser integration
- [PDF.js](https://mozilla.github.io/pdf.js/) (Mozilla) - PDF parsing
- [Tesseract.js](https://tesseract.projectnaptha.com/) - OCR technology

---

##  Support

If you find this project useful:

-  **Star** this repo
-  **Report bugs** via [Issues](https://github.com/deepsygg/raw-data/issues)
-  **Suggest features** via [Issues](https://github.com/deepsygg/raw-data/issues)
-  **Contribute** via Pull Requests
-  **Share** with others who might find it useful

---

##  Contact

- **Issues:** [GitHub Issues](https://github.com/deepsygg/raw-data/issues)
- **Email:** support@ (optional)

---

<div align="center">

**raw.data** - Making the web AI-readable 

*Bridge between humans, machines, and AI*

[Report Bug](https://github.com/deepsygg/raw-data/issues) • [Request Feature](https://github.com/deepsygg/raw-data/issues)

Made with  by the raw.data team

</div>
