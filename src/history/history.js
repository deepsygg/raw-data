// raw.data History Page

const HISTORY_KEY = 'scanHistory';
const MAX_HISTORY = 10;

let currentScanId = null;

// Load and display history
async function loadHistory() {
  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('emptyState');
  const historyList = document.getElementById('historyList');
  
  loading.style.display = 'block';
  emptyState.style.display = 'none';
  historyList.innerHTML = '';
  
  try {
    // Get history metadata
    const result = await chrome.storage.local.get(HISTORY_KEY);
    const history = result[HISTORY_KEY] || [];
    
    console.log('[raw.data] Loaded history:', history.length, 'scans');
    
    if (history.length === 0) {
      loading.style.display = 'none';
      emptyState.style.display = 'block';
      updateStats(0, 0);
      return;
    }
    
    // Calculate storage usage
    const storageUsage = await calculateStorageUsage();
    updateStats(history.length, storageUsage);
    
    // Display history items
    history.forEach(item => {
      const historyItem = createHistoryItem(item);
      historyList.appendChild(historyItem);
    });
    
    loading.style.display = 'none';
    
  } catch (error) {
    console.error('[raw.data] Failed to load history:', error);
    loading.style.display = 'none';
    emptyState.style.display = 'block';
  }
}

// Create history item element
function createHistoryItem(item) {
  const div = document.createElement('div');
  div.className = 'history-item';
  div.dataset.scanId = item.id;
  
  const timeAgo = getTimeAgo(item.timestamp);
  const scanTypeBadge = getScanTypeBadge(item.scanType);
  
  div.innerHTML = `
    <div class="history-header">
      <div class="history-title">${escapeHtml(item.title || 'Untitled')}</div>
      <div class="history-time">${timeAgo}</div>
    </div>
    <div class="history-url">${escapeHtml(item.url || 'No URL')}</div>
    <div class="history-meta">
      <div class="history-meta-item">
        <span>${item.elementCount || 0} elements</span>
      </div>
      <div class="history-badge">${scanTypeBadge}</div>
    </div>
  `;
  
  div.addEventListener('click', () => openScanModal(item.id));
  
  return div;
}

// Get time ago string
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

// Get scan type badge text
function getScanTypeBadge(type) {
  if (type === 'quick') return 'Quick';
  if (type === 'full') return 'Full';
  if (type === 'deep') return 'Deep';
  if (type && type.includes('pdf')) return 'PDF';
  return type || 'Scan';
}

// Update stats
function updateStats(count, bytesUsed) {
  document.getElementById('totalScans').textContent = count;
  
  const kb = Math.round(bytesUsed / 1024);
  const mb = (bytesUsed / (1024 * 1024)).toFixed(2);
  
  if (bytesUsed > 1024 * 1024) {
    document.getElementById('storageUsed').textContent = `${mb} MB`;
  } else {
    document.getElementById('storageUsed').textContent = `${kb} KB`;
  }
}

// Calculate storage usage
async function calculateStorageUsage() {
  const allData = await chrome.storage.local.get(null);
  const jsonString = JSON.stringify(allData);
  return new Blob([jsonString]).size;
}

// Open scan modal
async function openScanModal(scanId) {
  currentScanId = scanId;
  
  try {
    // Load scan data
    const result = await chrome.storage.local.get(`scan_${scanId}`);
    const scanData = result[`scan_${scanId}`];
    
    if (!scanData) {
      alert('Scan data not found');
      return;
    }
    
    // Update modal content
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = scanData.meta?.title || 'Scan Details';
    
    modalBody.innerHTML = `
      <div class="modal-section">
        <div class="modal-section-title">URL</div>
        <div class="modal-section-content">${escapeHtml(scanData.meta?.url || 'Unknown')}</div>
      </div>
      
      <div class="modal-section">
        <div class="modal-section-title">Scanned</div>
        <div class="modal-section-content">${new Date(scanData.meta?.timestamp).toLocaleString()}</div>
      </div>
      
      <div class="modal-section">
        <div class="modal-section-title">UI Elements</div>
        <div class="modal-section-content">${scanData.ui_elements?.length || 0} elements found</div>
      </div>
      
      ${scanData.content ? `
        <div class="modal-section">
          <div class="modal-section-title">Content</div>
          <div class="modal-section-content">
            ${scanData.content.main_text ? `${scanData.content.main_text.substring(0, 200)}...` : 'No text content'}
          </div>
        </div>
      ` : ''}
      
      ${scanData.deep_data ? `
        <div class="modal-section">
          <div class="modal-section-title">Deep Scan Data</div>
          <div class="modal-section-content">
            Source: ${scanData.deep_data.source || 'Unknown'}
          </div>
        </div>
      ` : ''}
    `;
    
    // Show modal
    document.getElementById('scanModal').style.display = 'flex';
    
  } catch (error) {
    console.error('[raw.data] Failed to load scan:', error);
    alert('Failed to load scan data');
  }
}

// Close modal
function closeModal() {
  document.getElementById('scanModal').style.display = 'none';
  currentScanId = null;
}

// Copy modal JSON
async function copyModalJson() {
  if (!currentScanId) return;
  
  const result = await chrome.storage.local.get(`scan_${currentScanId}`);
  const scanData = result[`scan_${currentScanId}`];
  
  if (scanData) {
    await navigator.clipboard.writeText(JSON.stringify(scanData, null, 2));
    alert('JSON copied to clipboard!');
  }
}

// Copy modal for AI
async function copyModalAI() {
  if (!currentScanId) return;
  
  const result = await chrome.storage.local.get(`scan_${currentScanId}`);
  const scanData = result[`scan_${currentScanId}`];
  
  if (scanData) {
    // Format for AI (simplified version of formatForAI from popup.js)
    let output = `# Scan: ${scanData.meta?.title || 'Untitled'}\n\n`;
    output += `**URL:** ${scanData.meta?.url}\n`;
    output += `**Date:** ${new Date(scanData.meta?.timestamp).toLocaleString()}\n\n`;
    
    if (scanData.ui_elements && scanData.ui_elements.length > 0) {
      output += `## UI Elements (${scanData.ui_elements.length})\n\n`;
      scanData.ui_elements.slice(0, 20).forEach(el => {
        output += `- **[${el.id}]** ${el.type}: "${el.text || 'No text'}"\n`;
      });
    }
    
    await navigator.clipboard.writeText(output);
    alert('Formatted text copied to clipboard!');
  }
}

// Delete scan
async function deleteScan() {
  if (!currentScanId) return;
  
  if (!confirm('Delete this scan from history?')) {
    return;
  }
  
  try {
    // Remove from history list
    const result = await chrome.storage.local.get(HISTORY_KEY);
    const history = result[HISTORY_KEY] || [];
    const newHistory = history.filter(item => item.id !== currentScanId);
    
    // Remove scan data
    await chrome.storage.local.remove(`scan_${currentScanId}`);
    await chrome.storage.local.set({ [HISTORY_KEY]: newHistory });
    
    console.log('[raw.data] Deleted scan:', currentScanId);
    
    closeModal();
    loadHistory();
    
  } catch (error) {
    console.error('[raw.data] Failed to delete scan:', error);
    alert('Failed to delete scan');
  }
}

// Clear all history
async function clearAllHistory() {
  if (!confirm('Clear all scan history? This cannot be undone.')) {
    return;
  }
  
  try {
    // Get all scan IDs
    const result = await chrome.storage.local.get(HISTORY_KEY);
    const history = result[HISTORY_KEY] || [];
    
    // Remove all scan data
    const keysToRemove = history.map(item => `scan_${item.id}`);
    keysToRemove.push(HISTORY_KEY);
    
    await chrome.storage.local.remove(keysToRemove);
    
    console.log('[raw.data] Cleared all history');
    
    loadHistory();
    
  } catch (error) {
    console.error('[raw.data] Failed to clear history:', error);
    alert('Failed to clear history');
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  
  // Event listeners
  document.getElementById('refreshHistory').addEventListener('click', loadHistory);
  document.getElementById('clearHistory').addEventListener('click', clearAllHistory);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', closeModal);
  document.getElementById('copyModalJson').addEventListener('click', copyModalJson);
  document.getElementById('copyModalAI').addEventListener('click', copyModalAI);
  document.getElementById('deleteScan').addEventListener('click', deleteScan);
  
  console.log('[raw.data] History page initialized');
});
