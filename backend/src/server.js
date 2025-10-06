const express = require('express');
const cors = require('cors');
const path = require('path');
const jobRoutes = require('./routes/jobs-firebase');
const customerRoutes = require('./routes/customers');
const technicianRoutes = require('./routes/technicians');
const equipmentRoutes = require('./routes/equipment');
const reportRoutes = require('./routes/reports');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/jobs', jobRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SNP Electrical API is running' });
});

// Note: Frontend is deployed separately on Firebase
// This backend only serves API endpoints

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SNP Electrical API server running on port ${PORT}`);
  console.log(`Accessible at: http://192.168.0.223:${PORT}`);
});

module.exports = app;
