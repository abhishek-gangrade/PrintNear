/**
 * PDF Inspector - Pure JavaScript PDF binary validator and page count extractor.
 * Avoids native binary or network dependencies while accurately extracting page counts.
 */

export const inspectPdfBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) {
    throw new Error('Invalid file buffer: File is too small or not a valid document.');
  }

  // 1. Verify PDF Magic Bytes (%PDF-)
  const header = buffer.subarray(0, 5).toString('latin1');
  if (header !== '%PDF-') {
    throw new Error('Invalid document signature: File is not a valid PDF document.');
  }

  // 2. Decode content to latin1 string for fast regex scanning
  const content = buffer.toString('latin1');

  // Strategy A: Direct /Pages /Count match in root or branch dictionary
  // E.g., /Type /Pages /Count 4 or /Type/Pages/Count 4
  const countMatches = [...content.matchAll(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/g)];
  let maxReportedCount = 0;
  for (const match of countMatches) {
    const count = parseInt(match[1], 10);
    if (!Number.isNaN(count) && count > maxReportedCount) {
      maxReportedCount = count;
    }
  }

  // Strategy B: Count discrete /Type /Page objects (excluding /Type /Pages)
  const pageObjectMatches = content.match(/\/Type\s*\/Page(?!\w)/g);
  const discretePageCount = pageObjectMatches ? pageObjectMatches.length : 0;

  // Use the most reliable extracted page count
  let authoritativePages = maxReportedCount > 0 ? maxReportedCount : discretePageCount;

  // Safety fallback if structure is unusually encoded (fallback to 1 page minimum)
  if (!authoritativePages || authoritativePages < 1) {
    authoritativePages = 1;
  }

  return {
    isValid: true,
    pageCount: authoritativePages,
    fileSizeBytes: buffer.length,
    pdfVersion: buffer.subarray(5, 8).toString('latin1')
  };
};

