# Document Editor

A web application that allows users to upload document files (PDF, DOCX, TXT) and convert them to editable Google Docs format.

## Features

- File upload component that accepts PDF, DOCX, and TXT files
- Document listing page showing all uploaded documents
- Document view page with options to download the original file and a 'Make Editable' button
- Google Drive API integration for document conversion and storage
- Authentication using Google OAuth for accessing Google Drive
- Proper error handling and loading states

## Project Structure

```
document-editor/
├── client/            # React frontend
│   ├── public/        
│   ├── src/           
│   │   ├── components/
│   │   ├── services/  
│   │   ├── App.jsx    
│   │   └── ...        
│   ├── .env           # Frontend environment variables
│   └── package.json   
├── server/            # Node.js backend
│   ├── controllers/   
│   ├── middleware/    
│   ├── services/      
│   ├── utils/         
│   ├── routes/        
│   ├── config/        
│   ├── .env           # Backend environment variables
│   └── package.json   
├── .gitignore
├── README.md
└── package.json       # Root package.json for project setup
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google API credentials for OAuth and Drive API

## Installation

1. Clone the repository
2. Install all dependencies:
   ```
   npm run install-all
   ```
3. Configure the environment variables:
   - Create `.env` file in the `client` directory:
     ```
     REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
     REACT_APP_API_URL=http://localhost:5000/api
     ```
   - Create `.env` file in the `server` directory:
     ```
     PORT=5000
     JWT_SECRET=your_jwt_secret_key_here
     GOOGLE_CLIENT_ID=your_google_client_id
     GOOGLE_CLIENT_SECRET=your_google_client_secret
     GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
     ```
4. Update `server/config/credentials.json` with your Google API credentials

## Google API Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Drive API
4. Configure the OAuth consent screen
5. Create OAuth 2.0 client ID credentials
6. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://localhost:5000`
7. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
8. Copy the Client ID and Client Secret to your `.env` files

## Running the Application

To run both the frontend and backend concurrently:

```
npm start
```

For development with hot reloading:

```
npm run dev
```

To run only the backend:

```
npm run server
```

To run only the frontend:

```
npm run client
```

## Access the Application

Open your browser and navigate to:

```
http://localhost:3000
```

## Building for Production

```
npm run build
```

## Notes

- This implementation stores document metadata in memory. In a production environment, you would use a database like MongoDB or PostgreSQL.
- Uploaded files are stored locally in the `server/uploads` directory. In a production environment, consider using cloud storage like AWS S3 or Google Cloud Storage.