const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate JWT tokens
 * Verifies the token from the Authorization header
 * Sets req.user with the decoded token payload
 */
const authenticateToken = (req, res, next) => {
  console.log('[AUTH] Processing authentication request');
  
  // Get auth header
  const authHeader = req.headers.authorization;
  console.log('[AUTH] Authorization header:', authHeader ? 'Present' : 'Missing');
  
  if (!authHeader) {
    console.log('[AUTH] Error: No authorization header found');
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }
  
  // Extract token from Bearer format
  const token = authHeader.split(' ')[1]; // Bearer TOKEN format
  console.log('[AUTH] Token extraction attempt:', token ? 'Successful' : 'Failed');
  
  if (!token) {
    console.log('[AUTH] Error: Token extraction failed from header:', authHeader);
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }
  
  try {
    console.log('[AUTH] Attempting to verify token');
    
    if (!process.env.JWT_SECRET) {
      console.error('[AUTH] Critical Error: JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[AUTH] Token verified successfully for user:', decoded.email || decoded.userId || 'Unknown');
    
    // Set the user information in request for use in route handlers
    req.user = decoded;
    console.log('[AUTH] User context set in request object');
    
    // Continue to the next middleware or route handler
    console.log('[AUTH] Proceeding to next middleware/route handler');
    next();
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error.name);
    console.error('[AUTH] Error details:', error.message);
    
    // More specific error response based on the error type
    if (error.name === 'TokenExpiredError') {
      console.log('[AUTH] Token has expired');
      return res.status(401).json({ error: 'Unauthorized - Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      console.log('[AUTH] Invalid token signature or format');
      return res.status(403).json({ error: 'Forbidden - Invalid token' });
    }
    
    return res.status(403).json({ error: 'Forbidden - Invalid token' });
  }
};

module.exports = { authenticateToken };