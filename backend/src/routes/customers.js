const express = require('express');
const { db } = require('../database');
const router = express.Router();

// Get all customers
router.get('/', (req, res) => {
  const query = 'SELECT * FROM customers ORDER BY name';
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get customer by ID
router.get('/:id', (req, res) => {
  const query = 'SELECT * FROM customers WHERE id = ?';
  
  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json(row);
  });
});

// Create new customer
router.post('/', (req, res) => {
  const { name, contact_name, email, phone, address } = req.body;
  
  const query = 'INSERT INTO customers (name, contact_name, email, phone, address) VALUES (?, ?, ?, ?, ?)';
  
  db.run(query, [name, contact_name || null, email, phone || null, address || null], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'Customer created successfully' });
  });
});

// Update customer
router.put('/:id', (req, res) => {
  const { name, contact_name, email, phone, address } = req.body;
  
  const query = 'UPDATE customers SET name = ?, contact_name = ?, email = ?, phone = ?, address = ? WHERE id = ?';
  
  db.run(query, [name, contact_name || null, email, phone || null, address || null, req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Customer updated successfully' });
  });
});

// Delete customer
router.delete('/:id', (req, res) => {
  const query = 'DELETE FROM customers WHERE id = ?';
  
  db.run(query, [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Customer deleted successfully' });
  });
});

module.exports = router;
