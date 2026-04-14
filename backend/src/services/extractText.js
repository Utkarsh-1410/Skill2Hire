import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractTextFromFile({ buffer, originalName, mimeType }) {
  const name = (originalName || '').toLowerCase();
  const mt = (mimeType || '').toLowerCase();

  if (mt.includes('pdf') || name.endsWith('.pdf')) {
    try {
      const data = await pdfParse(buffer);
      return normalizeText(data.text || '');
    } catch {
      return '';
    }
  }

  if (mt.includes('word') || name.endsWith('.docx')) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return normalizeText(result.value || '');
    } catch {
      return '';
    }
  }

  if (mt.includes('text') || name.endsWith('.txt')) {
    return normalizeText(buffer.toString('utf8'));
  }

  return '';
}

function normalizeText(s) {
  return String(s)
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
