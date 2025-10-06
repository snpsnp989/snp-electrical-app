const express = require('express');
const { db } = require('../firebase');
const router = express.Router();

// Get all jobs with customer and technician info
router.get('/', (req, res) => {
  const query = `
    SELECT 
      j.*,
      c.name as customer_name,
      c.email as customer_email,
      t.name as technician_name
    FROM jobs j
    LEFT JOIN customers c ON j.customer_id = c.id
    LEFT JOIN technicians t ON j.technician_id = t.id
    ORDER BY j.created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get job by ID
router.get('/:id', (req, res) => {
  const query = `
    SELECT 
      j.*,
      c.name as customer_name,
      c.email as customer_email,
      c.phone as customer_phone,
      c.address as customer_address,
      t.name as technician_name,
      t.email as technician_email,
      t.phone as technician_phone
    FROM jobs j
    LEFT JOIN customers c ON j.customer_id = c.id
    LEFT JOIN technicians t ON j.technician_id = t.id
    WHERE j.id = ?
  `;
  
  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(row);
  });
});

// Create new job
router.post('/', (req, res) => {
  const {
    customer_id, technician_id, title, description,
    requestedDate, dueDate, clientId, endCustomerId, siteId,
    siteAddress, siteContact, sitePhone, orderNumber, equipment, faultReported,
    clientName, endCustomerName
  } = req.body;
  
  const query = `
    INSERT INTO jobs (
      customer_id, technician_id, title, description,
      requested_date, due_date, client_id, end_customer_id, site_id,
      site_address, site_contact, site_phone, order_number, equipment, fault_reported,
      client_name, end_customer_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const cid = customer_id || 1; // fallback to first sample customer for now
  db.run(query, [
    cid, technician_id || null, title || 'Job', description || '',
    requestedDate || null, dueDate || null, clientId || null, endCustomerId || null, siteId || null,
    siteAddress || null, siteContact || null, sitePhone || null, orderNumber || null, equipment || null, faultReported || null,
    clientName || null, endCustomerName || null
  ], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // assign sequential SNPID starting at 1
    const getNext = 'SELECT IFNULL(MAX(snpid), 0) + 1 AS next FROM jobs';
    db.get(getNext, [], (e, row) => {
      const next = row ? row.next : 1;
      db.run('UPDATE jobs SET snpid = ? WHERE id = ?', [next, this.lastID], () => {
        res.json({ id: this.lastID, snpid: next, message: 'Job created successfully' });
      });
    });
  });
});

// Update job
router.put('/:id', async (req, res) => {
  const { technician_id, title, description, status, requestedDate, dueDate, clientId, endCustomerId, siteId, siteAddress, siteContact, sitePhone, orderNumber, equipment, faultReported, clientName, endCustomerName, arrivalTime, departureTime, actionTaken, serviceType, partsJson, service_report, photos } = req.body;
  
  console.log('Job update request body:', req.body);
  console.log('Service Type received:', serviceType);
  
  // Check if service_type column exists
  db.all("PRAGMA table_info(jobs)", [], (err, rows) => {
    if (err) {
      console.error('Error checking table schema:', err);
    } else {
      console.log('Jobs table columns:', rows.map(r => r.name));
      const hasServiceType = rows.some(r => r.name === 'service_type');
      console.log('Has service_type column:', hasServiceType);
    }
  });
  
  let query = 'UPDATE jobs SET ';
  let params = [];
  let updates = [];
  
  if (technician_id !== undefined) {
    updates.push('technician_id = ?');
    params.push(technician_id);
  }
  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
    if (status === 'completed') {
      updates.push('completed_date = CURRENT_DATE');
    }
  }
  if (requestedDate !== undefined) { updates.push('requested_date = ?'); params.push(requestedDate); }
  if (dueDate !== undefined) { updates.push('due_date = ?'); params.push(dueDate); }
  if (clientId !== undefined) { updates.push('client_id = ?'); params.push(clientId); }
  if (endCustomerId !== undefined) { updates.push('end_customer_id = ?'); params.push(endCustomerId); }
  if (siteId !== undefined) { updates.push('site_id = ?'); params.push(siteId); }
  if (siteAddress !== undefined) { updates.push('site_address = ?'); params.push(siteAddress); }
  if (siteContact !== undefined) { updates.push('site_contact = ?'); params.push(siteContact); }
  if (sitePhone !== undefined) { updates.push('site_phone = ?'); params.push(sitePhone); }
  if (orderNumber !== undefined) { updates.push('order_number = ?'); params.push(orderNumber); }
  if (equipment !== undefined) { updates.push('equipment = ?'); params.push(equipment); }
  if (faultReported !== undefined) { updates.push('fault_reported = ?'); params.push(faultReported); }
  if (clientName !== undefined) { updates.push('client_name = ?'); params.push(clientName); }
  if (endCustomerName !== undefined) { updates.push('end_customer_name = ?'); params.push(endCustomerName); }
  if (arrivalTime !== undefined) { updates.push('arrival_time = ?'); params.push(arrivalTime); }
  if (departureTime !== undefined) { updates.push('departure_time = ?'); params.push(departureTime); }
  if (actionTaken !== undefined) { updates.push('action_taken = ?'); params.push(actionTaken); }
  if (serviceType !== undefined && serviceType !== null && serviceType !== '') { 
    console.log('Adding service_type update:', serviceType);
    updates.push('service_type = ?'); 
    params.push(serviceType); 
  }
  if (partsJson !== undefined) { updates.push('parts_json = ?'); params.push(partsJson); }
  if (service_report !== undefined) {
    updates.push('service_report = ?');
    params.push(service_report);
  }
  if (photos !== undefined) {
    updates.push('photos = ?');
    params.push(JSON.stringify(photos));
  }
  
  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }
  
  query += updates.join(', ') + ' WHERE id = ?';
  params.push(req.params.id);
  
  console.log('Final update query:', query);
  console.log('Query parameters:', params);
  
  db.run(query, params, async function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }


    res.json({ message: 'Job updated successfully' });
  });
});

// Delete job
router.delete('/:id', (req, res) => {
  const query = 'DELETE FROM jobs WHERE id = ?';
  
  db.run(query, [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Job deleted successfully' });
  });
});

// Restore a job to completed by Service Report Number (snpid)
router.get('/restore-by-snp/:snp', async (req, res) => {
  const { snp } = req.params;
  try {
    db.get('SELECT id, status FROM jobs WHERE snpid = ?', [snp], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (!row) {
        res.status(404).json({ error: `No job found with Service Report Number ${snp}` });
        return;
      }
      const jobId = row.id;
      db.run('UPDATE jobs SET status = \'completed\', completed_date = CURRENT_DATE WHERE id = ?', [jobId], (uErr) => {
        if (uErr) {
          res.status(500).json({ error: uErr.message });
          return;
        }
        res.json({ message: 'Job restored to completed', jobId, snpid: snp });
      });
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to restore job' });
  }
});

// Test endpoint to add service_type column if missing
router.post('/fix-service-type-column', (req, res) => {
  db.run('ALTER TABLE jobs ADD COLUMN service_type TEXT', (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        res.json({ message: 'service_type column already exists' });
      } else {
        res.status(500).json({ error: err.message });
      }
    } else {
      res.json({ message: 'service_type column added successfully' });
    }
  });
});

module.exports = router;
