const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_DOMAIN = 'api.rawdata.pro'; // Domain with SSL

// Хранилище сканов в памяти
// Структура: { id: { data: {...}, createdAt: timestamp } }
const scans = new Map();

// Настройки
const SCAN_TTL = 30 * 60 * 1000; // 30 минут в миллисекундах
const MAX_JSON_SIZE = 5 * 1024 * 1024; // 5MB в байтах
const ID_LENGTH = 8; // Длина уникального ID

// Middleware
app.use(cors()); // Разрешаем CORS для всех доменов
app.use(express.json({ limit: '5mb' })); // Парсим JSON, лимит 5MB
app.use((req, res, next) => {
  // Логируем все запросы
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Функция очистки устаревших сканов
function cleanupExpiredScans() {
  const now = Date.now();
  let removed = 0;
  
  for (const [id, scan] of scans.entries()) {
    if (now - scan.createdAt > SCAN_TTL) {
      scans.delete(id);
      removed++;
    }
  }
  
  if (removed > 0) {
    console.log(`[CLEANUP] Удалено ${removed} устаревших сканов`);
  }
}

// Запускаем очистку каждые 5 минут
setInterval(cleanupExpiredScans, 5 * 60 * 1000);

// ==================== ФУНКЦИИ ====================

/**
 * Генерирует HTML-страницу для отображения скана
 */
function generateScanHTML(data, scanId) {
  const meta = data.meta || {};
  const content = data.content || {};
  const uiElements = data.ui_elements || [];
  const deepData = data.deep_data || null;
  
  // Check if this is a PDF scan
  const isPDF = content.pdf === true;
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>raw.data Scan - ${meta.title || 'Untitled'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'IBM Plex Mono', 'Consolas', 'Monaco', monospace;
      background: #0a0a0a;
      color: #e0e0e0;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      border-bottom: 2px solid #00ff88;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #00ff88;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .meta {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px;
      font-size: 14px;
      color: #888;
    }
    .meta-label { color: #00ff88; }
    .section {
      background: #111;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .section h2 {
      color: #00ff88;
      font-size: 20px;
      margin-bottom: 15px;
      border-bottom: 1px solid #333;
      padding-bottom: 10px;
    }
    .section h3 {
      color: #66ffaa;
      font-size: 16px;
      margin: 15px 0 10px 0;
    }
    .element {
      background: #0a0a0a;
      border-left: 3px solid #00ff88;
      padding: 10px;
      margin: 10px 0;
      font-size: 13px;
    }
    .element-id {
      color: #00ff88;
      font-weight: bold;
      font-size: 12px;
    }
    .element-type {
      background: #00ff88;
      color: #000;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
      margin-right: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 13px;
    }
    th, td {
      border: 1px solid #333;
      padding: 8px;
      text-align: left;
    }
    th {
      background: #00ff88;
      color: #000;
      font-weight: bold;
    }
    .badge {
      background: #333;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      display: inline-block;
      margin: 2px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #333;
      color: #666;
      font-size: 12px;
    }
    .footer a {
      color: #00ff88;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .code-block {
      background: #0a0a0a;
      border: 1px solid #333;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
    }
    pre { white-space: pre-wrap; word-wrap: break-word; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>raw.data</h1>
      <div class="meta">
        <span class="meta-label">URL:</span>
        <span>${meta.url || 'Unknown'}</span>
        <span class="meta-label">Title:</span>
        <span>${meta.title || 'Untitled'}</span>
        <span class="meta-label">Scan Type:</span>
        <span>${meta.scan_type || 'unknown'}</span>
        <span class="meta-label">Scanned:</span>
        <span>${meta.timestamp ? new Date(meta.timestamp).toLocaleString() : 'Unknown'}</span>
        <span class="meta-label">Scan ID:</span>
        <span>${scanId}</span>
      </div>
    </div>`;
  
  // Deep Data Section (GitHub, Etherscan, etc)
  if (deepData && deepData.source) {
    html += `<div class="section">`;
    html += `<h2>Deep Scan Data: ${deepData.source}</h2>`;
    
    if (deepData.source === 'github') {
      html += `<h3>Repository Information</h3>`;
      html += `<div class="element">`;
      html += `<div><strong>Repository:</strong> ${deepData.repo || 'Unknown'}</div>`;
      html += `<div><strong>Files:</strong> ${deepData.files?.length || 0}</div>`;
      html += `</div>`;
      
      if (deepData.files && deepData.files.length > 0) {
        html += `<h3>Files</h3>`;
        html += `<table><thead><tr><th>Path</th><th>Type</th></tr></thead><tbody>`;
        deepData.files.slice(0, 50).forEach(file => {
          html += `<tr><td>${file.path}</td><td>${file.type}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
    } else if (deepData.source === 'etherscan' || deepData.source === 'solscan') {
      html += `<h3>Blockchain Address</h3>`;
      html += `<div class="element">`;
      html += `<div><strong>Address:</strong> ${deepData.address || 'Unknown'}</div>`;
      html += `<div><strong>Balance:</strong> ${deepData.balance || 'Unknown'}</div>`;
      html += `<div><strong>Transactions:</strong> ${deepData.transactions?.length || 0}</div>`;
      html += `</div>`;
      
      if (deepData.transactions && deepData.transactions.length > 0) {
        html += `<h3>Recent Transactions</h3>`;
        html += `<table><thead><tr><th>Hash</th><th>Type</th></tr></thead><tbody>`;
        deepData.transactions.slice(0, 20).forEach(tx => {
          html += `<tr><td>${tx.hash || 'N/A'}</td><td>${tx.type || 'transfer'}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
    }
    html += `</div>`;
  }
  
  // PDF Content Section
  if (isPDF) {
    html += `<div class="section">`;
    html += `<h2>PDF Document</h2>`;
    
    if (content.text) {
      html += `<div class="meta" style="margin-bottom: 15px;">`;
      html += `<span class="meta-label">Word Count:</span><span>${content.word_count || 0}</span>`;
      html += `<span class="meta-label">Extraction:</span><span>${content.extraction_method || 'unknown'}</span>`;
      html += `</div>`;
      html += `<h3>Full Text</h3>`;
      html += `<div class="code-block"><pre>${content.text}</pre></div>`;
    } else if (content.error) {
      html += `<div class="element">`;
      html += `<strong>Error:</strong> ${content.error}<br>`;
      html += `${content.note || ''}`;
      html += `</div>`;
    }
    
    html += `</div>`;
  }
  
  // Content Section (HTML pages only)
  if (!isPDF && (content.headings || content.main_text || content.tables)) {
    html += `<div class="section">`;
    html += `<h2>Page Content</h2>`;
    
    if (content.headings && content.headings.length > 0) {
      html += `<h3>Headings</h3>`;
      content.headings.forEach(h => {
        html += `<div class="element">${'#'.repeat(h.level)} ${h.text}</div>`;
      });
    }
    
    if (content.main_text) {
      html += `<h3>Main Text</h3>`;
      html += `<div class="code-block"><pre>${content.main_text.substring(0, 2000)}${content.main_text.length > 2000 ? '...' : ''}</pre></div>`;
    }
    
    if (content.tables && content.tables.length > 0) {
      html += `<h3>Tables</h3>`;
      content.tables.slice(0, 3).forEach((table, idx) => {
        html += `<strong>Table ${idx + 1}</strong>`;
        html += `<table><thead><tr>`;
        table.headers.forEach(h => html += `<th>${h}</th>`);
        html += `</tr></thead><tbody>`;
        table.rows.slice(0, 10).forEach(row => {
          html += `<tr>`;
          row.forEach(cell => html += `<td>${cell}</td>`);
          html += `</tr>`;
        });
        html += `</tbody></table>`;
      });
    }
    html += `</div>`;
  }
  
  // UI Elements Section (skip for PDFs)
  if (!isPDF && uiElements.length > 0) {
    html += `<div class="section">`;
    html += `<h2>Interactive Elements (${uiElements.length})</h2>`;
    
    const grouped = {};
    uiElements.forEach(el => {
      if (!grouped[el.type]) grouped[el.type] = [];
      grouped[el.type].push(el);
    });
    
    Object.keys(grouped).forEach(type => {
      html += `<h3>${type.toUpperCase()} (${grouped[type].length})</h3>`;
      grouped[type].slice(0, 30).forEach(el => {
        html += `<div class="element">`;
        html += `<span class="element-type">${type}</span>`;
        html += `<span class="element-id">${el.id}</span> `;
        if (el.text) html += `"${el.text}" `;
        if (el.href) html += `→ ${el.href}`;
        if (el.placeholder) html += `placeholder: "${el.placeholder}"`;
        html += `</div>`;
      });
    });
    html += `</div>`;
  }
  
  // Raw JSON Section
  html += `<div class="section">`;
  html += `<h2>Raw Data</h2>`;
  html += `<p style="margin-bottom: 10px;">Alternative formats:</p>`;
  html += `<div>`;
  html += `<span class="badge"><a href="/scan/${scanId}/json" style="color: #00ff88; text-decoration: none;">JSON Format</a></span>`;
  html += `<span class="badge"><a href="/scan/${scanId}/ai" style="color: #00ff88; text-decoration: none;">AI-Readable Text</a></span>`;
  html += `</div>`;
  html += `</div>`;
  
  html += `<div class="footer">`;
  html += `<p>Generated by <a href="https://${SERVER_DOMAIN}">raw.data</a></p>`;
  html += `<p>Scan expires in 30 minutes from creation</p>`;
  html += `</div>`;
  html += `</div>`;
  html += `</body></html>`;
  
  return html;
}

/**
 * Форматирует данные скана в AI-readable текст (Markdown)
 */
function formatForAI(data) {
  let output = `# Website Scan - AI-Readable Format\n\n`;
  output += `**Source:** ${data.meta?.url || 'Unknown'}\n`;
  output += `**Title:** ${data.meta?.title || 'Unknown'}\n`;
  output += `**Scanned:** ${data.meta?.timestamp ? new Date(data.meta.timestamp).toLocaleString() : 'Unknown'}\n\n`;
  
  // Check if this is a PDF
  if (data.content?.pdf) {
    output += `**Type:** PDF Document\n\n`;
    output += `---\n\n`;
    
    if (data.content.text) {
      output += `## PDF Content\n\n`;
      output += `**Word Count:** ${data.content.word_count || 0}\n`;
      output += `**Extraction Method:** ${data.content.extraction_method || 'unknown'}\n\n`;
      output += `### Full Text\n\n`;
      output += data.content.text + '\n\n';
    } else if (data.content.error) {
      output += `## PDF Extraction Error\n\n`;
      output += `${data.content.error}\n\n`;
      output += `${data.content.note || ''}\n\n`;
    }
    
    output += `\n---\n\n`;
    output += `*Generated by raw.data - PDF Scan*\n`;
    return output;
  }
  
  output += `---\n\n`;
  
  // Deep Data
  if (data.deep_data && data.deep_data.source) {
    output += `## Deep Scan: ${data.deep_data.source}\n\n`;
    
    if (data.deep_data.source === 'github') {
      output += `**Repository:** ${data.deep_data.repo || 'Unknown'}\n`;
      output += `**Files:** ${data.deep_data.files?.length || 0}\n\n`;
      
      if (data.deep_data.files && data.deep_data.files.length > 0) {
        output += `### File Structure\n\n`;
        data.deep_data.files.slice(0, 50).forEach(file => {
          output += `- ${file.path} (${file.type})\n`;
        });
        output += `\n`;
      }
    } else if (data.deep_data.source === 'etherscan' || data.deep_data.source === 'solscan') {
      output += `**Address:** ${data.deep_data.address || 'Unknown'}\n`;
      output += `**Balance:** ${data.deep_data.balance || 'Unknown'}\n`;
      output += `**Transactions:** ${data.deep_data.transactions?.length || 0}\n\n`;
    }
  }
  
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
      const text = data.content.main_text.substring(0, 3000);
      output += `${text}${data.content.main_text.length > 3000 ? '...' : ''}\n\n`;
    }
    
    if (data.content.tables && data.content.tables.length > 0) {
      output += `### Tables\n\n`;
      data.content.tables.slice(0, 3).forEach((table, idx) => {
        output += `**Table ${idx + 1}:**\n\n`;
        if (table.headers.length > 0) {
          output += `| ${table.headers.join(' | ')} |\n`;
          output += `| ${table.headers.map(() => '---').join(' | ')} |\n`;
        }
        table.rows.slice(0, 10).forEach(row => {
          output += `| ${row.join(' | ')} |\n`;
        });
        output += `\n`;
      });
    }
  }
  
  // Interactive Elements
  if (data.ui_elements && data.ui_elements.length > 0) {
    output += `## Interactive Elements (${data.ui_elements.length})\n\n`;
    output += `*These are clickable/interactive elements on the page with their identifiers*\n\n`;
    
    const buttons = data.ui_elements.filter(el => el.type === 'button');
    const inputs = data.ui_elements.filter(el => el.type === 'input');
    const links = data.ui_elements.filter(el => el.type === 'link');
    
    if (buttons.length > 0) {
      output += `### Buttons (${buttons.length})\n\n`;
      buttons.slice(0, 30).forEach(btn => {
        output += `- **[${btn.id}]** "${btn.text || 'No text'}"`;
        if (btn.state && btn.state !== 'enabled') output += ` (${btn.state})`;
        output += `\n`;
      });
      output += `\n`;
    }
    
    if (inputs.length > 0) {
      output += `### Input Fields (${inputs.length})\n\n`;
      inputs.slice(0, 30).forEach(inp => {
        output += `- **[${inp.id}]** ${inp.inputType || 'text'}`;
        if (inp.placeholder) output += ` - "${inp.placeholder}"`;
        output += `\n`;
      });
      output += `\n`;
    }
    
    if (links.length > 0 && links.length <= 50) {
      output += `### Links (${links.length})\n\n`;
      links.slice(0, 30).forEach(link => {
        output += `- **[${link.id}]** "${link.text}" → ${link.href}\n`;
      });
      output += `\n`;
    }
  }
  
  output += `\n---\n\n`;
  output += `*Generated by raw.data - Scan ID: ${data.meta?.timestamp || Date.now()}*\n`;
  
  return output;
}

// ==================== ЭНДПОИНТЫ ====================

/**
 * POST /scan
 * Сохраняет данные скана и возвращает короткую ссылку
 */
app.post('/scan', (req, res) => {
  try {
    const scanData = req.body;
    
    // Валидация: проверяем что есть данные
    if (!scanData || Object.keys(scanData).length === 0) {
      return res.status(400).json({
        error: 'Scan data is empty'
      });
    }
    
    // Проверяем размер JSON
    const jsonSize = JSON.stringify(scanData).length;
    if (jsonSize > MAX_JSON_SIZE) {
      return res.status(413).json({
        error: 'Scan data too large',
        maxSize: '5MB',
        receivedSize: `${(jsonSize / 1024 / 1024).toFixed(2)}MB`
      });
    }
    
    // Генерируем уникальный короткий ID
    const id = nanoid(ID_LENGTH);
    
    // Сохраняем скан с временной меткой
    scans.set(id, {
      data: scanData,
      createdAt: Date.now()
    });
    
    // Формируем URL (используем домен с HTTPS)
    const url = `https://${SERVER_DOMAIN}/scan/${id}`;
    
    console.log(`[SCAN] Создан новый скан: ${id} (размер: ${(jsonSize / 1024).toFixed(2)}KB)`);
    
    res.json({
      id: id,
      url: url,
      expiresIn: SCAN_TTL / 1000 // в секундах
    });
    
  } catch (error) {
    console.error('[ERROR] Ошибка при сохранении скана:', error);
    res.status(500).json({
      error: 'Failed to save scan',
      message: error.message
    });
  }
});

/**
 * GET /scan/:id
 * Возвращает HTML-страницу с данными скана (читаемо для AI и людей)
 */
app.get('/scan/:id', (req, res) => {
  const { id } = req.params;
  
  const scan = scans.get(id);
  
  if (!scan) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"><title>Scan Not Found</title></head>
      <body style="font-family: monospace; padding: 40px; background: #1a1a1a; color: #fff;">
        <h1>404 - Scan Not Found</h1>
        <p>ID: ${id}</p>
        <p>This scan may have expired (TTL: 30 minutes) or doesn't exist.</p>
      </body></html>
    `);
  }
  
  const now = Date.now();
  if (now - scan.createdAt > SCAN_TTL) {
    scans.delete(id);
    return res.status(404).send(`
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"><title>Scan Expired</title></head>
      <body style="font-family: monospace; padding: 40px; background: #1a1a1a; color: #fff;">
        <h1>Scan Expired</h1>
        <p>This scan was created more than 30 minutes ago and has been removed.</p>
      </body></html>
    `);
  }
  
  console.log(`[SCAN] Отдаем HTML: ${id}`);
  
  // Генерируем HTML
  const html = generateScanHTML(scan.data, id);
  res.send(html);
});

/**
 * GET /scan/:id/json
 * Возвращает сырой JSON данных скана
 */
app.get('/scan/:id/json', (req, res) => {
  const { id } = req.params;
  
  const scan = scans.get(id);
  
  if (!scan) {
    return res.status(404).json({
      error: 'Scan not found or expired',
      id: id
    });
  }
  
  const now = Date.now();
  if (now - scan.createdAt > SCAN_TTL) {
    scans.delete(id);
    return res.status(404).json({
      error: 'Scan expired',
      id: id
    });
  }
  
  console.log(`[SCAN] Отдаем JSON: ${id}`);
  res.json(scan.data);
});

/**
 * GET /scan/:id/ai
 * Возвращает AI-readable текстовый формат (Markdown)
 */
app.get('/scan/:id/ai', (req, res) => {
  const { id } = req.params;
  
  const scan = scans.get(id);
  
  if (!scan) {
    return res.status(404).send('Scan not found or expired');
  }
  
  const now = Date.now();
  if (now - scan.createdAt > SCAN_TTL) {
    scans.delete(id);
    return res.status(404).send('Scan expired');
  }
  
  console.log(`[SCAN] Отдаем AI-формат: ${id}`);
  
  const aiText = formatForAI(scan.data);
  res.type('text/plain').send(aiText);
});

/**
 * GET /health
 * Проверка здоровья сервера
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    scans_count: scans.size,
    uptime: process.uptime(),
    memory: {
      used: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`,
      total: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)}MB`
    }
  });
});

/**
 * GET /
 * Главная страница - информация о сервере
 */
app.get('/', (req, res) => {
  res.json({
    name: 'raw.data Server',
    version: '1.0.0',
    description: 'Server for storing webpage scans and providing shareable links for AI',
    endpoints: {
      'POST /scan': 'Upload scan data, get shareable link',
      'GET /scan/:id': 'Retrieve scan by ID',
      'GET /health': 'Server health check'
    },
    docs: 'https://github.com/rawdata/server'
  });
});

// Запускаем сервер
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║       raw.data Server запущен! 🚀         ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`Порт:          ${PORT}`);
  console.log(`URL:           http://localhost:${PORT}`);
  console.log(`TTL сканов:    ${SCAN_TTL / 1000 / 60} минут`);
  console.log(`Макс размер:   ${MAX_JSON_SIZE / 1024 / 1024}MB`);
  console.log('');
  console.log('Эндпоинты:');
  console.log(`  POST   /scan        - Загрузить скан`);
  console.log(`  GET    /scan/:id    - Получить скан`);
  console.log(`  GET    /health      - Проверка здоровья`);
  console.log('');
  console.log('Нажмите Ctrl+C для остановки');
  console.log('');
});

// Обработка остановки сервера
process.on('SIGTERM', () => {
  console.log('\n[SHUTDOWN] Получен сигнал SIGTERM, останавливаем сервер...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Получен сигнал SIGINT, останавливаем сервер...');
  process.exit(0);
});
