import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentsAPI } from '../services/api';
import { toast } from 'react-toastify';

const DocumentView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConverting, setIsConverting] = useState(false);

  // Fetch document details on component mount
  useEffect(() => {
    fetchDocument();
  }, [id]);

  // Function to fetch document details
  const fetchDocument = async () => {
    setIsLoading(true);
    try {
      const response = await documentsAPI.getDocument(id);
      setDocument(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching document:', error);
      setError('Failed to load document. It may have been deleted or you may not have permission to view it.');
      toast.error('Error loading document');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to convert document to Google Docs
  const handleConvertToGoogleDocs = async () => {
    setIsConverting(true);
    try {
      const response = await documentsAPI.convertToGoogleDocs(id);
      
      // Update document state with Google Docs information
      setDocument({
        ...document,
        googleDocsUrl: response.data.googleDocsUrl,
        isConverted: true
      });
      
      toast.success('Document successfully converted to Google Docs!');
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to convert document. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  // Function to delete document
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      await documentsAPI.deleteDocument(id);
      toast.success('Document deleted successfully');
      navigate('/documents');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  // Loading state
  if (isLoading) {
    return <div className="spinner"></div>;
  }

  // Error state
  if (error) {
    return (
      <div className="card">
        <div className="error-message">{error}</div>
        <button className="btn btn-primary" onClick={() => navigate('/documents')}>
          Back to Documents
        </button>
      </div>
    );
  }

  // Document details
  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate('/documents')}
          style={{ marginRight: '10px' }}
        >
          ← Back to Documents
        </button>
      </div>
      
      <h2>{document.fileName}</h2>
      
      <div className="document-view">
        <div className="document-preview">
          {document.fileType.includes('pdf') ? (
            // PDF Preview
            <embed 
              src={documentsAPI.getDownloadUrl(document.id)} 
              type="application/pdf"
              width="100%"
              height="600px"
            />
          ) : (
            // Other file types - simple preview
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div style={{ fontSize: '72px', marginBottom: '20px' }}>
                {document.fileType.includes('docx') ? '📝' : '📄'}
              </div>
              <h3>{document.fileName}</h3>
              <p>
                {document.fileType.includes('docx') 
                  ? 'DOCX file preview not available' 
                  : 'File preview not available'}
              </p>
              <p>Convert to Google Docs for online editing</p>
            </div>
          )}
        </div>
        
        <div className="document-actions-panel">
          <div className="action-block">
            <h3 className="action-title">Document Details</h3>
            <p><strong>File Name:</strong> {document.fileName}</p>
            <p><strong>File Type:</strong> {document.fileType}</p>
            <p><strong>Size:</strong> {formatFileSize(document.fileSize)}</p>
            <p><strong>Uploaded:</strong> {formatDate(document.createdAt)}</p>
          </div>
          
          <div className="action-block">
            <h3 className="action-title">Actions</h3>
            <div className="action-buttons">
              <a 
                href={documentsAPI.getDownloadUrl(document.id)} 
                className="btn btn-secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download Original
              </a>
              
              {document.isConverted ? (
                <a 
                  href={document.googleDocsUrl} 
                  className="btn btn-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Edit in Google Docs
                </a>
              ) : (
                <button 
                  className="btn btn-primary"
                  onClick={handleConvertToGoogleDocs}
                  disabled={isConverting}
                >
                  {isConverting ? 'Converting...' : 'Make Editable'}
                </button>
              )}
              
              <button 
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete Document
              </button>
            </div>
          </div>
          
          {document.isConverted && (
            <div className="action-block">
              <h3 className="action-title">Google Docs Integration</h3>
              <p>This document has been converted to Google Docs format.</p>
              <p>You can edit it online using Google Docs and all changes will be saved automatically.</p>
              <a 
                href={document.googleDocsUrl} 
                className="btn btn-primary"
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: '10px' }}
              >
                Open in Google Docs
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to format date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export default DocumentView;