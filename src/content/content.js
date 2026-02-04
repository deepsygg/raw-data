// raw.data Content Script
// Scans the page DOM and extracts structured data for AI

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.rawDataInitialized) return;
  window.rawDataInitialized = true;
  
  // State
  let overlayLabels = [];
  let overlayEnabled = true;
  
  // Element counters
  const counters = {
    BTN: 0,
    INPUT: 0,
    LINK: 0,
    SELECT: 0,
    FORM: 0,
    TEXT: 0
  };
  
  // Check if current page is PDF
  function isPDFPage() {
    const url = window.location.href;
    const contentType = document.contentType || '';
    return url.endsWith('.pdf') || 
           url.includes('.pdf?') ||
           url.includes('.pdf#') ||
           contentType === 'application/pdf' ||
           document.querySelector('embed[type="application/pdf"]') !== null;
  }
  
  // Extract text from PDF using fetch + PDF.js
  async function extractPDFText() {
    try {
      console.log('[raw.data] Attempting to extract PDF text...');
      console.log('[raw.data] Current URL:', window.location.href);
      console.log('[raw.data] Document title:', document.title);
      
      const pdfUrl = window.location.href;
      
      // Check if PDF.js is available
      if (typeof pdfjsLib === 'undefined') {
        console.error('[raw.data] PDF.js library not loaded!');
        return {
          success: false,
          text: '',
          error: 'PDF.js library not available. Cannot parse PDF directly.'
        };
      }
      
      // Configure PDF.js worker
      console.log('[raw.data] Configuring PDF.js...');
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('src/libs/pdf.worker.min.js');
      
      // Fetch PDF as ArrayBuffer
      console.log('[raw.data] Fetching PDF file...');
      const response = await fetch(pdfUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('[raw.data] PDF downloaded:', arrayBuffer.byteLength, 'bytes');
      
      // Load PDF with PDF.js
      console.log('[raw.data] Loading PDF with PDF.js...');
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      console.log('[raw.data] PDF loaded! Pages:', pdf.numPages);
      
      // Extract text from all pages (limit to 50)
      const maxPages = Math.min(pdf.numPages, 50);
      let extractedText = '';
      let usedOCR = false;
      let ocrMaxPages = 0;
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        console.log(`[raw.data] Extracting page ${pageNum}/${maxPages}...`);
        
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        console.log(`[raw.data] Page ${pageNum} - Items found:`, textContent.items.length);
        
        if (textContent.items.length > 0) {
          console.log(`[raw.data] Page ${pageNum} - First item:`, JSON.stringify(textContent.items[0]).substring(0, 200));
        }
        
        // Combine text items with spaces
        const pageText = textContent.items
          .map(item => {
            // Handle different item formats
            if (typeof item === 'string') {
              return item;
            } else if (item && item.str) {
              return item.str;
            } else if (item && item.text) {
              return item.text;
            } else {
              console.warn('[raw.data] Unknown item format:', item);
              return '';
            }
          })
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log(`[raw.data] Page ${pageNum} - Extracted text length:`, pageText.length);
        
        if (pageText && pageText.length > 0) {
          console.log(`[raw.data] Page ${pageNum} - First 100 chars:`, pageText.substring(0, 100));
          extractedText += `\n\n--- Page ${pageNum} ---\n\n${pageText}`;
        } else {
          console.warn(`[raw.data] Page ${pageNum} - No text extracted!`);
        }
        
        // Stop if text is too large (500KB limit)
        if (extractedText.length > 500000) {
          extractedText += '\n\n[... Text truncated - PDF too large ...]';
          console.log('[raw.data] Text limit reached at page', pageNum);
          break;
        }
      }
      
      extractedText = extractedText.trim();
      
      // If no text extracted, PDF might be image-based (scanned)
      if (!extractedText || extractedText.length < 50) {
        console.warn('[raw.data] No text extracted via PDF.js - PDF is likely image-based');
        console.log('[raw.data] Attempting OCR (Tesseract.js)...');
        
        // Try OCR
        if (typeof Tesseract === 'undefined') {
          console.error('[raw.data] Tesseract.js not loaded!');
          return {
            success: false,
            text: '',
            error: 'PDF is image-based (scanned). OCR library not available.'
          };
        }
        
        // Use OCR on PDF pages (limit to first 10 pages for speed)
        ocrMaxPages = Math.min(pdf.numPages, 10);
        usedOCR = true;
        console.log(`[raw.data] Running OCR on ${ocrMaxPages} pages (this may take a while)...`);
        
        try {
          for (let pageNum = 1; pageNum <= ocrMaxPages; pageNum++) {
            console.log(`[raw.data] OCR: Processing page ${pageNum}/${ocrMaxPages}...`);
            
            const page = await pdf.getPage(pageNum);
            
            // Render page to canvas
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;
            
            // Run OCR on canvas
            const { data: { text } } = await Tesseract.recognize(
              canvas,
              'eng',
              {
                logger: m => {
                  if (m.status === 'recognizing text') {
                    console.log(`[raw.data] OCR page ${pageNum}: ${Math.round(m.progress * 100)}%`);
                  }
                }
              }
            );
            
            if (text && text.trim().length > 0) {
              extractedText += `\n\n--- Page ${pageNum} (OCR) ---\n\n${text.trim()}`;
              console.log(`[raw.data] OCR page ${pageNum}: Extracted ${text.length} chars`);
            } else {
              console.warn(`[raw.data] OCR page ${pageNum}: No text found`);
            }
            
            // Stop if text is too large
            if (extractedText.length > 300000) {
              extractedText += '\n\n[... Text truncated - too large ...]';
              console.log('[raw.data] OCR text limit reached at page', pageNum);
              break;
            }
          }
          
          extractedText = extractedText.trim();
          
          if (!extractedText || extractedText.length < 50) {
            return {
              success: false,
              text: '',
              error: 'OCR completed but no text was recognized. The PDF might have poor image quality.'
            };
          }
          
          console.log('[raw.data] ✅ OCR extraction complete!');
          console.log('[raw.data] Total chars:', extractedText.length);
          
        } catch (ocrError) {
          console.error('[raw.data] OCR failed:', ocrError);
          return {
            success: false,
            text: '',
            error: `OCR failed: ${ocrError.message}`
          };
        }
      }
      
      // Success!
      const words = extractedText.split(/\s+/).filter(w => w.length > 0);
      const wordCount = words.length;
      
      // Determine extraction method
      const extractionMethod = usedOCR ? 'tesseract_ocr' : 'pdfjs_direct';
      
      console.log('[raw.data] ✅ PDF text extracted successfully!');
      console.log('[raw.data] Method:', extractionMethod);
      console.log('[raw.data] Pages extracted:', usedOCR ? ocrMaxPages : maxPages, '/', pdf.numPages);
      console.log('[raw.data] Characters:', extractedText.length);
      console.log('[raw.data] Words:', wordCount);
      console.log('[raw.data] First 200 chars:', extractedText.substring(0, 200));
      
      return {
        success: true,
        text: extractedText.trim(),
        source: extractionMethod,
        pages: usedOCR ? ocrMaxPages : maxPages,
        totalPages: pdf.numPages,
        word_count: wordCount,
        char_count: extractedText.length
      };
      
    } catch (error) {
      console.error('[raw.data] PDF extraction error:', error);
      return {
        success: false,
        text: '',
        error: error.message
      };
    }
  }
  
  // Reset counters
  function resetCounters() {
    Object.keys(counters).forEach(key => counters[key] = 0);
  }
  
  // Generate element ID
  function generateId(type) {
    // Map types to counter keys
    const typeMap = {
      'button': 'BTN',
      'input': 'INPUT',
      'link': 'LINK',
      'select': 'SELECT',
      'form': 'FORM',
      'text': 'TEXT'
    };
    
    const prefix = typeMap[type.toLowerCase()] || type.toUpperCase().substring(0, 3);
    
    if (counters[prefix] !== undefined) {
      counters[prefix]++;
      return `${prefix}-${String(counters[prefix]).padStart(2, '0')}`;
    }
    
    return `EL-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }
  
  // Check if element is visible
  function isVisible(el) {
    if (!el) return false;
    
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    
    // Check if in viewport (with some margin)
    const inViewport = (
      rect.top < window.innerHeight + 500 &&
      rect.bottom > -500 &&
      rect.left < window.innerWidth + 500 &&
      rect.right > -500
    );
    
    return inViewport;
  }
  
  // Get meaningful text from element
  function getElementText(el) {
    // Try aria-label first
    if (el.getAttribute('aria-label')) {
      return el.getAttribute('aria-label').trim();
    }
    
    // Try title
    if (el.title) {
      return el.title.trim();
    }
    
    // Try inner text (but not too long)
    const text = el.innerText?.trim();
    if (text && text.length < 100 && text.length > 0) {
      return text;
    }
    
    // Try value for inputs
    if (el.value) {
      return el.value.trim();
    }
    
    // Try placeholder
    if (el.placeholder) {
      return el.placeholder.trim();
    }
    
    // Try alt text for images
    if (el.alt) {
      return el.alt.trim();
    }
    
    return '';
  }
  
  // Determine element state
  function getElementState(el) {
    if (el.disabled) return 'disabled';
    if (el.readOnly) return 'readonly';
    if (el.checked) return 'checked';
    if (el.getAttribute('aria-disabled') === 'true') return 'disabled';
    if (el.getAttribute('aria-selected') === 'true') return 'selected';
    if (el.getAttribute('aria-expanded') === 'true') return 'expanded';
    return 'enabled';
  }
  
  // Get element location description
  function getElementLocation(el) {
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    let vertical = '';
    if (rect.top < viewportHeight * 0.33) vertical = 'top';
    else if (rect.top < viewportHeight * 0.66) vertical = 'middle';
    else vertical = 'bottom';
    
    let horizontal = '';
    if (rect.left < viewportWidth * 0.33) horizontal = 'left';
    else if (rect.left < viewportWidth * 0.66) horizontal = 'center';
    else horizontal = 'right';
    
    return `${vertical}-${horizontal}`;
  }
  
  // Scan for interactive elements
  function scanUIElements() {
    const elements = [];
    
    // Buttons
    document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]').forEach(el => {
      if (!isVisible(el)) return;
      
      const id = generateId('button');
      elements.push({
        id: id,
        type: 'button',
        text: getElementText(el) || 'Button',
        state: getElementState(el),
        location: getElementLocation(el),
        element: el
      });
    });
    
    // Input fields
    document.querySelectorAll('input:not([type="button"]):not([type="submit"]):not([type="hidden"]), textarea').forEach(el => {
      if (!isVisible(el)) return;
      
      const id = generateId('input');
      elements.push({
        id: id,
        type: 'input',
        inputType: el.type || 'text',
        text: getElementText(el),
        placeholder: el.placeholder || '',
        state: getElementState(el),
        location: getElementLocation(el),
        element: el
      });
    });
    
    // Links (only important ones)
    document.querySelectorAll('a[href]').forEach(el => {
      if (!isVisible(el)) return;
      
      const text = getElementText(el);
      // Skip empty or very short links, and skip anchor links
      if (!text || text.length < 2) return;
      if (el.href.startsWith('javascript:')) return;
      
      const id = generateId('link');
      elements.push({
        id: id,
        type: 'link',
        text: text,
        href: el.href,
        location: getElementLocation(el),
        element: el
      });
    });
    
    // Select dropdowns
    document.querySelectorAll('select, [role="listbox"], [role="combobox"]').forEach(el => {
      if (!isVisible(el)) return;
      
      const id = generateId('select');
      let options = [];
      
      if (el.tagName === 'SELECT') {
        options = Array.from(el.options).map(opt => opt.text).slice(0, 10);
      }
      
      elements.push({
        id: id,
        type: 'select',
        text: getElementText(el),
        currentValue: el.value || '',
        options: options,
        state: getElementState(el),
        location: getElementLocation(el),
        element: el
      });
    });
    
    // Forms
    document.querySelectorAll('form').forEach(el => {
      if (!isVisible(el)) return;
      
      const id = generateId('form');
      elements.push({
        id: id,
        type: 'form',
        text: el.getAttribute('aria-label') || el.name || 'Form',
        action: el.action || '',
        method: el.method || 'GET',
        location: getElementLocation(el),
        element: el
      });
    });
    
    return elements;
  }
  
  // Scan page content
  function scanContent() {
    const content = {
      main_text: '',
      headings: [],
      tables: [],
      code_blocks: [],
      lists: [],
      displayed_data: {}
    };
    
    // Get main text content
    const mainContent = document.querySelector('main, article, [role="main"], .content, #content');
    if (mainContent) {
      content.main_text = mainContent.innerText?.substring(0, 2000) || '';
    } else {
      content.main_text = document.body.innerText?.substring(0, 2000) || '';
    }
    
    // Clean up the text
    content.main_text = content.main_text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // Get headings
    document.querySelectorAll('h1, h2, h3').forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length < 200) {
        content.headings.push({
          level: parseInt(el.tagName.substring(1)),
          text: text
        });
      }
    });
    
    // Get tables
    document.querySelectorAll('table').forEach((table, idx) => {
      if (!isVisible(table)) return;
      if (idx >= 5) return; // Limit to 5 tables
      
      const tableData = {
        headers: [],
        rows: []
      };
      
      // Get headers
      table.querySelectorAll('th').forEach(th => {
        tableData.headers.push(th.innerText?.trim());
      });
      
      // Get first few rows
      table.querySelectorAll('tr').forEach((tr, rowIdx) => {
        if (rowIdx >= 10) return; // Limit rows
        const row = [];
        tr.querySelectorAll('td').forEach(td => {
          row.push(td.innerText?.trim().substring(0, 100));
        });
        if (row.length > 0) {
          tableData.rows.push(row);
        }
      });
      
      if (tableData.headers.length > 0 || tableData.rows.length > 0) {
        content.tables.push(tableData);
      }
    });
    
    // Get code blocks
    document.querySelectorAll('pre, code').forEach((el, idx) => {
      if (idx >= 10) return;
      const code = el.innerText?.trim();
      if (code && code.length > 10 && code.length < 1000) {
        content.code_blocks.push(code);
      }
    });
    
    // Try to extract displayed data (prices, numbers, etc.)
    const dataPatterns = [
      { pattern: /\$[\d,]+\.?\d*/g, key: 'prices' },
      { pattern: /\d+\.?\d*%/g, key: 'percentages' },
      { pattern: /\d+\.?\d*\s*(ETH|BTC|SOL|USDC|USDT)/gi, key: 'crypto_amounts' }
    ];
    
    const bodyText = document.body.innerText || '';
    dataPatterns.forEach(({ pattern, key }) => {
      const matches = bodyText.match(pattern);
      if (matches && matches.length > 0) {
        content.displayed_data[key] = [...new Set(matches)].slice(0, 10);
      }
    });
    
    return content;
  }
  
  // Create overlay label for element
  function createOverlayLabel(elementData) {
    const el = elementData.element;
    if (!el) return null;
    
    const rect = el.getBoundingClientRect();
    
    const label = document.createElement('div');
    label.className = 'rawdata-label';
    label.setAttribute('data-type', elementData.type);
    label.textContent = elementData.id;
    
    // Add to DOM first to measure
    document.body.appendChild(label);
    const labelRect = label.getBoundingClientRect();
    
    // Smart positioning
    let left = rect.left + rect.width / 2;
    let top = rect.top - labelRect.height - 3;
    label.style.transform = 'translateX(-50%)';
    
    // If label would go off left edge
    if (left - labelRect.width / 2 < 5) {
      left = rect.left;
      label.style.transform = 'none';
    }
    
    // If label would go off right edge
    if (left + labelRect.width / 2 > window.innerWidth - 5) {
      left = rect.right - labelRect.width;
      label.style.transform = 'none';
    }
    
    // If label would go off top, place below element
    if (top < 5) {
      top = rect.bottom + 3;
    }
    
    // If element is very small, place label on top-left corner
    if (rect.width < 30 || rect.height < 20) {
      left = rect.left;
      top = rect.top - labelRect.height - 2;
      label.style.transform = 'none';
    }
    
    label.style.position = 'fixed';
    label.style.left = `${left}px`;
    label.style.top = `${top}px`;
    
    return label;
  }
  
  // Show overlay labels
  function showOverlay(elements) {
    clearOverlay();
    
    if (!overlayEnabled) return;
    
    elements.forEach(elData => {
      const label = createOverlayLabel(elData);
      if (label) {
        overlayLabels.push(label);
      }
    });
  }
  
  // Clear overlay
  function clearOverlay() {
    overlayLabels.forEach(label => {
      if (label && label.parentNode) {
        label.parentNode.removeChild(label);
      }
    });
    overlayLabels = [];
  }
  
  // Main scan function (expose to window for chat.js)
  async function performScan(type, showOverlayLabels) {
    resetCounters();
    
    const result = {
      meta: {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        scan_type: type
      },
      ui_elements: [],
      content: null,
      deep_data: null
    };
    
    // Check if this is a PDF page
    if (isPDFPage()) {
      console.log('[raw.data] PDF page detected, extracting text...');
      
      const pdfData = await extractPDFText();
      
      if (pdfData.success) {
        result.content = {
          pdf: true,
          text: pdfData.text,
          word_count: pdfData.word_count || pdfData.text.split(/\s+/).filter(w => w).length,
          char_count: pdfData.char_count || pdfData.text.length,
          extraction_method: pdfData.source,
          pages_extracted: pdfData.pages > 0 ? pdfData.pages : null,
          total_pages: pdfData.totalPages > 0 ? pdfData.totalPages : null
        };
        result.meta.title = document.title || 'PDF Document';
        result.meta.scan_type = type + '_pdf';
        
        const pagesInfo = pdfData.pages > 0 ? ` from ${pdfData.pages} pages` : '';
        console.log('[raw.data] PDF text extracted:', pdfData.char_count, 'chars,', pdfData.word_count, 'words' + pagesInfo);
      } else {
        result.content = {
          pdf: true,
          error: pdfData.error,
          note: 'PDF detected but text extraction failed. The PDF might be image-based, protected, or needs more time to load.'
        };
        console.warn('[raw.data] PDF extraction failed:', pdfData.error);
      }
      
      // No UI elements or deep scan for PDFs
      return result;
    }
    
    // Regular HTML page scan
    // Always scan UI elements
    const elements = scanUIElements();
    
    // Store without DOM reference for JSON
    result.ui_elements = elements.map(el => {
      const { element, ...data } = el;
      return data;
    });
    
    // Full scan includes content
    if (type === 'full' || type === 'deep') {
      result.content = scanContent();
    }
    
    // Deep scan - check for special sites
    if (type === 'deep') {
      result.deep_data = performDeepScan();
    }
    
    // Show overlay if enabled
    if (showOverlayLabels) {
      showOverlay(elements);
    }
    
    return result;
  }
  
  // Deep scan for special sites (GitHub, blockchain explorers)
  function performDeepScan() {
    const hostname = window.location.hostname.toLowerCase();
    const deepData = {
      source: null,
      data: null
    };
    
    // GitHub repository
    if (hostname === 'github.com' || hostname === 'www.github.com') {
      deepData.source = 'github';
      deepData.data = scanGitHub();
    }
    
    // Blockchain explorers (EVM chains)
    if (hostname.includes('etherscan.io') || 
        hostname.includes('bscscan.com') ||
        hostname.includes('polygonscan.com') ||
        hostname.includes('arbiscan.io') ||
        hostname.includes('optimistic.etherscan.io')) {
      deepData.source = 'etherscan';
      deepData.data = scanEtherscan();
    }
    
    // Solscan (Solana)
    if (hostname.includes('solscan.io')) {
      deepData.source = 'solscan';
      deepData.data = scanSolscan();
    }
    
    return deepData.source ? deepData : null;
  }
  
  // GitHub scanner
  function scanGitHub() {
    const data = {
      type: 'unknown',
      repo: null,
      files: [],
      readme: null,
      metrics: {
        stars: 0,
        forks: 0,
        contributors: 0,
        isFork: false,
        hasLicense: false,
        age: null
      },
      codePatterns: {
        genericFiles: [],
        boilerplateScore: 0,
        suspiciousPatterns: []
      }
    };
    
    // Check if it's a repo page
    const repoHeader = document.querySelector('[itemprop="name"] a, .AppHeader-context-item-label');
    if (repoHeader) {
      data.type = 'repository';
      data.repo = window.location.pathname.split('/').slice(1, 3).join('/');
    }
    
    // Get repository metrics
    const starsEl = document.querySelector('#repo-stars-counter-star, [href$="/stargazers"]');
    if (starsEl) {
      const starsText = starsEl.textContent?.trim();
      data.metrics.stars = parseGitHubNumber(starsText);
    }
    
    const forksEl = document.querySelector('#repo-network-counter, [href$="/forks"]');
    if (forksEl) {
      const forksText = forksEl.textContent?.trim();
      data.metrics.forks = parseGitHubNumber(forksText);
    }
    
    // Check if it's a fork
    const forkBadge = document.querySelector('.fork-flag, [class*="fork"]');
    data.metrics.isFork = !!forkBadge;
    
    // Get file list and analyze
    const genericNames = ['main.js', 'index.js', 'app.js', 'script.js', 'utils.js', 'helper.js', 'config.js', 'test.js'];
    let boilerplateCount = 0;
    
    document.querySelectorAll('.react-directory-row, .js-navigation-item').forEach(row => {
      const link = row.querySelector('a.Link--primary, a.js-navigation-open');
      if (link) {
        const fileName = link.textContent?.trim();
        data.files.push({
          name: fileName,
          path: link.getAttribute('href')
        });
        
        // Check for generic filenames
        if (genericNames.includes(fileName?.toLowerCase())) {
          data.codePatterns.genericFiles.push(fileName);
        }
        
        // Check for LICENSE
        if (fileName?.toLowerCase().includes('license')) {
          data.metrics.hasLicense = true;
        }
        
        // Boilerplate patterns
        if (fileName?.match(/^(setup|install|readme|contributing|changelog)\.(md|txt)$/i)) {
          boilerplateCount++;
        }
      }
    });
    
    // Calculate boilerplate score
    if (data.files.length > 0) {
      data.codePatterns.boilerplateScore = Math.round((boilerplateCount / data.files.length) * 100);
    }
    
    // Get README content
    const readme = document.querySelector('article.markdown-body, .readme');
    if (readme) {
      data.readme = readme.innerText?.substring(0, 3000);
      
      // Check for template README
      const templatePhrases = [
        'your-project-name',
        'project-description',
        'TODO:',
        'replace this',
        'edit this file'
      ];
      const readmeText = data.readme.toLowerCase();
      templatePhrases.forEach(phrase => {
        if (readmeText.includes(phrase.toLowerCase())) {
          data.codePatterns.suspiciousPatterns.push('Template README detected');
        }
      });
    }
    
    return data;
  }
  
  // Parse GitHub numbers (1.2k, 3.4m, etc)
  function parseGitHubNumber(text) {
    if (!text) return 0;
    text = text.toLowerCase().replace(/,/g, '');
    const match = text.match(/([\d.]+)([km]?)/);
    if (!match) return 0;
    
    const num = parseFloat(match[1]);
    const suffix = match[2];
    
    if (suffix === 'k') return Math.round(num * 1000);
    if (suffix === 'm') return Math.round(num * 1000000);
    return Math.round(num);
  }
  
  // Etherscan scanner
  function scanEtherscan() {
    const data = {
      type: 'unknown',
      address: null,
      balance: null,
      contract_name: null,
      verified: false
    };
    
    // Get address
    const addressEl = document.querySelector('#mainaddress, .hash-tag');
    if (addressEl) {
      data.address = addressEl.textContent?.trim();
    }
    
    // Get balance
    const balanceEl = document.querySelector('.card .h5, #ContentPlaceHolder1_divSummary .card-body');
    if (balanceEl) {
      const match = balanceEl.textContent?.match(/[\d.,]+\s*ETH/);
      if (match) data.balance = match[0];
    }
    
    // Check if verified
    if (document.querySelector('.text-success, .fa-check-circle')) {
      data.verified = true;
    }
    
    // Contract name
    const contractEl = document.querySelector('#ContentPlaceHolder1_divCodeOrPending .h6');
    if (contractEl) {
      data.contract_name = contractEl.textContent?.trim();
    }
    
    return data;
  }
  
  // Solscan scanner
  function scanSolscan() {
    const data = {
      type: 'unknown',
      address: null,
      balance: null,
      token_info: null
    };
    
    // Get address from URL or page
    const pathParts = window.location.pathname.split('/');
    if (pathParts.includes('account') || pathParts.includes('token')) {
      data.address = pathParts[pathParts.length - 1];
      data.type = pathParts.includes('token') ? 'token' : 'account';
    }
    
    // Try to get balance
    const balanceEl = document.querySelector('[class*="balance"], [class*="Balance"]');
    if (balanceEl) {
      data.balance = balanceEl.textContent?.trim();
    }
    
    return data;
  }
  
  // Message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scan') {
      overlayEnabled = request.showOverlay;
      (async () => {
        try {
          const result = await performScan(request.type, request.showOverlay);
          sendResponse({ success: true, data: result });
        } catch (error) {
          console.error('raw.data scan error:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true; // Keep channel open for async response
    }
    
    if (request.action === 'toggleOverlay') {
      overlayEnabled = request.enabled;
      if (!overlayEnabled) {
        clearOverlay();
      }
      sendResponse({ success: true });
      return true;
    }
    
    if (request.action === 'clearOverlay') {
      clearOverlay();
      sendResponse({ success: true });
      return true;
    }
    
    return false; // No async response needed
  });
  
  // Handle scroll - update label positions
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      // Labels are fixed position, so they should stay in place
      // But we might want to re-scan for newly visible elements
    }, 100);
  }, { passive: true });
  
  // Expose scan function for chat module
  window.rawDataPerformScan = performScan;
  
  console.log('raw.data extension loaded');
})();
