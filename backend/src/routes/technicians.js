const express = require('express');
const { db } = require('../database');
const router = express.Router();

// Get all technicians
router.get('/', (req, res) => {
  const query = 'SELECT * FROM technicians ORDER BY name';
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get technician by ID
router.get('/:id', (req, res) => {
  const query = 'SELECT * FROM technicians WHERE id = ?';
  
  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Technician not found' });
      return;
    }
    res.json(row);
  });
});

// Create new technician
router.post('/', (req, res) => {
  const { name, email, phone, specializations } = req.body;
  
  const query = 'INSERT INTO technicians (name, email, phone, specializations) VALUES (?, ?, ?, ?)';
  
  db.run(query, [name, email, phone, specializations], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'Technician created successfully' });
  });
});

// Update technician
router.put('/:id', (req, res) => {
  const { name, email, phone, specializations } = req.body;
  
  const query = 'UPDATE technicians SET name = ?, email = ?, phone = ?, specializations = ? WHERE id = ?';
  
  db.run(query, [name, email, phone, specializations, req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Technician updated successfully' });
  });
});

// Delete technician
router.delete('/:id', (req, res) => {
  const query = 'DELETE FROM technicians WHERE id = ?';
  
  db.run(query, [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Technician deleted successfully' });
  });
});

module.exports = router;
