# Firebase Setup Guide for SNP Electrical

## Why Firebase for Off-Site Technicians?

✅ **Real-time updates** - See job status changes instantly  
✅ **Mobile-optimized** - Perfect for phones and tablets  
✅ **Offline sync** - Works without internet, syncs when connected  
✅ **Photo uploads** - Technicians can attach photos to jobs  
✅ **Push notifications** - Alert technicians of new assignments  
✅ **GPS tracking** - Know where work was performed  

## Setup Steps

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it "SNP Electrical" (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Firestore Database

1. In your Firebase project, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location close to you
5. Click "Done"

### 3. Enable Authentication

1. Go to "Authentication" in the left menu
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

### 4. Enable Storage (for photos)

1. Go to "Storage" in the left menu
2. Click "Get started"
3. Choose "Start in test mode"
4. Select a location
5. Click "Done"

### 5. Get Configuration Keys

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Web app" icon (</>)
4. Register app with name "SNP Electrical Web"
5. Copy the configuration object

### 6. Update Environment Variables

1. Copy `frontend/.env.example` to `frontend/.env`
2. Paste your Firebase config:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### 7. Set Up Database Rules

In Firestore Database → Rules, replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents for authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 8. Set Up Storage Rules

In Storage → Rules, replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Mobile Access for Technicians

### For Technicians (Mobile View):
- URL: `http://localhost:3000?role=technician`
- Automatically shows mobile-optimized interface
- Real-time job updates
- Photo upload capability
- Offline functionality

### For Managers (Desktop View):
- URL: `http://localhost:3000` or `http://localhost:3000?role=manager`
- Full desktop interface
- All management features
- Real-time dashboard updates

## Key Features for Off-Site Work

### Real-Time Updates
- Job status changes appear instantly
- No need to refresh the page
- Technicians see new assignments immediately

### Mobile Optimization
- Touch-friendly interface
- Large buttons for easy tapping
- Optimized for phone screens
- Works in portrait and landscape

### Photo Documentation
- Technicians can upload photos
- Photos are automatically organized by job
- Captions for context
- Stored securely in Firebase

### Offline Capability
- Works without internet connection
- Data syncs when connection restored
- No lost work due to poor signal

## Testing the Setup

1. **Start the application:**
   ```bash
   cd frontend
   npm start
   ```

2. **Test mobile view:**
   - Open browser developer tools
   - Switch to mobile view (iPhone/Android)
   - Add `?role=technician` to URL
   - Should show mobile technician interface

3. **Test real-time updates:**
   - Open two browser windows
   - One as manager, one as technician
   - Create a job in manager view
   - Should appear instantly in technician view

## Production Deployment

For production, you'll want to:

1. **Set up proper authentication**
2. **Configure security rules**
3. **Set up user roles and permissions**
4. **Enable push notifications**
5. **Configure email service for reports**

## Cost Considerations

- **Firebase Free Tier:** 1GB storage, 50K reads/day, 20K writes/day
- **Typical usage:** 100-500 jobs/month = well within free tier
- **Scaling:** Pay-as-you-grow pricing
- **Estimated cost:** $0-10/month for small-medium business

## Support

The Firebase setup provides:
- Real-time job updates
- Mobile-optimized interface
- Photo uploads
- Offline functionality
- Secure data storage
- Easy scaling

Perfect for off-site technicians with just their phones!
