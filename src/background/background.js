// raw.data Background Service Worker

// Configure panel behavior
async function configurePanelBehavior() {
  let { useSidePanel } = await chrome.storage.local.get('useSidePanel');
  
  // If not set, default to true (Side Panel)
  if (useSidePanel === undefined || useSidePanel === null) {
    useSidePanel = true;
    await chrome.storage.local.set({ useSidePanel: true });
    console.log('[raw.data] No preference found, defaulting to Side Panel');
  }
  
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: useSidePanel });
    console.log('[raw.data] Panel mode set to:', useSidePanel ? 'Side Panel' : 'Popup');
  }
}

// Handle extension install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('raw.data extension installed');
    
    // Set default settings
    chrome.storage.local.set({
      overlayEnabled: true,
      scanHistory: [],
      useSidePanel: true, // Default to side panel
      settings: {
        autoScan: false,
        showNotifications: true
      }
    });
  }
  
  // Configure side panel behavior
  await configurePanelBehavior();
  
  // Create context menu (unified with install handler)
  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: 'rawdata-scan',
      title: 'Scan with raw.data',
      contexts: ['page']
    });
  }
});

// Handle browser startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('[raw.data] Browser started, configuring panel behavior');
  await configurePanelBehavior();
});

// Handle context menu clicks
if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'rawdata-scan') {
      chrome.tabs.sendMessage(tab.id, {
        action: 'scan',
        type: 'quick',
        showOverlay: true
      });
    }
  });
}

// Handle messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle chat with Claude
  if (request.action === 'chatWithClaude') {
    handleClaudeChat(request.message, request.scanData, request.history)
      .then(response => sendResponse({ success: true, message: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open
  }
  
  // Handle API requests (for future server integration)
  if (request.action === 'sendToServer') {
    sendToServer(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open
  }
  
  // Handle getting scan link
  if (request.action === 'getScanLink') {
    generateScanLink(request.data)
      .then(link => sendResponse({ success: true, link: link }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // Handle panel mode update
  if (request.action === 'updatePanelMode' || request.action === 'togglePanelMode') {
    updatePanelMode(request.useSidePanel)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // Handle GitHub Code Analysis
  if (request.action === 'analyzeGitHubCode') {
    analyzeGitHubCode(request.repoData)
      .then(analysis => sendResponse({ success: true, analysis: analysis }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Handle Claude Chat
async function handleClaudeChat(userMessage, scanData, history) {
  // TODO: Replace with your Claude API key from https://console.anthropic.com/
  // Or implement user-provided API key via settings page
  const claudeApiKey = 'YOUR_CLAUDE_API_KEY_HERE';
  const model = 'claude-sonnet-4-5-20250929'; // Claude Sonnet 4.5
  
  // Build system prompt with scan context
  let systemPrompt = `You are raw.data AI assistant. You can see and analyze webpages through structured scan data.

**Current Page Context:**
URL: ${scanData?.meta?.url || 'Unknown'}
Title: ${scanData?.meta?.title || 'Unknown'}

`;

  // Add UI elements context
  if (scanData?.ui_elements && scanData.ui_elements.length > 0) {
    systemPrompt += `**Interactive Elements on Page:**\n`;
    scanData.ui_elements.forEach(el => {
      systemPrompt += `- [${el.id}] ${el.type}: "${el.text || el.placeholder || 'No text'}"`;
      if (el.href) systemPrompt += ` → ${el.href}`;
      if (el.state && el.state !== 'enabled') systemPrompt += ` (${el.state})`;
      systemPrompt += `\n`;
    });
    systemPrompt += `\n`;
  }
  
  // Add page content
  if (scanData?.content) {
    if (scanData.content.headings && scanData.content.headings.length > 0) {
      systemPrompt += `**Page Structure:**\n`;
      scanData.content.headings.slice(0, 10).forEach(h => {
        systemPrompt += `${'#'.repeat(h.level)} ${h.text}\n`;
      });
      systemPrompt += `\n`;
    }
    
    if (scanData.content.main_text) {
      systemPrompt += `**Page Content:**\n${scanData.content.main_text}\n\n`;
    }
  }
  
  // Add deep scan data
  if (scanData?.deep_data?.source) {
    systemPrompt += `**Special Data (${scanData.deep_data.source}):**\n`;
    const deepInfo = scanData.deep_data.data;
    if (deepInfo.repo) systemPrompt += `Repository: ${deepInfo.repo}\n`;
    if (deepInfo.address) systemPrompt += `Address: ${deepInfo.address}\n`;
    if (deepInfo.balance) systemPrompt += `Balance: ${deepInfo.balance}\n`;
    if (deepInfo.files && deepInfo.files.length > 0) {
      systemPrompt += `\nFiles in repository:\n`;
      deepInfo.files.slice(0, 30).forEach(f => {
        systemPrompt += `- ${f.name}\n`;
      });
    }
    if (deepInfo.readme) {
      systemPrompt += `\nREADME:\n${deepInfo.readme}\n`;
    }
    systemPrompt += `\n`;
  }
  
  systemPrompt += `**Instructions:**
- Help users understand and navigate this webpage
- Reference elements by their IDs (e.g., BTN-01, LINK-05) when relevant
- Be concise and helpful
- If asked about actions, explain what elements can do
- For GitHub repos, provide summaries and insights about the codebase`;

  // Build messages array
  const messages = [];
  
  // Add conversation history (last 10 messages to stay within limits)
  const recentHistory = history.slice(-10);
  recentHistory.forEach(msg => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
  });
  
  // Add current user message (if not already in history)
  if (!recentHistory.length || recentHistory[recentHistory.length - 1].content !== userMessage) {
    messages.push({
      role: 'user',
      content: userMessage
    });
  }
  
  // Call Claude API
  try {
    const requestBody = {
      model: model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages
    };
    
    console.log('[raw.data] Sending request to Claude API...');
    console.log('[raw.data] Model:', model);
    console.log('[raw.data] Messages count:', messages.length);
    console.log('[raw.data] API key starts with:', claudeApiKey.substring(0, 15));
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('[raw.data] Response status:', response.status);
    console.log('[raw.data] Response headers:', Object.fromEntries(response.headers));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[raw.data] API Error - Full response:', errorText);
      
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error('[raw.data] Could not parse error as JSON');
      }
      
      console.error('[raw.data] Parsed error data:', errorData);
      
      // Handle specific error codes
      if (response.status === 401) {
        throw new Error(`Invalid API key: ${errorData.error?.message || 'Authentication failed'}`);
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 500) {
        throw new Error('Claude API is temporarily unavailable. Try again later.');
      }
      
      throw new Error(errorData.error?.message || `API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response from Claude API');
    }
    
    return data.content[0].text;
    
  } catch (error) {
    console.error('[raw.data] Claude API error:', error);
    throw error;
  }
}

// Send scan data to server (placeholder for future)
async function sendToServer(data) {
  // TODO: Implement when server is ready
  // const response = await fetch('https://api.rawdata.app/scan', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data)
  // });
  // return response.json();
  
  // For now, just return a mock response
  return {
    id: 'local_' + Date.now(),
    message: 'Server integration not yet implemented'
  };
}

// Generate shareable link (placeholder for future)
async function generateScanLink(data) {
  // TODO: Implement when server is ready
  // For now, return a data URL or local storage key
  
  const scanId = 'scan_' + Date.now();
  
  // Store locally for now
  await chrome.storage.local.set({ [scanId]: data });
  
  return `local://${scanId}`;
}

// Update panel mode (side panel vs popup)
async function updatePanelMode(useSidePanel) {
  try {
    // Save preference
    await chrome.storage.local.set({ useSidePanel });
    console.log('[raw.data] Saved preference:', useSidePanel ? 'Side Panel' : 'Popup');
    
    // Update panel behavior
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ 
        openPanelOnActionClick: useSidePanel 
      });
      console.log('[raw.data] Panel behavior updated:', useSidePanel ? 'Side Panel' : 'Popup');
      console.log('[raw.data] Next click will open:', useSidePanel ? 'Side Panel' : 'Popup');
    }
  } catch (error) {
    console.error('[raw.data] Failed to update panel mode:', error);
    throw error;
  }
}

// Analyze GitHub repository code
async function analyzeGitHubCode(repoData) {
  const claudeApiKey = 'YOUR_CLAUDE_API_KEY_HERE';
  
  // Build analysis prompt
  const prompt = `Analyze this GitHub repository for code quality and legitimacy. Be concise and direct.

REPOSITORY: ${repoData.repo}
METRICS:
- Stars: ${repoData.metrics?.stars || 0}
- Forks: ${repoData.metrics?.forks || 0}
- Is Fork: ${repoData.metrics?.isFork ? 'Yes' : 'No'}
- Has License: ${repoData.metrics?.hasLicense ? 'Yes' : 'No'}

FILES (${repoData.files?.length || 0} total):
${repoData.files?.slice(0, 30).map(f => f.name).join(', ')}

CODE PATTERNS:
- Generic filenames: ${repoData.codePatterns?.genericFiles?.join(', ') || 'None'}
- Boilerplate score: ${repoData.codePatterns?.boilerplateScore || 0}%
- Suspicious patterns: ${repoData.codePatterns?.suspiciousPatterns?.join(', ') || 'None'}

README SAMPLE:
${repoData.readme?.substring(0, 500) || 'No README'}

Provide:
1. ONE-LINE ASSESSMENT (max 80 chars): Quick verdict on code legitimacy
2. DETAILED ASSESSMENT (2-3 sentences): Code originality, quality, concerns
3. STATUS: RISKY, MIXED, or CLEAN
4. RED FLAGS: List specific issues (or "None" if clean)

Format:
ONE_LINE: [your assessment]
DETAILED: [your assessment]
STATUS: [RISKY/MIXED/CLEAN]
RED_FLAGS: [comma-separated list or "None"]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }
    
    const data = await response.json();
    const aiResponse = data.content[0].text.trim();
    
    // Parse AI response
    const analysis = parseCodeAnalysis(aiResponse, repoData);
    
    return analysis;
    
  } catch (error) {
    console.error('[raw.data] Code analysis error:', error);
    throw error;
  }
}

// Parse AI analysis response
function parseCodeAnalysis(aiResponse, repoData) {
  const lines = aiResponse.split('\n');
  let oneLine = '';
  let detailed = '';
  let status = 'MIXED';
  let redFlags = [];
  
  lines.forEach(line => {
    if (line.startsWith('ONE_LINE:')) {
      oneLine = line.substring(9).trim();
    } else if (line.startsWith('DETAILED:')) {
      detailed = line.substring(9).trim();
    } else if (line.startsWith('STATUS:')) {
      status = line.substring(7).trim().toUpperCase();
      if (!['RISKY', 'MIXED', 'CLEAN'].includes(status)) {
        status = 'MIXED';
      }
    } else if (line.startsWith('RED_FLAGS:')) {
      const flags = line.substring(10).trim();
      if (flags !== 'None' && flags !== 'none') {
        redFlags = flags.split(',').map(f => f.trim()).filter(f => f);
      }
    }
  });
  
  // Add programmatic red flags
  if (!repoData.metrics?.hasLicense) {
    redFlags.push('No license file');
  }
  
  if (repoData.codePatterns?.suspiciousPatterns?.length > 0) {
    redFlags.push(...repoData.codePatterns.suspiciousPatterns);
  }
  
  return {
    status: status,
    oneLine: oneLine || 'Code analysis complete',
    detailed: detailed || 'Repository structure analyzed.',
    redFlags: [...new Set(redFlags)], // Remove duplicates
    metrics: {
      contributors: repoData.metrics?.contributors || 'N/A',
      age: repoData.metrics?.age || 'N/A',
      stars: repoData.metrics?.stars || 0,
      forks: repoData.metrics?.forks || 0,
      isFork: repoData.metrics?.isFork || false,
      hasLicense: repoData.metrics?.hasLicense || false
    },
    patterns: {
      genericFiles: repoData.codePatterns?.genericFiles || [],
      boilerplateScore: repoData.codePatterns?.boilerplateScore || 0
    }
  };
}

console.log('raw.data background service worker loaded');
