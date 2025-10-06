const express = require('express');
const { db } = require('../firebase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Get all customers
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const customersSnapshot = await db.collection('customers').orderBy('name').get();
    const customers = [];
    
    customersSnapshot.forEach(doc => {
      customers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer by ID
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const customerDoc = await db.collection('customers').doc(req.params.id).get();
    
    if (!customerDoc.exists) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    
    res.json({
      id: customerDoc.id,
      ...customerDoc.data()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new customer
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, contact_name, email, phone, address } = req.body;
    
    const customerData = {
      name,
      contact_name: contact_name || null,
      email,
      phone: phone || null,
      address: address || null,
      created_at: new Date()
    };
    
    const docRef = await db.collection('customers').add(customerData);
    
    res.json({ id: docRef.id, message: 'Customer created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, contact_name, email, phone, address } = req.body;
    
    const customerData = {
      name,
      contact_name: contact_name || null,
      email,
      phone: phone || null,
      address: address || null,
      updated_at: new Date()
    };
    
    await db.collection('customers').doc(req.params.id).update(customerData);
    
    res.json({ message: 'Customer updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete customer
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.collection('customers').doc(req.params.id).delete();
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;