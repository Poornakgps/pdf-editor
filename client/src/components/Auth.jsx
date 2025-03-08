import React, { useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Google OAuth Client ID from environment variable
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const Auth = ({ isAuthenticated, setIsAuthenticated, setUser }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Google OAuth
    if (!isAuthenticated) {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse
      });

      window.google?.accounts.id.renderButton(
        document.getElementById('googleSignInButton'),
        { theme: 'outline', size: 'large', width: 250 }
      );
    }
  }, [isAuthenticated]);

  // Handle the response from Google OAuth
  const handleGoogleResponse = async (response) => {
    setIsLoading(true);
    try {
      const tokenId = response.credential;
      const res = await authAPI.googleLogin(tokenId);
      
      // Save auth token and user data
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      // Update app state
      setIsAuthenticated(true);
      setUser(res.data.user);
      
      // Navigate to documents list
      navigate('/documents');
      toast.success('Successfully logged in!');
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user logout
  const handleLogout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login');
    toast.info('You have been logged out.');
  };

  // Render login button or user info based on authentication state
  if (!isAuthenticated) {
    return (
      <div className="login-card card">
        <h2 className="login-title">Welcome to Document Editor</h2>
        <p className="login-message">
          Sign in with your Google account to upload and edit documents.
        </p>
        {isLoading ? (
          <div className="spinner"></div>
        ) : (
          <div id="googleSignInButton"></div>
        )}
      </div>
    );
  }

  // User is authenticated, show the user info and logout button
  return (
    <div className="auth-section">
      <div className="user-info">
        {authAPI.getUser()?.picture && (
          <img 
            className="user-avatar" 
            src={authAPI.getUser()?.picture} 
            alt="User profile" 
          />
        )}
        <span className="user-name">{authAPI.getUser()?.name}</span>
      </div>
      <button onClick={handleLogout} className="btn btn-secondary">
        Logout
      </button>
    </div>
  );
};

export default Auth;