# Document Editor Backend

A Node.js backend for the Document Editor application with Google Drive API integration.

## Features

- Authentication using Google OAuth
- Document upload and storage
- Integration with Google Drive API for document conversion
- RESTful API for frontend integration
- JWT-based authentication

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google API credentials for OAuth and Drive API

## Installation

1. Clone the repository
2. Navigate to the server directory:
   ```
   cd document-editor/server
   ```
3. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```
4. Create a `.env` file in the server directory with the following variables:
   ```
   PORT=5000
   JWT_SECRET=your_jwt_secret_key_here
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
   ```
5. Set up your Google API credentials:
   - Create a project in the Google Cloud Console
   - Enable the Google Drive API
   - Configure the OAuth consent screen
   - Create OAuth 2.0 client ID credentials
   - Update the `config/credentials.json` file with your credentials

6. Start the server:
   ```
   npm start
   ```
   or for development with auto-restart:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user info

### Documents

- `GET /api/documents` - Get all documents for the current user
- `GET /api/documents/:id` - Get a document by ID
- `GET /api/documents/:id/download` - Download a document
- `POST /api/documents/upload` - Upload a document
- `POST /api/documents/:id/convert` - Convert a document to Google Docs
- `DELETE /api/documents/:id` - Delete a document

## Project Structure

- `config/` - Configuration files
  - `credentials.json` - Google API credentials
- `controllers/` - Route controllers
  - `authController.js` - Authentication controller
  - `documentController.js` - Document operations controller
- `middleware/` - Express middleware
  - `auth.js` - Authentication middleware
- `routes/` - API routes
  - `authRoutes.js` - Authentication routes
  - `documentRoutes.js` - Document operation routes
- `services/` - Services
  - `googleDriveService.js` - Google Drive API service
- `utils/` - Utility functions
  - `fileUtils.js` - File manipulation utilities
- `uploads/` - Directory for uploaded files (created on first use)
- `server.js` - Main application entry point

## Google Drive API Integration

The application uses the Google Drive API to:

1. Upload documents to Google Drive
2. Convert documents to Google Docs format
3. Generate shareable links for editing
4. Manage document permissions

## Notes

- For simplicity, this implementation stores document metadata in memory. In a production environment, you would use a database like MongoDB or PostgreSQL.
- Uploaded files are stored locally in the `uploads` directory. In a production environment, consider using cloud storage like AWS S3 or Google Cloud Storage.
- The authentication implementation is simplified for demonstration purposes. In a production environment, you would implement proper token refresh and more robust error handling.