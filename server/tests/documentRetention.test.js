import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { deleteDocument } from '../utils/fileStorage.js';

describe('Document Retention & Physical Deletion Worker', () => {
  it('physically unlinks local document file on disk', async () => {
    // 1. Create a temporary document in uploads/
    const uploadsDir = path.join(process.cwd(), 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const tempFileName = `retention-test-${Date.now()}.pdf`;
    const tempFilePath = path.join(uploadsDir, tempFileName);
    fs.writeFileSync(tempFilePath, '%PDF-1.4 Mock confidential content for test %%EOF');

    assert.ok(fs.existsSync(tempFilePath), 'Temporary file should exist prior to deletion');

    // 2. Execute deleteDocument
    const mockOrder = {
      filePath: `uploads/${tempFileName}`,
      filePublicId: '',
      fileResourceType: 'raw'
    };
    const result = await deleteDocument(mockOrder);

    assert.strictEqual(result.success, true);
    assert.strictEqual(fs.existsSync(tempFilePath), false, 'File must be physically unlinked from disk');
  });

  it('handles already-deleted or non-existent files gracefully without throwing', async () => {
    const mockOrder = {
      filePath: 'uploads/non-existent-ghost-file.pdf',
      filePublicId: '',
      fileResourceType: 'raw'
    };
    const result = await deleteDocument(mockOrder);
    assert.strictEqual(result.success, true);
  });
});

