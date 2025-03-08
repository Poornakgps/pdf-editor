const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Google Drive Service
 * Handles interactions with Google Drive API
 */
class GoogleDriveService {
  constructor() {
    this.driveClients = {}; // Store clients by user ID
    this.debug = process.env.DEBUG_MODE === 'true' || false;
    this.logPrefix = '[GoogleDriveService]';
    this.tokenRefreshInProgress = new Set(); // Track users with refresh in progress
    
    this.log('Service initialized');
    
    // Log environment config (without sensitive values)
    this.log(`Redirect URI: ${process.env.GOOGLE_REDIRECT_URI || 'Not set'}`);
    this.log(`Client ID configured: ${Boolean(process.env.GOOGLE_CLIENT_ID)}`);
    this.log(`Client Secret configured: ${Boolean(process.env.GOOGLE_CLIENT_SECRET)}`);
  }

  /**
   * Log helper with consistent formatting and debug control
   * @param {String} message - The message to log
   * @param {String} level - Log level (info, warn, error)
   * @param {Object} data - Optional data to log (will be sanitized)
   */
  log(message, level = 'info', data = null) {
    if (!this.debug && level === 'info') return;
    
    const logMethod = level === 'error' ? console.error : 
                      level === 'warn' ? console.warn : console.log;
    
    // Format: [GoogleDriveService][INFO] Message
    logMethod(`${this.logPrefix}[${level.toUpperCase()}] ${message}`);
    
    // Log data if provided, sanitize sensitive information
    if (data) {
      const sanitizedData = this.sanitizeData(data);
      logMethod(`${this.logPrefix}[DATA]`, sanitizedData);
    }
  }

  /**
   * Sanitize sensitive data for logging
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeData(data) {
    if (!data) return null;
    
    // Create a deep copy to avoid modifying the original
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Sanitize sensitive fields if they exist
    if (sanitized.accessToken) sanitized.accessToken = '[REDACTED]';
    if (sanitized.refreshToken) sanitized.refreshToken = '[REDACTED]';
    if (sanitized.auth?.credentials?.access_token) sanitized.auth.credentials.access_token = '[REDACTED]';
    if (sanitized.auth?.credentials?.refresh_token) sanitized.auth.credentials.refresh_token = '[REDACTED]';
    
    return sanitized;
  }

  /**
   * Verify required environment variables
   * @throws {Error} If required variables are missing
   */
  verifyEnvironmentVariables() {
    const requiredVars = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REDIRECT_URI'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
      this.log(errorMsg, 'error');
      throw new Error(errorMsg);
    }
  }

  /**
   * Initialize a Google Drive client for a user
   * @param {Object} credentials - OAuth credentials including accessToken and refreshToken
   * @param {String} userId - The user's ID to store the client reference
   * @returns {Object} The Google Drive client
   */
  initDriveClient(credentials, userId) {
    this.log(`Initializing Drive client for user: ${userId}`);
    
    // Verify environment variables
    this.verifyEnvironmentVariables();
    
    try {
      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      this.log('OAuth2 client created successfully');
      
      if (!credentials || !credentials.accessToken) {
        const errorMsg = 'Invalid credentials: accessToken is required';
        this.log(errorMsg, 'error', { credentials: this.sanitizeData(credentials) });
        throw new Error(errorMsg);
      }
      
      // Set credentials with both access token and refresh token
      const oauthCredentials = {
        access_token: credentials.accessToken
      };
      
      // Add refresh token if available
      if (credentials.refreshToken) {
        oauthCredentials.refresh_token = credentials.refreshToken;
        
        // Set token expiry time if available, or default to 1 hour from now
        if (credentials.expiryDate) {
          oauthCredentials.expiry_date = credentials.expiryDate;
        } else {
          oauthCredentials.expiry_date = Date.now() + 3600000; // 1 hour from now
        }
      }
      
      oauth2Client.setCredentials(oauthCredentials);
      
      this.log('OAuth2 credentials set successfully');

      // Create Drive client
      const drive = google.drive({
        version: 'v3',
        auth: oauth2Client
      });
      
      this.log('Drive client created successfully');

      // Store client for future use
      this.driveClients[userId] = { 
        drive, 
        oauth2Client,
        credentials: { ...credentials } // Store original credentials
      };
      
      this.log(`Drive client stored for user ${userId}`);
      return drive;
    } catch (error) {
      this.log(`Failed to initialize Drive client: ${error.message}`, 'error', { 
        error: { 
          message: error.message,
          stack: error.stack
        } 
      });
      throw error;
    }
  }

  /**
   * Get a user's Drive client
   * @param {String} userId - The user's ID
   * @returns {Object} The Google Drive client for the user
   */
  getDriveClient(userId) {
    const clientData = this.driveClients[userId];
    
    if (!clientData || !clientData.drive) {
      this.log(`No Drive client found for user: ${userId}`, 'warn');
      return null;
    }
    
    this.log(`Retrieved Drive client for user: ${userId}`);
    return clientData.drive;
  }

  /**
   * Get the OAuth2 client for a user
   * @param {String} userId - The user's ID
   * @returns {Object} The OAuth2 client for the user
   */
  getOAuth2Client(userId) {
    const clientData = this.driveClients[userId];
    
    if (!clientData || !clientData.oauth2Client) {
      this.log(`No OAuth2 client found for user: ${userId}`, 'warn');
      return null;
    }
    
    return clientData.oauth2Client;
  }

  /**
   * Refresh access token if it's expired or about to expire
   * @param {String} userId - The user's ID
   * @returns {Boolean} True if token was refreshed, false otherwise
   */
  async refreshTokenIfNeeded(userId) {
    const clientData = this.driveClients[userId];
    
    if (!clientData || !clientData.oauth2Client) {
      this.log(`No OAuth2 client found for user: ${userId}`, 'warn');
      return false;
    }
    
    const oauth2Client = clientData.oauth2Client;
    const credentials = oauth2Client.credentials;
    
    if (!credentials.refresh_token) {
      this.log(`No refresh token available for user: ${userId}`, 'warn');
      return false;
    }
    
    // Check if token is expired or will expire soon (within 5 minutes)
    const expiryDate = credentials.expiry_date;
    const now = Date.now();
    const isExpiredOrExpiringSoon = !expiryDate || expiryDate - now < 300000;
    
    // Skip if not expired and not already refreshing
    if (!isExpiredOrExpiringSoon) {
      return false;
    }
    
    // Skip if already refreshing for this user
    if (this.tokenRefreshInProgress.has(userId)) {
      this.log(`Token refresh already in progress for user: ${userId}`);
      return false;
    }
    
    try {
      this.tokenRefreshInProgress.add(userId);
      this.log(`Refreshing access token for user: ${userId}`);
      
      const { tokens } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(tokens);
      
      // Update stored credentials
      this.driveClients[userId].credentials = {
        ...this.driveClients[userId].credentials,
        accessToken: tokens.access_token,
        expiryDate: tokens.expiry_date
      };
      
      this.log(`Token refreshed successfully for user: ${userId}`);
      
      // Here you would typically update the tokens in your database
      // if you're storing user tokens persistently
      
      return true;
    } catch (error) {
      this.log(`Failed to refresh token for user: ${userId}`, 'error', {
        error: {
          message: error.message,
          stack: error.stack
        }
      });
      return false;
    } finally {
      this.tokenRefreshInProgress.delete(userId);
    }
  }

  /**
   * Upload a file to Google Drive
   * @param {String} userId - The user's ID
   * @param {String} filePath - Path to the file to upload
   * @param {String} fileName - Name for the file in Google Drive
   * @param {String} mimeType - MIME type of the file
   * @returns {Object} The uploaded file metadata
   */
  async uploadFile(userId, filePath, fileName, mimeType) {
    this.log(`Uploading file for user ${userId}: ${fileName} (${mimeType})`);
    
    try {
      // Try to refresh token if needed before proceeding
      await this.refreshTokenIfNeeded(userId);
      
      const drive = this.getDriveClient(userId);
      
      if (!drive) {
        const errorMsg = `Drive client not initialized for user: ${userId}`;
        this.log(errorMsg, 'error');
        throw new Error(errorMsg);
      }
      
      // Verify file exists
      if (!fs.existsSync(filePath)) {
        const errorMsg = `File not found: ${filePath}`;
        this.log(errorMsg, 'error');
        throw new Error(errorMsg);
      }
      
      this.log(`Preparing to upload file: ${filePath}`);

      // File metadata
      const fileMetadata = {
        name: fileName,
      };

      // Create read stream
      const fileStream = fs.createReadStream(filePath);
      
      // Handle stream errors
      fileStream.on('error', (err) => {
        this.log(`File stream error: ${err.message}`, 'error');
      });

      // Read file as media
      const media = {
        mimeType,
        body: fileStream
      };
      
      this.log('Sending upload request to Google Drive API');

      // Upload file with retries for authentication errors
      try {
        const response = await drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id,name,mimeType,webViewLink,webContentLink'
        });
        
        this.log(`File uploaded successfully. File ID: ${response.data.id}`);
        return response.data;
      } catch (apiError) {
        // Handle authentication errors with retry
        if (apiError.code === 401 || 
            (apiError.response && apiError.response.status === 401)) {
          
          this.log('Authentication error, attempting token refresh and retry', 'warn');
          
          // Force token refresh
          const refreshed = await this.refreshTokenIfNeeded(userId);
          
          if (refreshed) {
            this.log('Token refreshed, retrying upload');
            
            // Retry with fresh token
            const retryDrive = this.getDriveClient(userId);
            const retryStream = fs.createReadStream(filePath);
            
            const retryResponse = await retryDrive.files.create({
              resource: fileMetadata,
              media: {
                mimeType,
                body: retryStream
              },
              fields: 'id,name,mimeType,webViewLink,webContentLink'
            });
            
            this.log(`File uploaded successfully on retry. File ID: ${retryResponse.data.id}`);
            return retryResponse.data;
          } else {
            throw new Error('Authentication failed: Unable to refresh token');
          }
        } else {
          throw apiError;
        }
      }
    } catch (error) {
      // Format and log the error
      if (error.code === 401 || (error.response && error.response.status === 401)) {
        this.log('Authentication error: Token may be expired or invalid', 'error', {
          error: {
            code: error.code || error.response?.status,
            message: error.message,
            errors: error.errors || error.response?.data
          }
        });
        throw new Error(`Authentication failed: ${error.message}`);
      } else {
        this.log(`Upload failed: ${error.message}`, 'error', {
          error: {
            code: error.code,
            message: error.message,
            stack: error.stack,
            errors: error.errors || error.response?.data
          },
          request: {
            userId,
            fileName,
            mimeType,
            filePath
          }
        });
        throw new Error(`Failed to upload file: ${error.message}`);
      }
    }
  }

  /**
   * Convert a document to Google Docs format
   * @param {String} userId - The user's ID
   * @param {String} fileId - ID of the file to convert
   * @returns {Object} The converted file metadata
   */
  async convertToGoogleDocs(userId, fileId) {
    this.log(`Converting file to Google Docs format. User: ${userId}, File ID: ${fileId}`);
    
    try {
      // Try to refresh token if needed before proceeding
      await this.refreshTokenIfNeeded(userId);
      
      const drive = this.getDriveClient(userId);
      
      if (!drive) {
        const errorMsg = `Drive client not initialized for user: ${userId}`;
        this.log(errorMsg, 'error');
        throw new Error(errorMsg);
      }

      // Get the file metadata
      this.log('Fetching file metadata');
      const fileResponse = await drive.files.get({
        fileId,
        fields: 'name,mimeType'
      });

      const { name, mimeType } = fileResponse.data;
      this.log(`File info: name=${name}, mimeType=${mimeType}`);

      // Determine target MIME type 
      const targetMimeType = 'application/vnd.google-apps.document'; // Default to Google Docs
      
      this.log(`Creating a copy with mimeType: ${targetMimeType}`);

      // Create a copy of the file in Google Docs format with retry for auth errors
      try {
        const response = await drive.files.copy({
          fileId,
          requestBody: {
            name: `${name} (Editable)`,
            mimeType: targetMimeType
          },
          fields: 'id,name,mimeType,webViewLink'
        });
        
        this.log(`File copied successfully. New file ID: ${response.data.id}`);

        // Make file accessible with edit permissions
        await drive.permissions.create({
          fileId: response.data.id,
          requestBody: {
            role: 'writer',
            type: 'anyone',  // Make it accessible to anyone with the link
          },
          fields: 'id'
        });
        
        this.log('Permissions set successfully');
        
        // Get the web view link and convert it to an edit link
        const editLink = response.data.webViewLink.replace('/view', '/edit');
        response.data.editUrl = editLink;
        
        return response.data;
      } catch (apiError) {
        // Handle authentication errors with retry
        if (apiError.code === 401 || 
            (apiError.response && apiError.response.status === 401)) {
          
          this.log('Authentication error during conversion, attempting token refresh and retry', 'warn');
          
          // Force token refresh
          const refreshed = await this.refreshTokenIfNeeded(userId);
          
          if (refreshed) {
            this.log('Token refreshed, retrying conversion');
            
            // Retry with fresh token
            const retryDrive = this.getDriveClient(userId);
            
            const retryResponse = await retryDrive.files.copy({
              fileId,
              requestBody: {
                name: `${name} (Editable)`,
                mimeType: targetMimeType
              },
              fields: 'id,name,mimeType,webViewLink'
            });
            
            this.log(`File converted successfully on retry. File ID: ${retryResponse.data.id}`);
            
            // Set permissions on retry
            await retryDrive.permissions.create({
              fileId: retryResponse.data.id,
              requestBody: {
                role: 'writer',
                type: 'anyone',
              },
              fields: 'id'
            });
            
            // Get the web view link and convert it to an edit link
            const editLink = retryResponse.data.webViewLink.replace('/view', '/edit');
            retryResponse.data.editUrl = editLink;
            
            return retryResponse.data;
          } else {
            throw new Error('Authentication failed during conversion: Unable to refresh token');
          }
        } else {
          throw apiError;
        }
      }
    } catch (error) {
      this.log(`Conversion failed: ${error.message}`, 'error', {
        error: {
          code: error.code || error.response?.status,
          message: error.message,
          stack: error.stack,
          errors: error.errors || error.response?.data
        },
        request: {
          userId,
          fileId
        }
      });
      throw new Error(`Failed to convert document: ${error.message}`);
    }
  }

  /**
   * Delete a file from Google Drive
   * @param {String} userId - The user's ID
   * @param {String} fileId - ID of the file to delete
   * @returns {Boolean} Success status
   */
  async deleteFile(userId, fileId) {
    this.log(`Deleting file. User: ${userId}, File ID: ${fileId}`);
    
    try {
      // Try to refresh token if needed before proceeding
      await this.refreshTokenIfNeeded(userId);
      
      const drive = this.getDriveClient(userId);
      
      if (!drive) {
        const errorMsg = `Drive client not initialized for user: ${userId}`;
        this.log(errorMsg, 'error');
        throw new Error(errorMsg);
      }

      // Delete file with retry for auth errors
      try {
        await drive.files.delete({
          fileId
        });
        
        this.log(`File deleted successfully: ${fileId}`);
        return true;
      } catch (apiError) {
        // Handle authentication errors with retry
        if (apiError.code === 401 || 
            (apiError.response && apiError.response.status === 401)) {
          
          this.log('Authentication error during deletion, attempting token refresh and retry', 'warn');
          
          // Force token refresh
          const refreshed = await this.refreshTokenIfNeeded(userId);
          
          if (refreshed) {
            this.log('Token refreshed, retrying deletion');
            
            // Retry with fresh token
            const retryDrive = this.getDriveClient(userId);
            
            await retryDrive.files.delete({
              fileId
            });
            
            this.log(`File deleted successfully on retry: ${fileId}`);
            return true;
          } else {
            throw new Error('Authentication failed during deletion: Unable to refresh token');
          }
        } else {
          throw apiError;
        }
      }
    } catch (error) {
      this.log(`Deletion failed: ${error.message}`, 'error', {
        error: {
          code: error.code || error.response?.status,
          message: error.message,
          stack: error.stack,
          errors: error.errors || error.response?.data
        },
        request: {
          userId,
          fileId
        }
      });
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}

module.exports = new GoogleDriveService();