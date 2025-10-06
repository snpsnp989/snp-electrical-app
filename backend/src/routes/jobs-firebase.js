const express = require('express');
const { db } = require('../firebase');
const { authenticateToken, requireTechnicianOrAdmin, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Get all jobs with customer and technician info
router.get('/', authenticateToken, requireTechnicianOrAdmin, async (req, res) => {
  try {
    const jobsSnapshot = await db.collection('jobs').orderBy('created_at', 'desc').get();
    const jobs = [];
    
    for (const jobDoc of jobsSnapshot.docs) {
      const jobData = jobDoc.data();
      const job = {
        id: jobDoc.id,
        ...jobData,
        created_at: jobData.created_at?.toDate?.() || jobData.created_at,
        updated_at: jobData.updated_at?.toDate?.() || jobData.updated_at,
        completed_date: jobData.completed_date?.toDate?.() || jobData.completed_date,
        requested_date: jobData.requested_date?.toDate?.() || jobData.requested_date,
        due_date: jobData.due_date?.toDate?.() || jobData.due_date
      };
      
      // Get customer info if customer_id exists
      if (jobData.customer_id) {
        try {
          const customerDoc = await db.collection('customers').doc(jobData.customer_id).get();
          if (customerDoc.exists) {
            const customerData = customerDoc.data();
            job.customer_name = customerData.name;
            job.customer_email = customerData.email;
            job.customer_phone = customerData.phone;
            job.customer_address = customerData.address;
          }
        } catch (err) {
          console.error('Error fetching customer:', err);
        }
      }
      
      // Get technician info if technician_id exists
      if (jobData.technician_id) {
        try {
          const technicianDoc = await db.collection('technicians').doc(jobData.technician_id).get();
          if (technicianDoc.exists) {
            const technicianData = technicianDoc.data();
            job.technician_name = technicianData.name;
            job.technician_email = technicianData.email;
            job.technician_phone = technicianData.phone;
          }
        } catch (err) {
          console.error('Error fetching technician:', err);
        }
      }
      
      jobs.push(job);
    }
    
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get job by ID
router.get('/:id', authenticateToken, requireTechnicianOrAdmin, async (req, res) => {
  try {
    const jobDoc = await db.collection('jobs').doc(req.params.id).get();
    
    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    
    const jobData = jobDoc.data();
    const job = {
      id: jobDoc.id,
      ...jobData,
      created_at: jobData.created_at?.toDate?.() || jobData.created_at,
      updated_at: jobData.updated_at?.toDate?.() || jobData.updated_at,
      completed_date: jobData.completed_date?.toDate?.() || jobData.completed_date,
      requested_date: jobData.requested_date?.toDate?.() || jobData.requested_date,
      due_date: jobData.due_date?.toDate?.() || jobData.due_date
    };
    
    // Get customer info if customer_id exists
    if (jobData.customer_id) {
      try {
        const customerDoc = await db.collection('customers').doc(jobData.customer_id).get();
        if (customerDoc.exists) {
          const customerData = customerDoc.data();
          job.customer_name = customerData.name;
          job.customer_email = customerData.email;
          job.customer_phone = customerData.phone;
          job.customer_address = customerData.address;
        }
      } catch (err) {
        console.error('Error fetching customer:', err);
      }
    }
    
    // Get technician info if technician_id exists
    if (jobData.technician_id) {
      try {
        const technicianDoc = await db.collection('technicians').doc(jobData.technician_id).get();
        if (technicianDoc.exists) {
          const technicianData = technicianDoc.data();
          job.technician_name = technicianData.name;
          job.technician_email = technicianData.email;
          job.technician_phone = technicianData.phone;
        }
      } catch (err) {
        console.error('Error fetching technician:', err);
      }
    }
    
    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new job
router.post('/', authenticateToken, requireTechnicianOrAdmin, async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    // Generate SNP ID (simple counter for now)
    const jobsSnapshot = await db.collection('jobs').get();
    const snpid = jobsSnapshot.size + 1;
    
    const docRef = await db.collection('jobs').add({
      ...jobData,
      snpid
    });
    
    res.json({ 
      id: docRef.id, 
      snpid,
      message: 'Job created successfully' 
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update job
router.put('/:id', authenticateToken, requireTechnicianOrAdmin, async (req, res) => {
  try {
    const jobRef = db.collection('jobs').doc(req.params.id);
    const jobDoc = await jobRef.get();
    
    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    
    const updates = {
      ...req.body,
      updated_at: new Date()
    };
    
    // If status is being set to completed, set completed_date
    if (req.body.status === 'completed') {
      updates.completed_date = new Date();
    }
    
    await jobRef.update(updates);
    
    
    res.json({ message: 'Job updated successfully' });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete job
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const jobRef = db.collection('jobs').doc(req.params.id);
    const jobDoc = await jobRef.get();
    
    if (!jobDoc.exists) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    
    await jobRef.delete();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restore job by SNP ID
router.get('/restore-by-snp/:snpid', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const snpid = parseInt(req.params.snpid);
    const jobsSnapshot = await db.collection('jobs').where('snpid', '==', snpid).get();
    
    if (jobsSnapshot.empty) {
      res.status(404).json({ error: `No job found with Service Report Number ${snpid}` });
      return;
    }
    
    const jobDoc = jobsSnapshot.docs[0];
    const jobId = jobDoc.id;
    
    await db.collection('jobs').doc(jobId).update({
      status: 'completed',
      completed_date: new Date(),
      updated_at: new Date()
    });
    
    
    res.json({ message: 'Job restored to completed', jobId, snpid });
  } catch (error) {
    console.error('Error restoring job:', error);
    res.status(500).json({ error: 'Failed to restore job' });
  }
});

module.exports = router;
