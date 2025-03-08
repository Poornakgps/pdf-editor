const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Create uploads directory if it doesn't exist
 * @returns {String} Path to uploads directory
 */
const ensureUploadsDirectory = () => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  return uploadsDir;
};

/**
 * Generate a unique filename for upload
 * @param {String} originalFilename - Original filename
 * @returns {String} Unique filename
 */
const generateUniqueFilename = (originalFilename) => {
  const extension = path.extname(originalFilename);
  const filename = path.basename(originalFilename, extension);
  const timestamp = Date.now();
  const uuid = uuidv4().substring(0, 8);
  
  return `${filename}-${timestamp}-${uuid}${extension}`;
};

/**
 * Get MIME type for Google Drive based on file extension
 * @param {String} filename - Filename with extension
 * @returns {String} MIME type for Google Drive
 */
const getMimeType = (filename) => {
  const extension = path.extname(filename).toLowerCase();
  
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf',
    '.odt': 'application/vnd.oasis.opendocument.text'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
};

/**
 * Delete a file
 * @param {String} filePath - Path to file
 * @returns {Boolean} Success status
 */
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

module.exports = {
  ensureUploadsDirectory,
  generateUniqueFilename,
  getMimeType,
  deleteFile
};