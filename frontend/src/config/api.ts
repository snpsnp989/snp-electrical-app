// API Configuration
export const getApiUrl = (): string => {
  // For production (Firebase hosting), use Render backend
  if (window.location.hostname === 'snpelect.web.app' || 
      window.location.hostname === 'snpelect.firebaseapp.com') {
    return 'https://snp-electrical-app.onrender.com';
  }
  
  // For localhost development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5001';
  }
  
  // For local network development (fallback)
  return 'http://192.168.0.223:5001';
};

export default getApiUrl;
