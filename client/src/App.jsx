import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Auth from './components/Auth';
import FileUpload from './components/FileUpload';
import DocumentList from './components/DocumentList';
import DocumentView from './components/DocumentView';
import { authAPI } from './services/api';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userData = authAPI.getUser();
      
      if (token && userData) {
        setIsAuthenticated(true);
        setUser(userData);
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (isLoading) {
      return <div className="spinner"></div>;
    }
    
    if (!isAuthenticated) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    return children;
  };

  return (
    <div className="container">
      <header className="app-header">
        <h1 className="app-title">Document Editor</h1>
        {isAuthenticated && (
          <Auth 
            isAuthenticated={isAuthenticated} 
            setIsAuthenticated={setIsAuthenticated} 
            setUser={setUser} 
          />
        )}
      </header>
      
      <main>
        <Routes>
          {/* Login Route */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
                <Navigate to="/documents" replace /> : 
                <Auth 
                  isAuthenticated={isAuthenticated} 
                  setIsAuthenticated={setIsAuthenticated} 
                  setUser={setUser} 
                />
            } 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/documents" 
            element={
              <ProtectedRoute>
                <DocumentList />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/documents/:id" 
            element={
              <ProtectedRoute>
                <DocumentView />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/upload" 
            element={
              <ProtectedRoute>
                <FileUpload />
              </ProtectedRoute>
            } 
          />
          
          {/* Default Route - Redirect to documents or login */}
          <Route 
            path="*" 
            element={
              <Navigate to={isAuthenticated ? "/documents" : "/login"} replace />
            } 
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;