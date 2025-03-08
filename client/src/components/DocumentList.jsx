import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { documentsAPI } from '../services/api';
import { toast } from 'react-toastify';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Function to fetch documents from API
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await documentsAPI.getAllDocuments();
      setDocuments(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to load documents. Please try again later.');
      toast.error('Error loading documents');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to delete a document
  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      await documentsAPI.deleteDocument(id);
      // Remove the deleted document from state
      setDocuments(documents.filter(doc => doc.id !== id));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  // Function to get document icon based on file type
  const getDocumentIcon = (fileType) => {
    if (fileType.includes('pdf')) {
      return '📄';
    } else if (fileType.includes('docx') || fileType.includes('word')) {
      return '📝';
    } else if (fileType.includes('text/plain')) {
      return '📃';
    } else {
      return '📄';
    }
  };

  // Function to format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
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
        <button className="btn btn-primary" onClick={fetchDocuments}>
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (documents.length === 0) {
    return (
      <div className="card">
        <h2>No Documents Found</h2>
        <p>Upload your first document to get started.</p>
        <Link to="/upload" className="btn btn-primary">
          Upload Document
        </Link>
      </div>
    );
  }

  // Document list
  return (
    <div>
      <div className="document-list-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Your Documents</h2>
        <Link to="/upload" className="btn btn-primary">
          Upload New Document
        </Link>
      </div>
      
      <div className="document-list">
        {documents.map(document => (
          <Link 
            to={`/documents/${document.id}`} 
            key={document.id}
            className="document-card"
            style={{ textDecoration: 'none' }}
          >
            <div className="document-thumbnail">
              {getDocumentIcon(document.fileType)}
            </div>
            <div className="document-info">
              <h3 className="document-title">{document.fileName}</h3>
              <div className="document-meta">
                <div>Uploaded: {formatDate(document.createdAt)}</div>
                <div>Size: {formatFileSize(document.fileSize)}</div>
              </div>
              <div className="document-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(documentsAPI.getDownloadUrl(document.id), '_blank');
                  }}
                >
                  Download
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={(e) => handleDelete(e, document.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </Link>
        ))}
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

export default DocumentList;