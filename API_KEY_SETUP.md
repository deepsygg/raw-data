# API Key Setup

⚠️ **Important:** The Claude API key has been removed from the public code for security.

## For Development

1. Open `src/background/background.js`
2. Find lines with `YOUR_CLAUDE_API_KEY_HERE`
3. Replace with your actual API key from https://console.anthropic.com/

Example:
```javascript
const claudeApiKey = 'sk-ant-api03-your-key-here';
```

## For Users

If you're a user installing this extension:
- The maintainers will provide instructions for API key setup
- Or the extension will be updated to use a backend proxy
- Check the README for the latest setup instructions

## Security Note

Never commit real API keys to public repositories!
