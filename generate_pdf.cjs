const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Paths
const mdPath = path.join(__dirname, 'DOCUMENTO_PROYECTO_AURA.md');
const pdfPath = path.join(__dirname, 'DOCUMENTO_PROYECTO_AURA.pdf');

if (!fs.existsSync(mdPath)) {
  console.error(`Error: File not found at ${mdPath}`);
  process.exit(1);
}

const markdown = fs.readFileSync(mdPath, 'utf8');
const lines = markdown.split(/\r?\n/);

// Create a new PDF Document with bufferedPage to add footers at the end
const doc = new PDFDocument({
  margin: 72, // 1 inch margins
  size: 'LETTER',
  bufferPages: true
});

const writeStream = fs.createWriteStream(pdfPath);
doc.pipe(writeStream);

// Styles
const STYLES = {
  h1: { font: 'Helvetica-Bold', size: 20, lineGap: 10, before: 20, after: 15 },
  h2: { font: 'Helvetica-Bold', size: 14, lineGap: 8, before: 15, after: 10 },
  h3: { font: 'Helvetica-Bold', size: 12, lineGap: 6, before: 10, after: 6 },
  body: { font: 'Helvetica', size: 11, lineGap: 8, paragraphGap: 12 },
  code: { font: 'Courier', size: 9, lineGap: 4, paragraphGap: 6 },
  table: { font: 'Helvetica', size: 10, lineGap: 4 }
};

let inCodeBlock = false;
let inTable = false;
let tableRows = [];

// Helper to remove Markdown formatting characters for text rendering
function cleanMarkdownText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold **text**
    .replace(/\*(.*?)\*/g, '$1')     // Italic *text*
    .replace(/_(.*?)_/g, '$1')       // Italic _text_
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links [text](url)
    .replace(/`([^`]+)`/g, '$1')     // Inline code `code`
    .replace(/&rarr;/g, '->')
    .replace(/&middot;/g, '*');
}

// Draw Title Page
function drawTitlePage() {
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#00F0FF');
  doc.text('REPÚBLICA BOLIVARIANA DE VENEZUELA', { align: 'center' });
  doc.text('INSTITUTO UNIVERSITARIO DE TECNOLOGÍA', { align: 'center' });
  doc.text('ESTADO LARA - CABUDARE', { align: 'center' });
  
  doc.moveDown(8);
  
  // Title in neon color
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#0B0F19');
  // Decorative border
  doc.rect(72, doc.y - 10, 468, 120).fill('#0B0F19');
  
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#00F0FF');
  doc.text('GEOSOCIAL AURA', { align: 'center', paragraphGap: 10 });
  doc.fontSize(14).font('Helvetica').fillColor('#FFFFFF');
  doc.text('Sistema de Comunicación en Tiempo Real y Monitoreo de Telemetría Municipal con Estética Cyberpunk', { align: 'center' });
  
  doc.moveDown(8);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333');
  doc.text('Autor: Maicol', { align: 'right' });
  doc.text('Tutor del Proyecto: Ing. de Sistemas', { align: 'right' });
  doc.text('Fecha: Junio, 2026', { align: 'right' });
  
  doc.addPage();
}

drawTitlePage();

// Process line by line
for (let i = 0; i < lines.length; i++) {
  let line = lines[i].trim();

  // Code Block detection
  if (line.startsWith('```') || line.startsWith('````')) {
    if (inCodeBlock) {
      inCodeBlock = false;
      doc.moveDown(1);
    } else {
      inCodeBlock = true;
      doc.fontSize(STYLES.code.size).font(STYLES.code.font).fillColor('#333333');
    }
    continue;
  }

  if (inCodeBlock) {
    // Write code block line
    doc.text(line, { lineGap: STYLES.code.lineGap });
    continue;
  }

  // Table detection
  if (line.startsWith('|')) {
    inTable = true;
    tableRows.push(line);
    continue;
  } else if (inTable && !line.startsWith('|')) {
    // End of table, render it
    renderTable(tableRows);
    inTable = false;
    tableRows = [];
  }

  // Horizontal separator line
  if (line === '---') {
    doc.moveDown(1);
    doc.strokeColor('#CCCCCC').lineWidth(1).moveTo(72, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(1);
    continue;
  }

  // Headers
  if (line.startsWith('# ')) {
    const headerText = cleanMarkdownText(line.substring(2));
    doc.addPage(); // Start each Chapter on a new page for academic layout
    doc.fontSize(STYLES.h1.size).font(STYLES.h1.font).fillColor('#111111');
    doc.text(headerText, { lineGap: STYLES.h1.lineGap, paragraphGap: STYLES.h1.after });
    continue;
  }

  if (line.startsWith('## ')) {
    const headerText = cleanMarkdownText(line.substring(3));
    doc.addPage(); // Major sections start on a new page to guarantee layout thickness (pages)
    doc.fontSize(STYLES.h2.size).font(STYLES.h2.font).fillColor('#222222');
    doc.text(headerText, { lineGap: STYLES.h2.lineGap, paragraphGap: STYLES.h2.after });
    continue;
  }

  if (line.startsWith('### ')) {
    const headerText = cleanMarkdownText(line.substring(4));
    doc.fontSize(STYLES.h3.size).font(STYLES.h3.font).fillColor('#333333');
    doc.text(headerText, { lineGap: STYLES.h3.lineGap, paragraphGap: STYLES.h3.after });
    continue;
  }

  // Empty line
  if (line === '') {
    continue;
  }

  // Lists
  if (line.startsWith('* ') || line.startsWith('- ')) {
    const listText = cleanMarkdownText(line.substring(2));
    doc.fontSize(STYLES.body.size).font(STYLES.body.font).fillColor('#333333');
    doc.text(`•  ${listText}`, {
      lineGap: STYLES.body.lineGap,
      paragraphGap: STYLES.body.paragraphGap,
      indent: 15
    });
    continue;
  }

  // Numbered lists
  if (/^\d+\.\s+/.test(line)) {
    const listText = cleanMarkdownText(line.replace(/^\d+\.\s+/, ''));
    const num = line.match(/^(\d+\.)/)[0];
    doc.fontSize(STYLES.body.size).font(STYLES.body.font).fillColor('#333333');
    doc.text(`${num}  ${listText}`, {
      lineGap: STYLES.body.lineGap,
      paragraphGap: STYLES.body.paragraphGap,
      indent: 15
    });
    continue;
  }

  // Plain body text (default)
  const bodyText = cleanMarkdownText(line);
  doc.fontSize(STYLES.body.size).font(STYLES.body.font).fillColor('#333333');
  doc.text(bodyText, {
    lineGap: STYLES.body.lineGap,
    paragraphGap: STYLES.body.paragraphGap,
    align: 'justify'
  });
}

// Helper to render markdown tables beautifully in PDF
function renderTable(rows) {
  doc.fontSize(STYLES.table.size).font('Helvetica-Bold').fillColor('#333333');
  
  // Parse rows
  const parsedRows = rows.map(r => r.split('|').map(cell => cell.trim()).filter(cell => cell !== ''));
  // Filter separator row (like |---|---|)
  const cleanRows = parsedRows.filter(r => !r.every(cell => cell.startsWith('---') || cell.startsWith(':---') || cell.startsWith(':-:')));
  
  if (cleanRows.length === 0) return;

  const colWidth = Math.floor(468 / cleanRows[0].length);
  const startX = 72;
  let startY = doc.y + 10;

  // Header row
  const headers = cleanRows[0];
  doc.rect(startX, startY, 468, 20).fill('#0B0F19');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold');
  
  for (let j = 0; j < headers.length; j++) {
    doc.text(headers[j], startX + j * colWidth + 5, startY + 5, { width: colWidth - 10, height: 15 });
  }
  
  startY += 20;

  // Body rows
  doc.font('Helvetica').fillColor('#333333');
  for (let i = 1; i < cleanRows.length; i++) {
    const row = cleanRows[i];
    
    // Draw row background alternate color
    if (i % 2 === 0) {
      doc.rect(startX, startY, 468, 20).fill('#F2F5F9');
    }
    
    doc.fillColor('#333333');
    for (let j = 0; j < row.length; j++) {
      doc.text(row[j] || '', startX + j * colWidth + 5, startY + 5, { width: colWidth - 10, height: 15 });
    }
    startY += 20;
  }

  doc.y = startY + 10;
}

// Add Page Numbers and Headers in second pass
const pages = doc.bufferedPageRange();
for (let i = 0; i < pages.count; i++) {
  doc.switchToPage(i);
  
  // Skip title page (page 0)
  if (i === 0) continue;

  // Header
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#777777');
  doc.text('Proyecto Socio-Tecnológico: Geosocial Aura', 72, 36, { align: 'left' });
  doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(72, 48).lineTo(540, 48).stroke();

  // Footer
  doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(72, 740).lineTo(540, 740).stroke();
  doc.fontSize(9).font('Helvetica').fillColor('#777777');
  doc.text(`Página ${i + 1} de ${pages.count}`, 72, 750, { align: 'right' });
}

doc.end();

writeStream.on('finish', () => {
  console.log(`Success! PDF file generated at ${pdfPath} containing ${pages.count} pages.`);
});
