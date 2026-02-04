// Side Panel Script for raw.data
// This is the same as popup.js but optimized for side panel

let lastScanResult = null;

// DOM Elements
const quickScanBtn = document.getElementById('quickScan');
const fullScanBtn = document.getElementById('fullScan');
const deepScanBtn = document.getElementById('deepScan');
const overlayToggle = document.getElementById('overlayToggle');
const clearOverlayLink = document.getElementById('clearOverlay');
const openChatBtn = document.getElementById('openChat');
const openHistoryBtn = document.getElementById('openHistory');
const resultsSection = document.getElementById('results');
const elementsCount = document.getElementById('elementsCount');
const resultsPreview = document.getElementById('resultsPreview');
const copyJsonBtn = document.getElementById('copyJson');
const copyForAIBtn = document.getElementById('copyForAI');
const getLinkBtn = document.getElementById('getLink');
const statusText = document.querySelector('.status-text');

// Server configuration
const SERVER_URL = 'https://api.rawdata.pro';

// History configuration
const HISTORY_KEY = 'scanHistory';
const MAX_HISTORY = 10;

// UI State persistence key
const UI_STATE_KEY = 'currentUIState';

// Check if Deep Scan is available for current site
function isDeepScanAvailable(url) {
  if (!url) return false;
  
  const hostname = new URL(url).hostname.toLowerCase();
  
  // GitHub
  if (hostname === 'github.com' || hostname === 'www.github.com') return true;
  
  // Blockchain explorers
  if (hostname.includes('etherscan.io')) return true; // Etherscan (ETH)
  if (hostname.includes('bscscan.com')) return true; // BSCScan (BSC)
  if (hostname.includes('polygonscan.com')) return true; // Polygonscan
  if (hostname.includes('arbiscan.io')) return true; // Arbiscan
  if (hostname.includes('optimistic.etherscan.io')) return true; // Optimism
  if (hostname.includes('solscan.io')) return true; // Solscan (Solana)
  
  return false;
}

// Save UI State to storage
async function saveUIState() {
  const state = {
    lastScanResult,
    resultsVisible: resultsSection.style.display !== 'none',
    resultsHTML: resultsPreview.innerHTML,
    elementCountText: elementsCount.textContent,
    timestamp: Date.now()
  };
  await chrome.storage.local.set({ [UI_STATE_KEY]: state });
  console.log('[raw.data] UI state saved');
}

// Restore UI State from storage
async function restoreUIState() {
  const { [UI_STATE_KEY]: state } = await chrome.storage.local.get(UI_STATE_KEY);
  
  if (state && state.lastScanResult) {
    // Only restore if less than 1 hour old
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - state.timestamp < oneHour) {
      lastScanResult = state.lastScanResult;
      
      if (state.resultsVisible) {
        resultsSection.style.display = 'block';
        resultsPreview.innerHTML = state.resultsHTML;
        elementsCount.textContent = state.elementCountText;
        console.log('[raw.data] UI state restored');
      }
    } else {
      // Clear old state
      await chrome.storage.local.remove(UI_STATE_KEY);
      console.log('[raw.data] Old UI state cleared');
    }
  }
}

// Event delegation for dynamic buttons in results
resultsPreview.addEventListener('click', async (e) => {
  // Handle "Ask follow-up questions" button
  if (e.target.classList.contains('ai-chat-btn') || e.target.closest('.ai-chat-btn')) {
    const button = e.target.classList.contains('ai-chat-btn') ? e.target : e.target.closest('.ai-chat-btn');
    if (!lastScanResult) return;
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    try {
      // Get AI summary text
      const summaryEl = document.getElementById('aiSummaryContent');
      const summaryText = summaryEl?.textContent || '';
      
      // Send scan data and summary to chat
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'toggleChat',
        scanData: lastScanResult,
        initialSummary: summaryText
      });
      window.close();
    } catch (e) {
      // Content script not loaded, inject it
      if (e.message.includes('Receiving end does not exist')) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['src/content/content.js', 'src/content/chat.js']
          });
          
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['src/content/content.css', 'src/content/chat.css']
          });
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const summaryEl = document.getElementById('aiSummaryContent');
          const summaryText = summaryEl?.textContent || '';
          
          await chrome.tabs.sendMessage(tab.id, { 
            action: 'toggleChat',
            scanData: lastScanResult,
            initialSummary: summaryText
          });
          window.close();
        } catch (injectError) {
          console.error('Failed to inject chat:', injectError);
          alert('Failed to open chat. Please refresh the page and try again.');
        }
      }
    }
  }
  
  // Handle "View full report" button for Code Analysis
  if (e.target.classList.contains('code-analysis-expand') || e.target.closest('.code-analysis-expand')) {
    const button = e.target.classList.contains('code-analysis-expand') ? e.target : e.target.closest('.code-analysis-expand');
    const fullReport = button.parentElement.querySelector('.code-analysis-full');
    
    if (fullReport) {
      if (fullReport.style.display === 'none' || !fullReport.style.display) {
        fullReport.style.display = 'block';
        button.textContent = 'Hide full report';
      } else {
        fullReport.style.display = 'none';
        button.textContent = 'View full report';
      }
    }
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Restore previous UI state first
  await restoreUIState();
  
  // Load overlay toggle state
  const { overlayEnabled } = await chrome.storage.local.get('overlayEnabled');
  overlayToggle.checked = overlayEnabled !== false; // default true
  
  // Check if Deep Scan is available for current site
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    const deepScanAvailable = isDeepScanAvailable(tab.url);
    
    if (!deepScanAvailable) {
      deepScanBtn.style.display = 'none';
    } else {
      deepScanBtn.style.display = 'flex';
    }
  }
  
  // Initialize settings button
  document.getElementById('openSettings')?.addEventListener('click', () => {
    console.log('[raw.data] Opening settings page...');
    chrome.runtime.openOptionsPage();
  });
  
  // Initialize language selector
  const languageSelector = document.getElementById('languageSelector');
  if (languageSelector) {
    // Load saved language
    const { uiLanguage } = await chrome.storage.local.get('uiLanguage');
    const lang = uiLanguage || 'en';
    languageSelector.value = lang;
    applyLanguage(lang);
    
    // Language change handler
    languageSelector.addEventListener('change', async () => {
      const selectedLang = languageSelector.value;
      console.log('[raw.data] Changing language to:', selectedLang);
      await chrome.storage.local.set({ uiLanguage: selectedLang });
      applyLanguage(selectedLang);
    });
  }
  
  // Toggle Panel Mode (Switch to Popup)
  document.getElementById('togglePanelMode')?.addEventListener('click', async () => {
    console.log('[raw.data] Switching to Popup mode...');
    
    try {
      // Update preference directly
      await chrome.storage.local.set({ useSidePanel: false });
      
      // Update panel behavior
      if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
      }
      
      console.log('[raw.data] ✓ Switched to Popup mode');
      console.log('[raw.data] Click extension icon to open popup');
      
      // Close side panel
      window.close();
    } catch (error) {
      console.error('[raw.data] Failed to switch mode:', error);
    }
  });
});

// Quick Scan
quickScanBtn.addEventListener('click', async () => {
  await performScan('quick');
});

// Full Scan
fullScanBtn.addEventListener('click', async () => {
  await performScan('full');
});

// Deep Scan
deepScanBtn.addEventListener('click', async () => {
  await performScan('deep');
});

// Perform Scan
async function performScan(type) {
  const btn = type === 'quick' ? quickScanBtn : type === 'full' ? fullScanBtn : deepScanBtn;
  
  // Set loading state
  btn.classList.add('loading');
  btn.querySelector('.btn-icon').textContent = '...';
  statusText.textContent = 'Scanning...';
  
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we can scan this page
    if (!tab.url) {
      throw new Error('Cannot access this page');
    }
    
    // Check for restricted pages
    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('edge://') ||
        tab.url.startsWith('about:')) {
      statusText.textContent = 'Cannot scan system pages';
      alert('This extension cannot scan browser system pages (chrome://, edge://, etc.)\n\nPlease try on a regular webpage.');
      return;
    }
    
    // Check Chrome Web Store
    if (tab.url.includes('chrome.google.com/webstore')) {
      statusText.textContent = 'Cannot scan Chrome Web Store';
      alert('Chrome extensions cannot scan the Chrome Web Store.\n\nPlease try on another webpage.');
      return;
    }
    
    // Try to send message to content script
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, {
        action: 'scan',
        type: type,
        showOverlay: overlayToggle.checked
      });
    } catch (error) {
      // Content script not loaded, try to inject it
      if (error.message.includes('Receiving end does not exist')) {
        statusText.textContent = 'Injecting script...';
        
        try {
          // Inject content script
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['src/content/content.js']
          });
          
          // Inject content CSS
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['src/content/content.css']
          });
          
          // Wait a bit for script to initialize
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Try again
          response = await chrome.tabs.sendMessage(tab.id, {
            action: 'scan',
            type: type,
            showOverlay: overlayToggle.checked
          });
        } catch (injectError) {
          console.error('Failed to inject content script:', injectError);
          statusText.textContent = 'Error';
          alert('Failed to scan this page. Please refresh the page and try again.');
          return;
        }
      } else {
        throw error;
      }
    }
    
    if (response && response.success) {
      lastScanResult = response.data;
      showResults(response.data);
      statusText.textContent = 'Scan complete';
      
      // Save to history
      await saveToHistory(response.data, type);
      
      // Auto-generate AI summary for Full/Deep scans
      if (type === 'full' || type === 'deep') {
        await generateAISummary(response.data, type);
      }
    } else {
      statusText.textContent = 'Scan failed';
      console.error('Scan failed:', response?.error);
    }
  } catch (error) {
    console.error('Error during scan:', error);
    statusText.textContent = 'Error';
    alert('Scan error: ' + error.message);
  } finally {
  // Reset button
  btn.classList.remove('loading');
  btn.querySelector('.btn-icon').textContent = type === 'quick' ? '>' : type === 'full' ? '>>' : '>>>';
}
}

// Show Results
async function showResults(data) {
  resultsSection.style.display = 'block';
  
  const totalElements = (data.ui_elements?.length || 0);
  const scanType = data.meta?.scan_type || 'quick';
  
  // Check if this is a PDF
  const isPDF = data.content?.pdf === true;
  
  // Update count with scan type
  if (isPDF) {
    elementsCount.textContent = `PDF Document (${scanType})`;
  } else {
    elementsCount.textContent = `${totalElements} elements (${scanType})`;
  }
  
  // Build detailed preview
  let previewHTML = '';
  
  // PDF-specific display
  if (isPDF) {
    previewHTML += `<div class="preview-section">`;
    previewHTML += `<div class="preview-label">Document Type:</div>`;
    previewHTML += `<div class="preview-value">📄 PDF Document</div>`;
    previewHTML += `</div>`;
    
    if (data.content.error) {
      previewHTML += `<div class="preview-section">`;
      previewHTML += `<div class="preview-label">Status:</div>`;
      previewHTML += `<div class="preview-value" style="color: #E8998D;">⚠ ${data.content.error}</div>`;
      previewHTML += `</div>`;
      
      if (data.content.note) {
        previewHTML += `<div class="preview-section">`;
        previewHTML += `<div class="preview-label">Note:</div>`;
        previewHTML += `<div class="preview-value" style="font-size: 11px;">${data.content.note}</div>`;
        previewHTML += `</div>`;
      }
    } else {
      // Show PDF stats
      if (data.content.pages_extracted || data.content.total_pages) {
        previewHTML += `<div class="preview-section">`;
        previewHTML += `<div class="preview-label">Pages:</div>`;
        previewHTML += `<div class="preview-value">`;
        if (data.content.pages_extracted && data.content.total_pages) {
          previewHTML += `${data.content.pages_extracted} / ${data.content.total_pages} extracted`;
        } else if (data.content.total_pages) {
          previewHTML += `${data.content.total_pages} total`;
        } else {
          previewHTML += `${data.content.pages_extracted} extracted`;
        }
        previewHTML += `</div></div>`;
      }
      
      if (data.content.word_count) {
        previewHTML += `<div class="preview-section">`;
        previewHTML += `<div class="preview-label">Words:</div>`;
        previewHTML += `<div class="preview-value">${data.content.word_count.toLocaleString()}</div>`;
        previewHTML += `</div>`;
      }
      
      if (data.content.char_count) {
        previewHTML += `<div class="preview-section">`;
        previewHTML += `<div class="preview-label">Characters:</div>`;
        previewHTML += `<div class="preview-value">${data.content.char_count.toLocaleString()}</div>`;
        previewHTML += `</div>`;
      }
      
      if (data.content.extraction_method) {
        previewHTML += `<div class="preview-section">`;
        previewHTML += `<div class="preview-label">Method:</div>`;
        previewHTML += `<div class="preview-value">${data.content.extraction_method}</div>`;
        previewHTML += `</div>`;
      }
      
      // Show AI Summary for PDFs
      previewHTML += `<div class="preview-section ai-summary-section">`;
      previewHTML += `<div class="preview-label">[AI] Summary:</div>`;
      previewHTML += `<div class="preview-value ai-summary-content" id="aiSummaryContent">`;
      previewHTML += `<div class="ai-summary-loading">Analyzing PDF content with Claude...</div>`;
      previewHTML += `</div></div>`;
    }
  } 
  // Regular HTML page display
  else if (scanType === 'full' || scanType === 'deep' || scanType.includes('_pdf')) {
    // AI Summary placeholder (will be filled later)
    previewHTML += `<div class="preview-section ai-summary-section">`;
    previewHTML += `<div class="preview-label">[AI] Summary:</div>`;
    previewHTML += `<div class="preview-value ai-summary-content" id="aiSummaryContent">`;
    previewHTML += `<div class="ai-summary-loading">Analyzing with Claude Sonnet 4.5...</div>`;
    previewHTML += `</div></div>`;
  } else {
    // For quick scan, show basic info
    previewHTML += `<div class="preview-section">`;
    previewHTML += `<div class="preview-label">URL:</div>`;
    previewHTML += `<div class="preview-value">${data.meta?.url || 'Unknown'}</div>`;
    previewHTML += `</div>`;
    
    previewHTML += `<div class="preview-section">`;
    previewHTML += `<div class="preview-label">Elements:</div>`;
    previewHTML += `<div class="preview-value">${totalElements} found</div>`;
    previewHTML += `</div>`;
  }
  
  resultsPreview.innerHTML = previewHTML;
  
  // Save UI state after showing results
  await saveUIState();
}

// Generate AI Summary
async function generateAISummary(scanData, scanType) {
  const summaryEl = document.getElementById('aiSummaryContent');
  if (!summaryEl) return;
  
  try {
    // Build prompt based on scan type
    let prompt = '';
    
    // Check if this is a PDF
    if (scanData.content?.pdf === true) {
      if (scanData.content.error) {
        summaryEl.innerHTML = `<span style="color: #8A8180;">Could not extract PDF text: ${scanData.content.error}</span>`;
        summaryEl.classList.add('ai-summary-ready');
        return;
      }
      prompt = 'Analyze this PDF document and provide a concise summary (2-3 sentences): What is this document about? What are the key topics or findings?';
    } 
    else if (scanType === 'deep' && scanData.deep_data?.source === 'github') {
      prompt = 'Analyze this GitHub repository and provide a concise summary (2-3 sentences): What is this project? What language/tech stack? What does it do?';
    } else if (scanType === 'deep' && (scanData.deep_data?.source === 'etherscan' || scanData.deep_data?.source === 'solscan')) {
      prompt = 'Analyze this blockchain address and provide a summary: What type of address is this? What activity or balance do you see?';
    } else if (scanType === 'full' || scanType.includes('_pdf')) {
      prompt = 'Analyze this webpage and provide a concise summary (2-3 sentences): What is the main purpose of this page? What key information or actions are available?';
    } else {
      // Should not happen, but fallback
      prompt = 'Analyze this webpage and provide a concise summary.';
    }
    
    // Call Claude via background script
    const response = await chrome.runtime.sendMessage({
      action: 'chatWithClaude',
      message: prompt,
      scanData: scanData,
      history: []
    });
    
    if (response.success) {
      summaryEl.innerHTML = response.message.replace(/\n/g, '<br>');
      summaryEl.classList.add('ai-summary-ready');
      
      // Add "Open Chat" button (event handled by delegation)
      const chatButton = document.createElement('button');
      chatButton.className = 'btn btn-small ai-chat-btn';
      chatButton.innerHTML = '> Ask follow-up questions';
      chatButton.style.marginTop = '10px';
      chatButton.style.width = '100%';
      summaryEl.appendChild(chatButton);
      
      // Add Code Analysis for GitHub repositories
      if (scanType === 'deep' && scanData.deep_data?.source === 'github') {
        await generateCodeAnalysis(scanData.deep_data.data, summaryEl);
      }
      
      // Save UI state after adding the chat button
      await saveUIState();
    } else {
      summaryEl.innerHTML = `<span style="color: #E8998D;">Failed to generate summary: ${response.error}</span>`;
    }
  } catch (error) {
    console.error('AI Summary error:', error);
    summaryEl.innerHTML = `<span style="color: #E8998D;">Error: ${error.message}</span>`;
  }
}

// Generate Code Analysis for GitHub
async function generateCodeAnalysis(repoData, summaryEl) {
  try {
    // Create Code Analysis container
    const analysisContainer = document.createElement('div');
    analysisContainer.className = 'code-analysis';
    analysisContainer.innerHTML = '<div style="color: #8A8180; margin-top: 16px;">Analyzing code...</div>';
    summaryEl.appendChild(analysisContainer);
    
    // Request analysis from background
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeGitHubCode',
      repoData: repoData
    });
    
    if (response.success) {
      const analysis = response.analysis;
      
      // Build compact view HTML
      const statusColors = {
        'RISKY': '#E8998D',
        'MIXED': '#E8B68D',
        'CLEAN': '#8DE89B'
      };
      
      const statusColor = statusColors[analysis.status] || statusColors['MIXED'];
      
      let html = `
        <div class="code-analysis-header">
          <span class="code-analysis-title">Code Analysis</span>
          <span class="code-analysis-status" style="color: ${statusColor}">${analysis.status}</span>
        </div>
        
        <div class="code-analysis-compact">
          <div class="analysis-row">
            <span class="analysis-label">Metrics</span>
            <span class="analysis-value">${analysis.metrics.stars} stars • ${analysis.metrics.forks} forks</span>
          </div>
          
          <div class="analysis-row">
            <span class="analysis-label">Patterns</span>
            <span class="analysis-value">${analysis.patterns.boilerplateScore}% boilerplate detected</span>
          </div>
          
          <div class="analysis-row">
            <span class="analysis-label">AI</span>
            <span class="analysis-value">${analysis.oneLine}</span>
          </div>
      `;
      
      if (analysis.redFlags.length > 0) {
        html += `
          <div class="analysis-row">
            <span class="analysis-label">Flags</span>
            <span class="analysis-value" style="color: ${statusColors['RISKY']}">${analysis.redFlags.join(', ')}</span>
          </div>
        `;
      }
      
      html += `
        </div>
        
        <button class="btn btn-small code-analysis-expand" style="margin-top: 12px; width: 100%;">
          View full report
        </button>
        
        <div class="code-analysis-full" style="display: none; margin-top: 12px;">
          <div class="analysis-section">
            <div class="analysis-section-title">GITHUB METRICS</div>
            <div class="analysis-row">
              <span class="analysis-label">Repository type</span>
              <span class="analysis-value">${analysis.metrics.isFork ? 'Fork' : 'Original'}</span>
            </div>
            <div class="analysis-row">
              <span class="analysis-label">Stars / Forks</span>
              <span class="analysis-value">${analysis.metrics.stars} / ${analysis.metrics.forks}</span>
            </div>
            <div class="analysis-row">
              <span class="analysis-label">Has License</span>
              <span class="analysis-value">${analysis.metrics.hasLicense ? 'Yes' : 'No'}</span>
            </div>
          </div>
          
          <div class="analysis-section">
            <div class="analysis-section-title">CODE PATTERNS</div>
            ${analysis.patterns.genericFiles.length > 0 ? `
            <div class="analysis-row">
              <span class="analysis-label">Generic filenames</span>
              <span class="analysis-value">${analysis.patterns.genericFiles.join(', ')}</span>
            </div>
            ` : ''}
            <div class="analysis-row">
              <span class="analysis-label">Boilerplate matches</span>
              <span class="analysis-value">${analysis.patterns.boilerplateScore}%</span>
            </div>
          </div>
          
          <div class="analysis-section">
            <div class="analysis-section-title">AI ASSESSMENT</div>
            <div class="analysis-text">${analysis.detailed}</div>
          </div>
          
          ${analysis.redFlags.length > 0 ? `
          <div class="analysis-section">
            <div class="analysis-section-title" style="color: ${statusColors['RISKY']}">RED FLAGS</div>
            <ul class="analysis-list">
              ${analysis.redFlags.map(flag => `<li>${flag}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
        </div>
      `;
      
      analysisContainer.innerHTML = html;
      // Event handled by delegation above
      
    } else {
      analysisContainer.innerHTML = `<div style="color: #E8998D; margin-top: 16px;">Code analysis failed: ${response.error}</div>`;
    }
  } catch (error) {
    console.error('Code Analysis error:', error);
  }
}

// Get Link (Upload to server and get shareable link)
getLinkBtn.addEventListener('click', async () => {
  if (!lastScanResult) return;
  
  getLinkBtn.textContent = '...';
  getLinkBtn.disabled = true;
  
  try {
    const response = await fetch(`${SERVER_URL}/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(lastScanResult)
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Copy link to clipboard
    await navigator.clipboard.writeText(data.url);
    
    getLinkBtn.textContent = '> Copied!';
    statusText.textContent = 'Link ready (30 min)';
    
    setTimeout(() => {
      getLinkBtn.textContent = 'Get Link';
      getLinkBtn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Failed to upload scan:', error);
    getLinkBtn.textContent = '> Error';
    statusText.textContent = 'Upload failed';
    
    setTimeout(() => {
      getLinkBtn.textContent = 'Get Link';
      getLinkBtn.disabled = false;
    }, 2000);
  }
});

// Copy for AI (Universal format)
copyForAIBtn.addEventListener('click', async () => {
  if (!lastScanResult) return;
  
  const aiFormat = formatForAI(lastScanResult);
  await navigator.clipboard.writeText(aiFormat);
  copyForAIBtn.textContent = '> Copied!';
  setTimeout(() => {
    copyForAIBtn.textContent = 'Copy for AI';
  }, 1500);
});

// Copy JSON
copyJsonBtn.addEventListener('click', async () => {
  if (!lastScanResult) return;
  
  await navigator.clipboard.writeText(JSON.stringify(lastScanResult, null, 2));
  copyJsonBtn.textContent = '> Copied!';
  setTimeout(() => {
    copyJsonBtn.textContent = 'Raw JSON';
  }, 1500);
});

// Format for AI (Universal - works with any LLM)
function formatForAI(data) {
  // Check if this is a PDF
  if (data.content?.pdf === true) {
    let output = `# PDF Document Scan - AI-Readable Format\n\n`;
    output += `**Source:** ${data.meta?.url || 'Unknown'}\n`;
    output += `**Title:** ${data.meta?.title || 'PDF Document'}\n`;
    output += `**Scanned:** ${new Date(data.meta?.timestamp).toLocaleString()}\n\n`;
    
    if (data.content.error) {
      output += `**Status:** Error - ${data.content.error}\n`;
      if (data.content.note) {
        output += `**Note:** ${data.content.note}\n`;
      }
      return output;
    }
    
    if (data.content.pages_extracted || data.content.total_pages) {
      output += `**Pages:** `;
      if (data.content.pages_extracted && data.content.total_pages) {
        output += `${data.content.pages_extracted} / ${data.content.total_pages} extracted`;
      } else if (data.content.total_pages) {
        output += `${data.content.total_pages} total`;
      } else {
        output += `${data.content.pages_extracted} extracted`;
      }
      output += `\n`;
    }
    
    if (data.content.word_count) {
      output += `**Words:** ${data.content.word_count.toLocaleString()}\n`;
    }
    
    if (data.content.extraction_method) {
      output += `**Extraction Method:** ${data.content.extraction_method}\n`;
    }
    
    output += `\n---\n\n## Document Content\n\n`;
    output += data.content.text || '[No text extracted]';
    output += `\n\n---\n\n`;
    output += `*This document was scanned using raw.data Chrome extension*\n`;
    
    return output;
  }
  
  // Regular HTML page format
  let output = `# Website Scan - AI-Readable Format\n\n`;
  output += `**Source:** ${data.meta?.url || 'Unknown'}\n`;
  output += `**Title:** ${data.meta?.title || 'Unknown'}\n`;
  output += `**Scanned:** ${new Date(data.meta?.timestamp).toLocaleString()}\n\n`;
  
  output += `---\n\n`;
  
  // Page Structure & Content
  if (data.content) {
    output += `## Page Structure\n\n`;
    
    if (data.content.headings && data.content.headings.length > 0) {
      output += `### Headings\n\n`;
      data.content.headings.forEach(h => {
        output += `${'#'.repeat(h.level + 2)} ${h.text}\n`;
      });
      output += `\n`;
    }
    
    if (data.content.main_text) {
      output += `### Main Content\n\n`;
      output += `${data.content.main_text}\n\n`;
    }
    
    if (data.content.tables && data.content.tables.length > 0) {
      output += `### Tables\n\n`;
      data.content.tables.forEach((table, idx) => {
        output += `**Table ${idx + 1}:**\n\n`;
        if (table.headers.length > 0) {
          output += `| ${table.headers.join(' | ')} |\n`;
          output += `| ${table.headers.map(() => '---').join(' | ')} |\n`;
        }
        table.rows.slice(0, 5).forEach(row => {
          output += `| ${row.join(' | ')} |\n`;
        });
        output += `\n`;
      });
    }
  }
  
  // Interactive Elements
  if (data.ui_elements && data.ui_elements.length > 0) {
    output += `## Interactive Elements\n\n`;
    output += `*These are clickable/interactive elements on the page with their identifiers*\n\n`;
    
    const buttons = data.ui_elements.filter(el => el.type === 'button');
    const inputs = data.ui_elements.filter(el => el.type === 'input');
    const links = data.ui_elements.filter(el => el.type === 'link');
    const selects = data.ui_elements.filter(el => el.type === 'select');
    
    if (buttons.length > 0) {
      output += `### Buttons\n\n`;
      buttons.forEach(btn => {
        output += `- **[${btn.id}]** "${btn.text || 'No text'}"`;
        if (btn.state && btn.state !== 'enabled') output += ` (${btn.state})`;
        output += `\n`;
      });
      output += `\n`;
    }
    
    if (inputs.length > 0) {
      output += `### Input Fields\n\n`;
      inputs.forEach(inp => {
        output += `- **[${inp.id}]** ${inp.inputType || 'text'}`;
        if (inp.placeholder) output += ` - "${inp.placeholder}"`;
        output += `\n`;
      });
      output += `\n`;
    }
    
    if (links.length > 0 && links.length <= 20) {
      output += `### Links\n\n`;
      links.forEach(link => {
        output += `- **[${link.id}]** "${link.text}" → ${link.href}\n`;
      });
      output += `\n`;
    }
    
    if (selects.length > 0) {
      output += `### Dropdowns\n\n`;
      selects.forEach(sel => {
        output += `- **[${sel.id}]** ${sel.text || 'Dropdown'}`;
        if (sel.options && sel.options.length > 0) {
          output += ` (${sel.options.slice(0, 3).join(', ')})`;
        }
        output += `\n`;
      });
      output += `\n`;
    }
  }
  
  // Deep Scan Data
  if (data.deep_data && data.deep_data.source) {
    output += `## ${data.deep_data.source.toUpperCase()} Data\n\n`;
    const deepInfo = data.deep_data.data;
    
    if (data.deep_data.source === 'github') {
      if (deepInfo.repo) output += `**Repository:** ${deepInfo.repo}\n`;
      if (deepInfo.files && deepInfo.files.length > 0) {
        output += `\n**Files:**\n`;
        deepInfo.files.slice(0, 50).forEach(f => {
          output += `- ${f.name}\n`;
        });
      }
      if (deepInfo.readme) {
        output += `\n**README:**\n\n${deepInfo.readme}\n`;
      }
    } else if (data.deep_data.source === 'etherscan') {
      if (deepInfo.address) output += `**Address:** ${deepInfo.address}\n`;
      if (deepInfo.balance) output += `**Balance:** ${deepInfo.balance}\n`;
      if (deepInfo.verified !== undefined) output += `**Verified:** ${deepInfo.verified ? 'Yes' : 'No'}\n`;
      if (deepInfo.contract_name) output += `**Contract:** ${deepInfo.contract_name}\n`;
    }
    output += `\n`;
  }
  
  output += `---\n\n`;
  output += `*Scanned with raw.data - AI-readable web extraction*\n`;
  output += `*You can now understand, analyze, or recreate this website*\n`;
  
  return output;
}

// Format for Claude (legacy - keeping for compatibility)
function formatForClaude(data) {
  let prompt = `I'm on a webpage and need your help analyzing it. Here's the structured scan from raw.data extension:\n\n`;
  prompt += `**URL:** ${data.meta?.url || 'Unknown'}\n`;
  prompt += `**Page Title:** ${data.meta?.title || 'Unknown'}\n`;
  prompt += `**Scan Type:** ${data.meta?.scan_type || 'quick'}\n\n`;
  
  if (data.ui_elements?.length > 0) {
    prompt += `**Interactive Elements (${data.ui_elements.length}):**\n`;
    data.ui_elements.forEach(el => {
      prompt += `- [${el.id}] ${el.type}: "${el.text || el.placeholder || 'No text'}"`;
      if (el.href) prompt += ` → ${el.href}`;
      if (el.state && el.state !== 'enabled') prompt += ` (${el.state})`;
      prompt += `\n`;
    });
    prompt += `\n`;
  }
  
  // Add content data (Full Scan)
  if (data.content) {
    if (data.content.headings?.length > 0) {
      prompt += `**Page Headings:**\n`;
      data.content.headings.slice(0, 10).forEach(h => {
        prompt += `${'#'.repeat(h.level)} ${h.text}\n`;
      });
      prompt += `\n`;
    }
    
    if (data.content.main_text) {
      prompt += `**Page Content:**\n${data.content.main_text}\n\n`;
    }
    
    if (data.content.tables?.length > 0) {
      prompt += `**Tables Found:** ${data.content.tables.length} table(s)\n\n`;
    }
    
    if (data.content.displayed_data) {
      const dd = data.content.displayed_data;
      if (dd.prices?.length > 0) prompt += `**Prices:** ${dd.prices.join(', ')}\n`;
      if (dd.percentages?.length > 0) prompt += `**Percentages:** ${dd.percentages.join(', ')}\n`;
      if (dd.crypto_amounts?.length > 0) prompt += `**Crypto:** ${dd.crypto_amounts.join(', ')}\n`;
      if (Object.keys(dd).length > 0) prompt += `\n`;
    }
  }
  
  // Add deep scan data
  if (data.deep_data?.source) {
    prompt += `**Deep Scan Data (${data.deep_data.source.toUpperCase()}):**\n`;
    const deepInfo = data.deep_data.data;
    if (deepInfo.repo) prompt += `Repository: ${deepInfo.repo}\n`;
    if (deepInfo.address) prompt += `Address: ${deepInfo.address}\n`;
    if (deepInfo.balance) prompt += `Balance: ${deepInfo.balance}\n`;
    if (deepInfo.verified !== undefined) prompt += `Verified: ${deepInfo.verified ? 'Yes' : 'No'}\n`;
    if (deepInfo.files?.length) {
      prompt += `Files (${deepInfo.files.length}):\n`;
      deepInfo.files.slice(0, 20).forEach(f => prompt += `  - ${f.name}\n`);
    }
    if (deepInfo.readme) {
      prompt += `\nREADME:\n${deepInfo.readme}\n`;
    }
    prompt += `\n`;
  }
  
  prompt += `**My question:** `;
  
  return prompt;
}

// Format for ChatGPT
function formatForGPT(data) {
  let prompt = `I need help with a webpage. Here's the structured data:\n\n`;
  prompt += `URL: ${data.meta?.url || 'Unknown'}\n`;
  prompt += `Title: ${data.meta?.title || 'Unknown'}\n`;
  prompt += `Scan Type: ${data.meta?.scan_type || 'quick'}\n\n`;
  
  if (data.ui_elements?.length > 0) {
    prompt += `Interactive elements (${data.ui_elements.length}):\n`;
    data.ui_elements.forEach(el => {
      prompt += `• ${el.id} - ${el.type}: "${el.text || el.placeholder || 'No text'}"`;
      if (el.href) prompt += ` (${el.href})`;
      prompt += `\n`;
    });
    prompt += `\n`;
  }
  
  // Add content (Full Scan)
  if (data.content) {
    if (data.content.headings?.length > 0) {
      prompt += `Page headings:\n`;
      data.content.headings.slice(0, 8).forEach(h => {
        prompt += `${'•'.repeat(h.level)} ${h.text}\n`;
      });
      prompt += `\n`;
    }
    
    if (data.content.main_text) {
      prompt += `Page content:\n${data.content.main_text}\n\n`;
    }
    
    if (data.content.displayed_data?.prices?.length > 0) {
      prompt += `Prices found: ${data.content.displayed_data.prices.join(', ')}\n\n`;
    }
  }
  
  // Add deep scan data
  if (data.deep_data?.source) {
    prompt += `Deep scan (${data.deep_data.source}):\n`;
    const deepInfo = data.deep_data.data;
    if (deepInfo.repo) prompt += `- Repository: ${deepInfo.repo}\n`;
    if (deepInfo.address) prompt += `- Address: ${deepInfo.address}\n`;
    if (deepInfo.balance) prompt += `- Balance: ${deepInfo.balance}\n`;
    if (deepInfo.files?.length) prompt += `- Files: ${deepInfo.files.length} found\n`;
    prompt += `\n`;
  }
  
  prompt += `My question: `;
  
  return prompt;
}

// Overlay Toggle
overlayToggle.addEventListener('change', async () => {
  const enabled = overlayToggle.checked;
  await chrome.storage.local.set({ overlayEnabled: enabled });
  
  // Send message to content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.tabs.sendMessage(tab.id, {
      action: 'toggleOverlay',
      enabled: enabled
    });
  } catch (e) {
    // Content script might not be loaded
  }
});

// Clear Overlay
clearOverlayLink.addEventListener('click', async (e) => {
  e.preventDefault();
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.tabs.sendMessage(tab.id, {
      action: 'clearOverlay'
    });
    statusText.textContent = 'Cleared';
    resultsSection.style.display = 'none';
    lastScanResult = null;
  } catch (e) {
    // Content script might not be loaded
  }
});

// Apply language to UI
function applyLanguage(lang) {
  const translations = {
    en: {
      quickScan: 'Quick Scan',
      quickHint: 'UI elements only',
      fullScan: 'Full Scan',
      fullHint: '+ AI Summary',
      deepScan: 'Deep Scan',
      deepHint: '+ AI Analysis',
      translate: 'Translate',
      translateHint: 'AI translation',
      explain: 'Explain Mode',
      explainHint: 'Hover to explain',
      chat: 'AI Chat',
      chatHint: 'Free • Cmd+Shift+K',
      history: 'Scan History',
      historyHint: 'Last 10 scans',
      showLabels: 'Show labels on page',
      scanComplete: 'Scan Complete',
      getLink: 'Get Link',
      copyForAI: 'Copy for AI',
      rawJson: 'Raw JSON',
      clearOverlay: 'Clear overlay',
      ready: 'Ready',
      scanning: 'Scanning...',
      complete: 'Scan complete',
      error: 'Error'
    },
    cn: {
      quickScan: '快速扫描',
      quickHint: '仅UI元素',
      fullScan: '完整扫描',
      fullHint: '+ AI摘要',
      deepScan: '深度扫描',
      deepHint: '+ AI分析',
      translate: '翻译',
      translateHint: 'AI翻译',
      explain: '解释模式',
      explainHint: '悬停解释',
      chat: 'AI聊天',
      chatHint: '免费 • Cmd+Shift+K',
      history: '扫描历史',
      historyHint: '最近10次',
      showLabels: '在页面上显示标签',
      scanComplete: '扫描完成',
      getLink: '获取链接',
      copyForAI: '复制给AI',
      rawJson: '原始JSON',
      clearOverlay: '清除覆盖层',
      ready: '就绪',
      scanning: '扫描中...',
      complete: '扫描完成',
      error: '错误'
    }
  };
  
  const t = translations[lang];
  
  // Update button texts
  const quickScanText = document.querySelector('#quickScan .btn-text');
  if (quickScanText) quickScanText.textContent = t.quickScan;
  const quickScanHint = document.querySelector('#quickScan .btn-hint');
  if (quickScanHint) quickScanHint.textContent = t.quickHint;
  
  const fullScanText = document.querySelector('#fullScan .btn-text');
  if (fullScanText) fullScanText.textContent = t.fullScan;
  const fullScanHint = document.querySelector('#fullScan .btn-hint');
  if (fullScanHint) fullScanHint.textContent = t.fullHint;
  
  const deepScanText = document.querySelector('#deepScan .btn-text');
  if (deepScanText) deepScanText.textContent = t.deepScan;
  const deepScanHint = document.querySelector('#deepScan .btn-hint');
  if (deepScanHint) deepScanHint.textContent = t.deepHint;
  
  const chatText = document.querySelector('#openChat .btn-text');
  if (chatText) chatText.textContent = t.chat;
  const chatHint = document.querySelector('#openChat .btn-hint');
  if (chatHint) chatHint.textContent = t.chatHint;
  
  const historyText = document.querySelector('#openHistory .btn-text');
  if (historyText) historyText.textContent = t.history;
  const historyHint = document.querySelector('#openHistory .btn-hint');
  if (historyHint) historyHint.textContent = t.historyHint;
  
  // Update other UI elements
  const toggleLabel = document.querySelector('.toggle-label');
  if (toggleLabel) toggleLabel.textContent = t.showLabels;
  
  const resultsTitle = document.querySelector('.results-title');
  if (resultsTitle) resultsTitle.textContent = t.scanComplete;
  
  const getLinkBtn = document.getElementById('getLink');
  if (getLinkBtn) getLinkBtn.textContent = t.getLink;
  
  const copyAIBtn = document.getElementById('copyForAI');
  if (copyAIBtn) copyAIBtn.textContent = t.copyForAI;
  
  const copyJsonBtn = document.getElementById('copyJson');
  if (copyJsonBtn) copyJsonBtn.textContent = t.rawJson;
  
  const clearLink = document.getElementById('clearOverlay');
  if (clearLink) clearLink.textContent = t.clearOverlay;
  
  const statusTextEl = document.querySelector('.status-text');
  if (statusTextEl && statusTextEl.textContent === 'Ready' || statusTextEl.textContent === '就绪') {
    statusTextEl.textContent = t.ready;
  }
}

// Open Chat
openChatBtn.addEventListener('click', async () => {
  // Open chat on current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check for restricted pages
  if (tab.url.startsWith('chrome://') || 
      tab.url.startsWith('chrome-extension://') ||
      tab.url.includes('chrome.google.com/webstore')) {
    alert('Chat cannot be opened on browser system pages.');
    return;
  }
  
  try {
    // Send scan data if available
    await chrome.tabs.sendMessage(tab.id, {
      action: 'toggleChat',
      scanData: lastScanResult  // Always pass current scan if available
    });
    window.close(); // Close popup
  } catch (e) {
    console.error('Failed to open chat:', e);
    
    // Content script not loaded, try to inject it
    if (e.message.includes('Receiving end does not exist')) {
      try {
        // Inject content scripts
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/content.js', 'src/content/chat.js']
        });
        
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['src/content/content.css', 'src/content/chat.css']
        });
        
        // Wait for scripts to initialize
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Try again with scan data
        await chrome.tabs.sendMessage(tab.id, {
          action: 'toggleChat',
          scanData: lastScanResult  // Always pass current scan if available
        });
        window.close();
      } catch (injectError) {
        console.error('Failed to inject chat:', injectError);
        alert('Failed to open chat. Please refresh the page and try again.');
      }
    }
  }
});

// Detect page language
async function detectPageLanguage(tabId) {
  try {
    const result = await chrome.tabs.sendMessage(tabId, {
      action: 'getPageLanguage'
    });
    return result.language || 'Unknown';
  } catch (error) {
    console.error('[raw.data] Failed to detect page language:', error);
    return 'Unknown';
  }
}
