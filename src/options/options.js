// raw.data Options Page

// Default settings
const DEFAULT_SETTINGS = {
  // Translation
  defaultTargetLang: 'English',
  autoTranslate: false,
  alwaysAskLanguage: false,
  
  // Explain Mode
  showRiskWarnings: true,
  
  // AI
  aiModel: 'claude-sonnet-4-5-20250929',
  
  // PDF
  pdfOcrPages: 10,
  pdfOcrLanguage: 'eng',
  
  // Other
  overlayEnabled: true,
  showNotifications: true
};

// Load settings from storage
async function loadSettings() {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  
  // Translation
  document.getElementById('defaultTargetLang').value = settings.defaultTargetLang;
  document.getElementById('autoTranslate').checked = settings.autoTranslate;
  document.getElementById('alwaysAskLanguage').checked = settings.alwaysAskLanguage;
  
  // Explain Mode
  document.getElementById('showRiskWarnings').checked = settings.showRiskWarnings;
  
  // AI
  document.getElementById('aiModel').value = settings.aiModel;
  
  // PDF
  document.getElementById('pdfOcrPages').value = settings.pdfOcrPages;
  document.getElementById('pdfOcrLanguage').value = settings.pdfOcrLanguage;
  
  // Other
  document.getElementById('overlayEnabled').checked = settings.overlayEnabled;
  document.getElementById('showNotifications').checked = settings.showNotifications;
  
  console.log('[raw.data] Settings loaded:', settings);
}

// Save settings to storage
async function saveSettings() {
  const settings = {
    // Translation
    defaultTargetLang: document.getElementById('defaultTargetLang').value,
    autoTranslate: document.getElementById('autoTranslate').checked,
    alwaysAskLanguage: document.getElementById('alwaysAskLanguage').checked,
    
    // Explain Mode
    showRiskWarnings: document.getElementById('showRiskWarnings').checked,
    
    // AI
    aiModel: document.getElementById('aiModel').value,
    
    // PDF
    pdfOcrPages: parseInt(document.getElementById('pdfOcrPages').value),
    pdfOcrLanguage: document.getElementById('pdfOcrLanguage').value,
    
    // Other
    overlayEnabled: document.getElementById('overlayEnabled').checked,
    showNotifications: document.getElementById('showNotifications').checked
  };
  
  await chrome.storage.local.set(settings);
  
  console.log('[raw.data] Settings saved:', settings);
  
  // Show save status
  const statusEl = document.getElementById('saveStatus');
  statusEl.textContent = '✓ Settings saved!';
  statusEl.classList.add('show');
  
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 2000);
}

// Reset to default settings
async function resetSettings() {
  if (!confirm('Reset all settings to defaults?')) {
    return;
  }
  
  await chrome.storage.local.set(DEFAULT_SETTINGS);
  await loadSettings();
  
  console.log('[raw.data] Settings reset to defaults');
  
  // Show reset status
  const statusEl = document.getElementById('saveStatus');
  statusEl.textContent = '✓ Settings reset!';
  statusEl.classList.add('show');
  
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 2000);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  
  // Event listeners
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('resetSettings').addEventListener('click', resetSettings);
  
  console.log('[raw.data] Options page initialized');
});
