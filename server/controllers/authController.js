const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const asyncHandler = require('express-async-handler');

// Initialize Google OAuth Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verify Google token ID and authenticate user
 * @route POST /api/auth/google
 * @access Public
 */
const googleLogin = asyncHandler(async (req, res) => {
  console.log('[AUTH-CTRL] Processing Google login request');
  
  const { tokenId } = req.body;
  
  if (!tokenId) {
    console.error('[AUTH-CTRL] Error: No token ID provided in request body');
    res.status(400);
    throw new Error('No token ID provided');
  }
  
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.error('[AUTH-CTRL] Critical Error: GOOGLE_CLIENT_ID not set in environment variables');
    res.status(500);
    throw new Error('Server configuration error');
  }
  
  if (!process.env.JWT_SECRET) {
    console.error('[AUTH-CTRL] Critical Error: JWT_SECRET not set in environment variables');
    res.status(500);
    throw new Error('Server configuration error');
  }

  try {
    console.log('[AUTH-CTRL] Attempting to verify Google ID token');
    
    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    console.log('[AUTH-CTRL] Google ID token verified successfully');
    
    // Get payload from verified token
    const payload = ticket.getPayload();
    console.log('[AUTH-CTRL] Payload received for user:', payload.email);
    
    // Extract user info from payload
    const userData = {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
    
    console.log('[AUTH-CTRL] Creating JWT token for user:', userData.email);

    // Create JWT token for our app
    const token = jwt.sign(
      userData,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('[AUTH-CTRL] JWT token created successfully');

    // Return user data and token
    res.status(200).json({
      token,
      user: userData
    });
    
    console.log('[AUTH-CTRL] Authentication successful for user:', userData.email);
  } catch (error) {
    console.error('[AUTH-CTRL] Google authentication error:', error.message);
    console.error('[AUTH-CTRL] Error details:', error);
    
    // Check for specific Google Auth errors
    if (error.message.includes('Token used too late')) {
      console.error('[AUTH-CTRL] Token expired or used too late');
      res.status(401);
      throw new Error('Authentication token expired');
    } else if (error.message.includes('Wrong number of segments')) {
      console.error('[AUTH-CTRL] Malformed token');
      res.status(400);
      throw new Error('Malformed authentication token');
    } else if (error.message.includes('audience')) {
      console.error('[AUTH-CTRL] Token audience mismatch');
      res.status(401);
      throw new Error('Token client ID does not match application');
    }
    
    res.status(401);
    throw new Error('Invalid authentication token');
  }
});

/**
 * Get current user information
 * @route GET /api/auth/me
 * @access Private
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  console.log('[AUTH-CTRL] Getting current user information');
  
  // User info is already added to req by the auth middleware
  if (!req.user) {
    console.error('[AUTH-CTRL] Error: User not authenticated');
    res.status(401);
    throw new Error('Not authenticated');
  }
  
  console.log('[AUTH-CTRL] Returning user info for:', req.user.email);

  res.status(200).json({
    user: req.user
  });
});

module.exports = {
  googleLogin,
  getCurrentUser
};