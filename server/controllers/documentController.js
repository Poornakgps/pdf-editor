const path = require('path');
const fs = require('fs');
const asyncHandler = require('express-async-handler');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const googleDriveService = require('../services/googleDriveService');
const { 
  ensureUploadsDirectory, 
  generateUniqueFilename, 
  getMimeType, 
  deleteFile 
} = require('../utils/fileUtils');

// In-memory storage for document metadata
// In a production app, this would be a database
const documentsStore = {};

// Set up multer for file upload
const uploadsDir = ensureUploadsDirectory();
console.log('[DOC-CTRL] Uploads directory set to:', uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('[DOC-CTRL] Setting destination for file upload:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = generateUniqueFilename(file.originalname);
    console.log('[DOC-CTRL] Generated unique filename:', uniqueFilename, 'for original:', file.originalname);
    cb(null, uniqueFilename);
  }
});

// Validate file type
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ];
  
  console.log('[DOC-CTRL] Validating file mimetype:', file.mimetype);
  
  if (allowedTypes.includes(file.mimetype)) {
    console.log('[DOC-CTRL] File type validation passed for:', file.originalname);
    cb(null, true);
  } else {
    console.log('[DOC-CTRL] File type validation failed for:', file.originalname, 'with type:', file.mimetype);
    cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'), false);
  }
};

// Set up multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).single('document');

/**
 * Upload a document
 * @route POST /api/documents/upload
 * @access Private
 */
const uploadDocument = (req, res) => {
  console.log('[DOC-CTRL] Processing document upload request');
  
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      console.error('[DOC-CTRL] Multer error during upload:', err.code, err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      console.error('[DOC-CTRL] Non-Multer error during upload:', err.message);
      return res.status(400).json({ error: err.message });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      console.error('[DOC-CTRL] No file found in request');
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    
    console.log('[DOC-CTRL] File uploaded successfully:', req.file.originalname);
    console.log('[DOC-CTRL] File details:', {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    });
    
    // Generate unique ID for document
    const documentId = uuidv4();
    console.log('[DOC-CTRL] Generated document ID:', documentId);
    
    // Ensure user data is available
    if (!req.user || !req.user.googleId) {
      console.error('[DOC-CTRL] Error: User data missing in request');
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    // Save document metadata to in-memory store
    documentsStore[documentId] = {
      id: documentId,
      userId: req.user.googleId,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      uploadedFile: req.file.filename,
      createdAt: new Date(),
      isConverted: false,
      googleDocsUrl: null,
      googleFileId: null
    };
    
    console.log('[DOC-CTRL] Document metadata stored for ID:', documentId);
    
    // Return success response
    res.status(201).json({
      message: 'Document uploaded successfully',
      documentId,
      fileName: req.file.originalname
    });
    
    console.log('[DOC-CTRL] Upload complete for document:', documentId);
  });
};

/**
 * Get all documents for a user
 * @route GET /api/documents
 * @access Private
 */
const getAllDocuments = asyncHandler(async (req, res) => {
  console.log('[DOC-CTRL] Fetching all documents for user');
  
  // Ensure user data is available
  if (!req.user || !req.user.googleId) {
    console.error('[DOC-CTRL] Error: User data missing in request');
    res.status(401);
    throw new Error('User authentication required');
  }
  
  const userId = req.user.googleId;
  console.log('[DOC-CTRL] User ID for document fetch:', userId);
  
  // Filter documents by user ID
  const userDocuments = Object.values(documentsStore)
    .filter(doc => doc.userId === userId)
    .map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      createdAt: doc.createdAt,
      isConverted: doc.isConverted,
      googleDocsUrl: doc.googleDocsUrl
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  console.log('[DOC-CTRL] Found', userDocuments.length, 'documents for user');
  
  res.status(200).json(userDocuments);
});

/**
 * Get a document by ID
 * @route GET /api/documents/:id
 * @access Private
 */
const getDocumentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log('[DOC-CTRL] Fetching document with ID:', id);
  
  // Ensure user data is available
  if (!req.user || !req.user.googleId) {
    console.error('[DOC-CTRL] Error: User data missing in request');
    res.status(401);
    throw new Error('User authentication required');
  }
  
  const userId = req.user.googleId;
  
  // Check if document exists
  const document = documentsStore[id];
  
  if (!document) {
    console.error('[DOC-CTRL] Document not found with ID:', id);
    res.status(404);
    throw new Error('Document not found');
  }
  
  console.log('[DOC-CTRL] Document found, checking user access');
  
  // Check if user has access to document
  if (document.userId !== userId) {
    console.error('[DOC-CTRL] Access denied for user', userId, 'to document', id);
    res.status(403);
    throw new Error('Access denied');
  }
  
  console.log('[DOC-CTRL] Access granted, returning document metadata');
  
  // Return document metadata
  res.status(200).json({
    id: document.id,
    fileName: document.fileName,
    fileType: document.fileType,
    fileSize: document.fileSize,
    createdAt: document.createdAt,
    isConverted: document.isConverted,
    googleDocsUrl: document.googleDocsUrl
  });
});

/**
 * Download a document
 * @route GET /api/documents/:id/download
 * @access Private
 */
const downloadDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log('[DOC-CTRL] Processing download request for document ID:', id);
  
  // Ensure user data is available
  if (!req.user || !req.user.googleId) {
    console.error('[DOC-CTRL] Error: User data missing in request');
    res.status(401);
    throw new Error('User authentication required');
  }
  
  const userId = req.user.googleId;
  
  // Check if document exists
  const document = documentsStore[id];
  
  if (!document) {
    console.error('[DOC-CTRL] Document not found with ID:', id);
    res.status(404);
    throw new Error('Document not found');
  }
  
  console.log('[DOC-CTRL] Document found, checking user access');
  
  // Check if user has access to document
  if (document.userId !== userId) {
    console.error('[DOC-CTRL] Access denied for user', userId, 'to document', id);
    res.status(403);
    throw new Error('Access denied');
  }
  
  console.log('[DOC-CTRL] Checking if file exists at path:', document.filePath);
  
  // Check if file exists
  if (!fs.existsSync(document.filePath)) {
    console.error('[DOC-CTRL] File not found at path:', document.filePath);
    res.status(404);
    throw new Error('File not found');
  }
  
  console.log('[DOC-CTRL] File exists, setting up download stream');
  
  // Set headers for download
  res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
  res.setHeader('Content-Type', document.fileType);
  
  // Stream file to response
  const fileStream = fs.createReadStream(document.filePath);
  fileStream.on('error', (err) => {
    console.error('[DOC-CTRL] Error streaming file:', err);
    res.status(500).end();
  });
  
  console.log('[DOC-CTRL] Streaming file to client');
  fileStream.pipe(res);
});

/**
 * Convert document to Google Docs
 * @route POST /api/documents/:id/convert
 * @access Private
 */
const convertToGoogleDocs = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log('[DOC-CTRL] Processing conversion request for document ID:', id);
  
  // Ensure user data is available
  if (!req.user || !req.user.googleId || !req.user.email) {
    console.error('[DOC-CTRL] Error: User data missing in request');
    res.status(401);
    throw new Error('User authentication required');
  }
  
  const userId = req.user.googleId;
  const userEmail = req.user.email;
  
  console.log('[DOC-CTRL] User info for conversion:', {
    id: userId,
    email: userEmail
  });
  
  // Check if document exists
  const document = documentsStore[id];
  
  if (!document) {
    console.error('[DOC-CTRL] Document not found with ID:', id);
    res.status(404);
    throw new Error('Document not found');
  }
  
  console.log('[DOC-CTRL] Document found, checking user access');
  
  // Check if user has access to document
  if (document.userId !== userId) {
    console.error('[DOC-CTRL] Access denied for user', userId, 'to document', id);
    res.status(403);
    throw new Error('Access denied');
  }
  
  try {
    console.log('[DOC-CTRL] Extracting access token from authorization header');
    
    // Check if authorization header exists
    if (!req.headers.authorization) {
      console.error('[DOC-CTRL] No authorization header found');
      res.status(401);
      throw new Error('No authorization token provided');
    }
    
    const authParts = req.headers.authorization.split(' ');
    if (authParts.length !== 2 || authParts[0] !== 'Bearer') {
      console.error('[DOC-CTRL] Invalid authorization header format');
      res.status(401);
      throw new Error('Invalid authorization header format');
    }
    
    const accessToken = authParts[1];
    console.log('[DOC-CTRL] Token extracted from header, initializing Drive client');
    
    // Initialize Google Drive client
    googleDriveService.initDriveClient({
      accessToken: accessToken
    }, userEmail);
    
    console.log('[DOC-CTRL] Drive client initialized, uploading file');
    console.log('[DOC-CTRL] File details for upload:', {
      path: document.filePath,
      name: document.fileName,
      mimeType: getMimeType(document.fileName)
    });
    
    // Upload file to Google Drive
    const uploadedFile = await googleDriveService.uploadFile(
      userEmail,
      document.filePath,
      document.fileName,
      getMimeType(document.fileName)
    );
    
    console.log('[DOC-CTRL] File uploaded to Google Drive with ID:', uploadedFile.id);
    console.log('[DOC-CTRL] Converting file to Google Docs format');
    
    // Convert file to Google Docs
    const convertedFile = await googleDriveService.convertToGoogleDocs(
      userEmail,
      uploadedFile.id
    );
    
    console.log('[DOC-CTRL] File converted successfully with ID:', convertedFile.id);
    console.log('[DOC-CTRL] Google Docs URL:', convertedFile.webViewLink);
    
    // Update document metadata
    documentsStore[id] = {
      ...document,
      isConverted: true,
      googleDocsUrl: convertedFile.webViewLink,
      googleFileId: convertedFile.id
    };
    
    console.log('[DOC-CTRL] Document metadata updated with Google Docs info');
    
    // Return success response
    res.status(200).json({
      message: 'Document converted successfully',
      googleDocsUrl: convertedFile.webViewLink
    });
    
    console.log('[DOC-CTRL] Conversion process completed successfully');
  } catch (error) {
    console.error('[DOC-CTRL] Conversion error:', error.message);
    console.error('[DOC-CTRL] Error details:', error);
    
    // Check for auth-related errors
    if (error.message && error.message.includes('Authentication failed')) {
      console.error('[DOC-CTRL] Google Drive authentication failed');
      res.status(401);
      throw new Error('Google Drive authentication failed: ' + error.message);
    }
    
    res.status(500);
    throw new Error('Failed to convert document: ' + error.message);
  }
});

/**
 * Delete a document
 * @route DELETE /api/documents/:id
 * @access Private
 */
const deleteDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log('[DOC-CTRL] Processing delete request for document ID:', id);
  
  // Ensure user data is available
  if (!req.user || !req.user.googleId || !req.user.email) {
    console.error('[DOC-CTRL] Error: User data missing in request');
    res.status(401);
    throw new Error('User authentication required');
  }
  
  const userId = req.user.googleId;
  const userEmail = req.user.email;
  
  // Check if document exists
  const document = documentsStore[id];
  
  if (!document) {
    console.error('[DOC-CTRL] Document not found with ID:', id);
    res.status(404);
    throw new Error('Document not found');
  }
  
  console.log('[DOC-CTRL] Document found, checking user access');
  
  // Check if user has access to document
  if (document.userId !== userId) {
    console.error('[DOC-CTRL] Access denied for user', userId, 'to document', id);
    res.status(403);
    throw new Error('Access denied');
  }
  
  try {
    console.log('[DOC-CTRL] Deleting file from local storage:', document.filePath);
    
    // Delete file from storage
    deleteFile(document.filePath);
    
    // Delete file from Google Drive if it was converted
    if (document.isConverted && document.googleFileId) {
      console.log('[DOC-CTRL] Document has Google Drive file, attempting to delete from Drive');
      console.log('[DOC-CTRL] Google File ID:', document.googleFileId);
      
      try {
        console.log('[DOC-CTRL] Extracting access token for Google Drive deletion');
        
        // Check if authorization header exists
        if (!req.headers.authorization) {
          console.error('[DOC-CTRL] No authorization header found for Google Drive deletion');
          throw new Error('No authorization token provided');
        }
        
        const authParts = req.headers.authorization.split(' ');
        if (authParts.length !== 2 || authParts[0] !== 'Bearer') {
          console.error('[DOC-CTRL] Invalid authorization header format for Google Drive deletion');
          throw new Error('Invalid authorization header format');
        }
        
        // Initialize Google Drive client
        console.log('[DOC-CTRL] Initializing Drive client for deletion');
        googleDriveService.initDriveClient({
          accessToken: authParts[1]
        }, userEmail);
        
        // Delete file from Google Drive
        console.log('[DOC-CTRL] Deleting file from Google Drive');
        await googleDriveService.deleteFile(userEmail, document.googleFileId);
        console.log('[DOC-CTRL] Google Drive file deleted successfully');
      } catch (driveError) {
        console.error('[DOC-CTRL] Error deleting from Google Drive:', driveError.message);
        console.error('[DOC-CTRL] Drive error details:', driveError);
        // Continue even if Google Drive deletion fails
        console.log('[DOC-CTRL] Continuing with document deletion despite Google Drive error');
      }
    }
    
    // Remove document from store
    console.log('[DOC-CTRL] Removing document from store');
    delete documentsStore[id];
    
    // Return success response
    console.log('[DOC-CTRL] Document deleted successfully');
    res.status(200).json({
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('[DOC-CTRL] Deletion error:', error.message);
    console.error('[DOC-CTRL] Error details:', error);
    res.status(500);
    throw new Error('Failed to delete document: ' + error.message);
  }
});

module.exports = {
  uploadDocument,
  getAllDocuments,
  getDocumentById,
  downloadDocument,
  convertToGoogleDocs,
  deleteDocument
};