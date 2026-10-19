import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { inspectPdfBuffer } from '../utils/pdfInspector.js';

describe('PDF Inspector Binary Validation & Page Count', () => {
  it('should reject non-PDF file buffers', () => {
    const invalidBuffer = Buffer.from('NOT A PDF FILE');
    assert.throws(() => inspectPdfBuffer(invalidBuffer), /Invalid document signature/);
  });

  it('should accurately inspect a valid PDF document', () => {
    const samplePath = path.join(process.cwd(), 'uploads/1791020507883-12437_3_884821_1783060551_Palo_Alto_Networks_Course_Certificate_of_Completion.pdf');
    if (fs.existsSync(samplePath)) {
      const buffer = fs.readFileSync(samplePath);
      const result = inspectPdfBuffer(buffer);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(typeof result.pageCount, 'number');
      assert.strictEqual(result.pageCount, 1);
      assert.strictEqual(result.pdfVersion, '1.7');
    }
  });

  it('should parse synthetic multi-page PDF structure', () => {
    // Construct minimal valid PDF binary with 3 page objects
    const syntheticPdf = Buffer.from(
      '%PDF-1.4\n' +
      '1 0 obj <</Type /Pages /Count 3 /Kids [2 0 R 3 0 R 4 0 R]>> endobj\n' +
      '2 0 obj <</Type /Page /Parent 1 0 R>> endobj\n' +
      '3 0 obj <</Type /Page /Parent 1 0 R>> endobj\n' +
      '4 0 obj <</Type /Page /Parent 1 0 R>> endobj\n' +
      '%%EOF'
    );
    const result = inspectPdfBuffer(syntheticPdf);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.pageCount, 3);
  });
});

