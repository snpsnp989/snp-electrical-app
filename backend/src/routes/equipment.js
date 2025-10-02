const express = require('express');
const { db } = require('../database');
const router = express.Router();

// Get all equipment
router.get('/', (req, res) => {
  const { active_only } = req.query;
  
  let query = 'SELECT * FROM equipment';
  let params = [];
  
  if (active_only === 'true') {
    query += ' WHERE is_active = 1';
  }
  
  query += ' ORDER BY name ASC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get equipment by ID
router.get('/:id', (req, res) => {
  const query = 'SELECT * FROM equipment WHERE id = ?';
  
  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Equipment not found' });
      return;
    }
    res.json(row);
  });
});

// Create new equipment
router.post('/', (req, res) => {
  const { name, description } = req.body;
  
  // Generate unique ID
  const id = 'eq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  
  const query = `
    INSERT INTO equipment (id, name, description, is_active)
    VALUES (?, ?, ?, 1)
  `;
  
  db.run(query, [id, name, description], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id, message: 'Equipment created successfully' });
  });
});

// Update equipment
router.put('/:id', (req, res) => {
  const { name, description, is_active } = req.body;
  
  const query = `
    UPDATE equipment SET 
      name = ?, description = ?, is_active = ?
    WHERE id = ?
  `;
  
  db.run(query, [name, description, is_active ? 1 : 0, req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Equipment not found' });
      return;
    }
    res.json({ message: 'Equipment updated successfully' });
  });
});

// Toggle equipment status (enable/disable)
router.patch('/:id/toggle', (req, res) => {
  const query = `
    UPDATE equipment SET is_active = NOT is_active
    WHERE id = ?
  `;
  
  db.run(query, [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Equipment not found' });
      return;
    }
    res.json({ message: 'Equipment status toggled successfully' });
  });
});

// Delete equipment
router.delete('/:id', (req, res) => {
  const query = 'DELETE FROM equipment WHERE id = ?';
  
  db.run(query, [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Equipment not found' });
      return;
    }
    res.json({ message: 'Equipment deleted successfully' });
  });
});

module.exports = router;
