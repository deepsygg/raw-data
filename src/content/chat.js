// raw.data Quick Chat - Floating Chat Sidebar

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.rawDataChatInitialized) return;
  window.rawDataChatInitialized = true;
  
  let chatVisible = false;
  let chatContainer = null;
  let messagesContainer = null;
  let inputField = null;
  let currentScanData = null;
  let conversationHistory = [];
  
  // Create chat UI
  function createChatUI() {
    if (chatContainer) return;
    
    chatContainer = document.createElement('div');
    chatContainer.id = 'rawdata-chat';
    chatContainer.className = 'rawdata-chat-container';
    
    chatContainer.innerHTML = `
      <div class="rawdata-chat-header">
        <div class="rawdata-chat-title">
          <span class="rawdata-chat-icon">$</span>
          <span>raw.data AI</span>
          <span class="rawdata-chat-status">Sonnet 4.5</span>
        </div>
        <div class="rawdata-chat-actions">
          <button class="rawdata-chat-btn rawdata-chat-clear" title="Clear chat">X</button>
          <button class="rawdata-chat-btn rawdata-chat-close" title="Close">✕</button>
        </div>
      </div>
      
      <div class="rawdata-chat-messages" id="rawdata-chat-messages">
        <div class="rawdata-chat-welcome">
          <div class="rawdata-chat-welcome-icon">$</div>
          <div class="rawdata-chat-welcome-text">
            AI assistant powered by Claude Sonnet 4.5.<br>
            I can see everything on this page. Ask me anything.
          </div>
          <div class="rawdata-chat-welcome-hints">
            <div class="rawdata-chat-hint">&gt; "What is this page about?"</div>
            <div class="rawdata-chat-hint">&gt; "Where is the login button?"</div>
            <div class="rawdata-chat-hint">&gt; "Summarize this repo"</div>
          </div>
          <div class="rawdata-chat-welcome-footer">
            Free to use • Powered by raw.data
          </div>
        </div>
      </div>
      
      <div class="rawdata-chat-input-container">
        <textarea 
          class="rawdata-chat-input" 
          id="rawdata-chat-input" 
          placeholder="Ask about this page..."
          rows="1"
        ></textarea>
        <button class="rawdata-chat-send" id="rawdata-chat-send">
          <span>↑</span>
        </button>
      </div>
    `;
    
    document.body.appendChild(chatContainer);
    
    // Get references
    messagesContainer = document.getElementById('rawdata-chat-messages');
    inputField = document.getElementById('rawdata-chat-input');
    
    // Event listeners
    chatContainer.querySelector('.rawdata-chat-close').addEventListener('click', hideChat);
    chatContainer.querySelector('.rawdata-chat-clear').addEventListener('click', clearChat);
    chatContainer.querySelector('.rawdata-chat-send').addEventListener('click', sendMessage);
    
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    
    // Auto-resize textarea
    inputField.addEventListener('input', () => {
      inputField.style.height = 'auto';
      inputField.style.height = Math.min(inputField.scrollHeight, 120) + 'px';
    });
  }
  
  // Show chat
  function showChat() {
    if (!chatContainer) createChatUI();
    chatContainer.classList.add('visible');
    chatVisible = true;
    inputField.focus();
    
    // Perform auto-scan if no scan data
    if (!currentScanData) {
      performAutoScan();
    }
  }
  
  // Hide chat
  function hideChat() {
    if (chatContainer) {
      chatContainer.classList.remove('visible');
    }
    chatVisible = false;
  }
  
  // Toggle chat
  function toggleChat() {
    if (chatVisible) {
      hideChat();
    } else {
      showChat();
    }
  }
  
  // Clear chat
  function clearChat() {
    conversationHistory = [];
    messagesContainer.innerHTML = `
      <div class="rawdata-chat-welcome">
        <div class="rawdata-chat-welcome-icon">$</div>
        <div class="rawdata-chat-welcome-text">Chat cleared. Ready for new questions.</div>
      </div>
    `;
  }
  
  // Perform auto scan
  async function performAutoScan() {
    try {
      // Request scan from content script
      const response = await new Promise((resolve) => {
        // Send message to self (content script)
        chrome.runtime.sendMessage({ action: 'requestScan' }, resolve);
      });
      
      // Or scan directly if function is available
      if (window.rawDataPerformScan && typeof window.rawDataPerformScan === 'function') {
        currentScanData = window.rawDataPerformScan('full', false);
        console.log('[raw.data] Auto-scanned page for chat context');
      }
    } catch (error) {
      console.error('[raw.data] Auto-scan failed:', error);
      // Scan will be null, but user can still ask general questions
    }
  }
  
  // Add message to UI
  function addMessage(text, role = 'user') {
    const messageEl = document.createElement('div');
    messageEl.className = `rawdata-chat-message rawdata-chat-message-${role}`;
    
    if (role === 'assistant') {
      messageEl.innerHTML = `
        <div class="rawdata-chat-message-icon">AI</div>
        <div class="rawdata-chat-message-content">${formatMessageText(text)}</div>
      `;
    } else {
      messageEl.innerHTML = `
        <div class="rawdata-chat-message-content">${formatMessageText(text)}</div>
      `;
    }
    
    // Remove welcome message
    const welcome = messagesContainer.querySelector('.rawdata-chat-welcome');
    if (welcome) welcome.remove();
    
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageEl;
  }
  
  // Format message text (markdown-like)
  function formatMessageText(text) {
    // Escape HTML
    text = text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
    
    // Code blocks
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Line breaks
    text = text.replace(/\n/g, '<br>');
    
    // Element IDs (BTN-01, LINK-05, etc)
    text = text.replace(/\b([A-Z]+-\d+)\b/g, '<span class="rawdata-element-ref">$1</span>');
    
    return text;
  }
  
  // Add loading indicator
  function addLoadingIndicator() {
    const loadingEl = document.createElement('div');
    loadingEl.className = 'rawdata-chat-message rawdata-chat-message-assistant rawdata-chat-loading';
    loadingEl.innerHTML = `
      <div class="rawdata-chat-message-icon">AI</div>
      <div class="rawdata-chat-message-content">
        <span class="rawdata-chat-typing">
          <span>.</span><span>.</span><span>.</span>
        </span>
      </div>
    `;
    messagesContainer.appendChild(loadingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return loadingEl;
  }
  
  // Send message
  async function sendMessage() {
    const message = inputField.value.trim();
    if (!message) return;
    
    // Add user message
    addMessage(message, 'user');
    inputField.value = '';
    inputField.style.height = 'auto';
    
    // Add to conversation history
    conversationHistory.push({
      role: 'user',
      content: message
    });
    
    // Show loading
    const loadingEl = addLoadingIndicator();
    
    try {
      // Send to background script
      const response = await chrome.runtime.sendMessage({
        action: 'chatWithClaude',
        message: message,
        scanData: currentScanData,
        history: conversationHistory
      });
      
      // Remove loading
      loadingEl.remove();
      
      if (response.success) {
        // Add assistant message
        addMessage(response.message, 'assistant');
        
        // Add to history
        conversationHistory.push({
          role: 'assistant',
          content: response.message
        });
      } else {
        // Show error
        addMessage(`Error: ${response.error || 'Failed to get response'}`, 'assistant');
      }
    } catch (error) {
      loadingEl.remove();
      addMessage(`Error: ${error.message}`, 'assistant');
      console.error('[raw.data] Chat error:', error);
    }
  }
  
  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleChat') {
      // Update scan data if provided
      if (request.scanData) {
        currentScanData = request.scanData;
      }
      
      // Show initial summary if provided
      if (request.initialSummary && !chatVisible) {
        showChat();
        // Add AI message with summary
        setTimeout(() => {
          addMessage(request.initialSummary, 'assistant');
          conversationHistory.push({
            role: 'assistant',
            content: request.initialSummary
          });
        }, 100);
      } else {
        toggleChat();
      }
      
      sendResponse({ success: true });
    }
    
    if (request.action === 'updateScanData') {
      currentScanData = request.data;
      sendResponse({ success: true });
    }
    
    return true;
  });
  
  // Keyboard shortcut (Cmd/Ctrl + Shift + K)
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      toggleChat();
    }
  });
  
  console.log('[raw.data] Chat module loaded. Press Cmd+Shift+K to open.');
})();
