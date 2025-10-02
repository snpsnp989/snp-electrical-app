#!/bin/bash

echo "🚀 Deploying SNP Electrical to Firebase..."

# Build the frontend
echo "📦 Building frontend..."
cd frontend
npm run build
cd ..

# Deploy to Firebase
echo "🔥 Deploying to Firebase..."
firebase deploy

echo "✅ Deployment complete!"
echo "🌐 Your app is now live at: https://your-project-id.web.app"
