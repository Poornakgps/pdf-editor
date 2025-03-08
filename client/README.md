# Document Editor Frontend

A React application that allows users to upload document files (PDF, DOCX, TXT) and convert them to editable Google Docs format.

## Features

- File upload component that accepts PDF, DOCX, and TXT files
- Document listing page showing all uploaded documents
- Document view page with options to download the original file and a 'Make Editable' button
- Google Drive API integration for document conversion and storage
- Authentication using Google OAuth for accessing Google Drive
- Proper error handling and loading states

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google API credentials for OAuth and Drive API

## Installation

1. Clone the repository
2. Navigate to the client directory:
   ```
   cd document-editor/client
   ```
3. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```
4. Create a `.env` file in the client directory with the following variables:
   ```
   REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
   REACT_APP_API_URL=http://localhost:5000/api
   ```
5. Start the development server:
   ```
   npm start
   ```
   or
   ```
   yarn start
   ```

## Environment Variables

- `REACT_APP_GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:5000/api)

## Available Scripts

- `npm start`: Runs the app in development mode
- `npm build`: Builds the app for production
- `npm test`: Runs tests
- `npm eject`: Ejects from Create React App

## Project Structure

- `public/`: Static files
- `src/`: Source code
  - `components/`: React components
    - `Auth.jsx`: Authentication component
    - `DocumentList.jsx`: List of user's documents
    - `DocumentView.jsx`: Document detail view
    - `FileUpload.jsx`: File upload component
  - `services/`: API services
    - `api.js`: API client and methods
  - `App.jsx`: Main application component
  - `index.jsx`: Entry point
  - `styles.css`: Global styles

## Google OAuth Integration

This application uses Google OAuth for authentication. You need to:

1. Create a project in the Google Cloud Console
2. Enable the Google Drive API
3. Configure the OAuth consent screen
4. Create OAuth 2.0 client ID credentials
5. Add authorized JavaScript origins and redirect URIs
6. Add the client ID to your .env file

## Learn More

- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API](https://developers.google.com/drive/api/v3/about-sdk)