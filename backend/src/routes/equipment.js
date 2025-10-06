const express = require('express');
const { db } = require('../firebase');
const router = express.Router();

// Get all equipment
router.get('/', async (req, res) => {
  try {
    const { active_only } = req.query;
    
    let query = db.collection('equipment');
    
    if (active_only === 'true') {
      query = query.where('is_active', '==', true);
    }
    
    const equipmentSnapshot = await query.orderBy('name').get();
    const equipment = [];
    
    equipmentSnapshot.forEach(doc => {
      equipment.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get equipment by ID
router.get('/:id', async (req, res) => {
  try {
    const equipmentDoc = await db.collection('equipment').doc(req.params.id).get();
    
    if (!equipmentDoc.exists) {
      res.status(404).json({ error: 'Equipment not found' });
      return;
    }
    
    res.json({
      id: equipmentDoc.id,
      ...equipmentDoc.data()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new equipment
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    console.log('Equipment POST request received:', { name, description });
    
    if (!name || name.trim() === '') {
      res.status(400).json({ error: 'Equipment name is required' });
      return;
    }
    
    // Generate unique ID
    const id = 'eq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    
    const equipmentData = {
      name,
      description: description || null,
      is_active: true,
      created_at: new Date()
    };
    
    await db.collection('equipment').doc(id).set(equipmentData);
    
    console.log('Equipment created successfully:', id);
    res.json({ id, message: 'Equipment created successfully' });
  } catch (error) {
    console.error('Database error creating equipment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update equipment
router.put('/:id', async (req, res) => {
  try {
    const { name, description, is_active } = req.body;
    
    const equipmentData = {
      name,
      description: description || null,
      is_active: is_active !== false,
      updated_at: new Date()
    };
    
    await db.collection('equipment').doc(req.params.id).update(equipmentData);
    
    res.json({ message: 'Equipment updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle equipment status (enable/disable)
router.patch('/:id/toggle', async (req, res) => {
  try {
    const equipmentDoc = await db.collection('equipment').doc(req.params.id).get();
    
    if (!equipmentDoc.exists) {
      res.status(404).json({ error: 'Equipment not found' });
      return;
    }
    
    const currentData = equipmentDoc.data();
    await db.collection('equipment').doc(req.params.id).update({
      is_active: !currentData.is_active,
      updated_at: new Date()
    });
    
    res.json({ message: 'Equipment status toggled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete equipment
router.delete('/:id', async (req, res) => {
  try {
    await db.collection('equipment').doc(req.params.id).delete();
    
    res.json({ message: 'Equipment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;