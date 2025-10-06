const express = require('express');
const { db } = require('../firebase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Get all technicians
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const techniciansSnapshot = await db.collection('technicians').orderBy('name').get();
    const technicians = [];
    
    techniciansSnapshot.forEach(doc => {
      technicians.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(technicians);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get technician by ID
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const technicianDoc = await db.collection('technicians').doc(req.params.id).get();
    
    if (!technicianDoc.exists) {
      res.status(404).json({ error: 'Technician not found' });
      return;
    }
    
    res.json({
      id: technicianDoc.id,
      ...technicianDoc.data()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new technician
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, specializations } = req.body;
    
    const technicianData = {
      name,
      email,
      phone: phone || null,
      specializations: specializations || null,
      created_at: new Date()
    };
    
    const docRef = await db.collection('technicians').add(technicianData);
    
    res.json({ id: docRef.id, message: 'Technician created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update technician
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, specializations } = req.body;
    
    const technicianData = {
      name,
      email,
      phone: phone || null,
      specializations: specializations || null,
      updated_at: new Date()
    };
    
    await db.collection('technicians').doc(req.params.id).update(technicianData);
    
    res.json({ message: 'Technician updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete technician
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.collection('technicians').doc(req.params.id).delete();
    
    res.json({ message: 'Technician deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;