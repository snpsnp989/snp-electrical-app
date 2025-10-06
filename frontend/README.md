# SNP Electrical Frontend

React frontend for SNP Electrical maintenance management system.

## Features

- **Dashboard**: Overview of jobs, customers, and technicians
- **Job Management**: Create, assign, and track maintenance jobs
- **Customer Management**: Manage customer information
- **Technician Management**: Manage technician profiles
- **Equipment Management**: Manage equipment inventory
- **Parts Management**: Manage parts inventory
- **Mobile Support**: Optimized for technician mobile access

## Technology Stack

- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Firebase** for authentication and real-time data
- **React DatePicker** for date selection
- **XLSX** for file import/export

## Environment Variables

Create a `.env` file in the root directory with your Firebase configuration:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Deployment

This frontend is designed to work with a backend API. The API URL is configured in `src/config/api.ts` and automatically detects the environment.

- **Development**: Uses `http://localhost:5001`
- **Production**: Uses Render backend URL

## Mobile Access

Technicians can access the mobile interface by adding `?role=technician` to the URL.