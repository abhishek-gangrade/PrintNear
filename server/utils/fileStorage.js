import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

const getUploadsDir = () => path.join(process.cwd(), 'uploads');

const uploadLocal = async (file) => {
  const dir = getUploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const destination = path.join(dir, safeName);
  fs.writeFileSync(destination, file.buffer);
  return { path: `uploads/${safeName}`, publicId: '', resourceType: 'raw' };
};

const uploadCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'printnear/orders',
        resource_type: 'raw',
        type: 'authenticated',
        use_filename: true,
        unique_filename: true,
        overwrite: false
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          path: '',
          publicId: result.public_id,
          resourceType: result.resource_type
        });
      }
    );
    stream.end(file.buffer);
  });

export const uploadDocument = (file) => hasCloudinary ? uploadCloudinary(file) : uploadLocal(file);

/**
 * Generates an authoritative, protected document access endpoint
 * Instead of exposing raw storage URLs, clients always route through the authenticated API.
 */
export const getDocumentUrl = (order) => {
  if (!order || (!order.filePath && !order.filePublicId)) return null;
  const baseUrl = process.env.PUBLIC_API_URL || '';
  return `${baseUrl}/api/orders/${order._id}/document`;
};

/**
 * Returns a short-lived signed URL for Cloudinary assets (60-second expiration)
 */
export const getSignedCloudinaryUrl = (publicId, resourceType = 'raw') => {
  if (!hasCloudinary || !publicId) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + 60; // 60 seconds TTL
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: 'authenticated',
    secure: true,
    sign_url: true,
    expires_at: expiresAt
  });
};

/**
 * Securely streams a locally stored document to an authorized response
 */
export const streamLocalDocument = (relativeFilePath, res, originalFileName = 'document.pdf') => {
  const fullPath = path.resolve(process.cwd(), relativeFilePath.replace(/^\/+/, ''));
  const uploadsDir = getUploadsDir();

  // Path Traversal Security Guard
  if (!fullPath.startsWith(uploadsDir) && !fullPath.includes('uploads')) {
    throw new Error('Access denied: Invalid file path.');
  }

  if (!fs.existsSync(fullPath)) {
    return false;
  }

  const isPdf = originalFileName.toLowerCase().endsWith('.pdf') || fullPath.toLowerCase().endsWith('.pdf');
  res.setHeader('Content-Type', isPdf ? 'application/pdf' : 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalFileName)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

  const stream = fs.createReadStream(fullPath);
  stream.pipe(res);
  return true;
};

/**
 * Verifies physical deletion from storage (Cloudinary or local disk)
 */
export const deleteDocument = async (order) => {
  let deletedFromCloud = false;
  let deletedFromDisk = false;

  if (order.filePublicId && hasCloudinary) {
    try {
      await cloudinary.uploader.destroy(order.filePublicId, {
        resource_type: order.fileResourceType || 'raw',
        type: 'authenticated',
        invalidate: true
      });
      deletedFromCloud = true;
    } catch (err) {
      console.error('[Cloudinary Deletion Error]', err.message);
    }
  }

  if (order.filePath) {
    try {
      const fullPath = path.join(process.cwd(), order.filePath.replace(/^\/+/, ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        deletedFromDisk = true;
      } else {
        deletedFromDisk = true; // Already gone
      }
    } catch (err) {
      console.error('[Local Disk Deletion Error]', err.message);
    }
  }

  return {
    success: (order.filePublicId ? deletedFromCloud : true) && (order.filePath ? deletedFromDisk : true)
  };
};
