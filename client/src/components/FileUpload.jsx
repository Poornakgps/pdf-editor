import React, { useState, useRef } from 'react';
import { documentsAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) return;
    
    // Check if file type is valid
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Please select a PDF, DOCX, or TXT file.');
      return;
    }
    
    setFile(selectedFile);
    setFileName(selectedFile.name);
  };

  // Handle file upload
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file to upload.');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('document', file);
    
    try {
      const response = await documentsAPI.uploadDocument(formData, (progress) => {
        setUploadProgress(progress);
      });
      
      toast.success('Document uploaded successfully!');
      
      // Navigate to the document detail page
      navigate(`/documents/${response.data.documentId}`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
      setFile(null);
      setFileName('');
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="card">
      <h2>Upload Document</h2>
      <p>Upload PDF, DOCX, or TXT files to convert them to editable Google Docs.</p>
      
      <div 
        className="file-upload-area" 
        onClick={triggerFileInput}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        />
        
        {fileName ? (
          <div>
            <p>Selected file: <strong>{fileName}</strong></p>
            <p>Click to change file</p>
          </div>
        ) : (
          <div>
            <p>Click to select a file or drag and drop</p>
            <p>(PDF, DOCX, TXT files only)</p>
          </div>
        )}
      </div>
      
      {file && (
        <div className="form-group">
          <button 
            className="btn btn-primary" 
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      )}
      
      {isUploading && (
        <div>
          <div style={{ height: '4px', width: '100%', backgroundColor: '#e1e4e8', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${uploadProgress}%`, 
                backgroundColor: '#0366d6',
                transition: 'width 0.3s ease'
              }}
            ></div>
          </div>
          <p style={{ textAlign: 'center', marginTop: '5px' }}>{uploadProgress}% uploaded</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;