// Email Configuration
// Copy these settings to your emailReports.js file or set as environment variables

// Gmail Configuration:
const GMAIL_CONFIG = {
  user: 'your-email@gmail.com',        // Your Gmail address
  pass: 'your-16-character-app-password', // Your Gmail App Password (not your regular password)
  host: 'smtp.gmail.com',
  port: 587,
  secure: false
};

// Outlook/Hotmail Configuration:
const OUTLOOK_CONFIG = {
  user: 'your-email@outlook.com',
  pass: 'your-password',
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false
};

// Custom SMTP Configuration:
const CUSTOM_CONFIG = {
  user: 'your-email@yourdomain.com',
  pass: 'your-password',
  host: 'smtp.your-provider.com',
  port: 587, // or 465 for SSL
  secure: false // true for SSL
};

// Company Information
const COMPANY_INFO = {
  name: 'SNP Electrical',
  email: 'noreply@snpelectrical.com',
  supportEmail: 'support@snpelectrical.com',
  website: 'www.snpelectrical.com'
};

module.exports = {
  GMAIL_CONFIG,
  OUTLOOK_CONFIG,
  CUSTOM_CONFIG,
  COMPANY_INFO
};
