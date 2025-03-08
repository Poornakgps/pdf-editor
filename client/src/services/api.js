import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Add request interceptor to include auth token in all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  googleLogin: (tokenId) => api.post('/auth/google', { tokenId }),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};

// Documents API
export const documentsAPI = {
  // Get all documents for the current user
  getAllDocuments: () => api.get('/documents'),
  
  // Get a single document by ID
  getDocument: (id) => api.get(`/documents/${id}`),
  
  // Upload a new document
  uploadDocument: (formData, onUploadProgress) => {
    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (onUploadProgress) {
          onUploadProgress(percentCompleted);
        }
      }
    });
  },
  
  // Delete a document
  deleteDocument: (id) => api.delete(`/documents/${id}`),
  
  // Convert document to Google Docs
  convertToGoogleDocs: (id) => api.post(`/documents/${id}/convert`),
  
  // Get document download URL
  getDownloadUrl: (id) => `/api/documents/${id}/download`
};

export default api;