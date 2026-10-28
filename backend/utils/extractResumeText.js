const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { generate } = require('./gemini');

// Old Word (.doc) files need a separate reader. It is optional: if the
// package is missing we explain it nicely instead of crashing.
let WordExtractor = null;
try { WordExtractor = require('word-extractor'); } catch (e) { /* optional */ }

function userError(message) {
  const err = new Error(message);
  err.userFacing = true;
  return err;
}

// Looks at the first bytes so a renamed or broken file gets a clear message.
function sniff(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(8);
  fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);
  if (buf.slice(0, 4).toString() === '%PDF') return 'pdf';
  if (buf[0] === 0x50 && buf[1] === 0x4b) return 'zip'; // .docx is a zip
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return 'ole'; // old .doc
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  return null;
}

async function extractResumeText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const kind = sniff(filePath);

  if (ext === '.pdf') {
    if (kind !== 'pdf') throw userError('This file does not look like a valid PDF.');
    const data = await pdfParse(fs.readFileSync(filePath));
    return data.text;
  }

  if (ext === '.docx' || ext === '.doc') {
    // Some ".doc" files are really .docx inside, so handle both by content.
    if (kind === 'zip') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
    if (kind === 'ole') {
      if (!WordExtractor) {
        throw userError('Old .doc files need an extra package. Please save your CV as .docx or PDF and upload it again.');
      }
      const doc = await new WordExtractor().extract(filePath);
      return doc.getBody();
    }
    throw userError('This file does not look like a valid Word document.');
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    if (kind !== 'jpg') throw userError('This file does not look like a valid JPG image.');
    const imageData = fs.readFileSync(filePath).toString('base64');
    return generate([
      { inlineData: { data: imageData, mimeType: 'image/jpeg' } },
      { text: 'Transcribe all text visible in this resume image exactly as written, with no commentary.' },
    ]);
  }

  throw userError(`Unsupported file type: ${ext}`);
}

module.exports = extractResumeText;
