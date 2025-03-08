const express = require('express');
const { 
  uploadDocument, 
  getAllDocuments, 
  getDocumentById, 
  downloadDocument,
  convertToGoogleDocs,
  deleteDocument
} = require('../controllers/documentController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all document routes
router.use(authenticateToken);

// GET /api/documents - Get all documents for user
router.get('/', getAllDocuments);

// GET /api/documents/:id - Get document by ID
router.get('/:id', getDocumentById);

// GET /api/documents/:id/download - Download document
router.get('/:id/download', downloadDocument);

// POST /api/documents/upload - Upload document
router.post('/upload', uploadDocument);

// POST /api/documents/:id/convert - Convert document to Google Docs
router.post('/:id/convert', convertToGoogleDocs);

// DELETE /api/documents/:id - Delete document
router.delete('/:id', deleteDocument);

module.exports = router;