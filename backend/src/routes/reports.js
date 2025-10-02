const express = require('express');
const nodemailer = require('nodemailer');
const { db } = require('../database');
const router = express.Router();

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can change this to your preferred email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Get all service reports
router.get('/', (req, res) => {
  const query = `
    SELECT 
      sr.*,
      j.title as job_title,
      c.name as customer_name,
      c.email as customer_email
    FROM service_reports sr
    JOIN jobs j ON sr.job_id = j.id
    JOIN customers c ON j.customer_id = c.id
    ORDER BY sr.created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get reports ready for monthly email
router.get('/monthly', (req, res) => {
  const query = `
    SELECT 
      sr.*,
      j.title as job_title,
      j.completed_date,
      c.name as customer_name,
      c.email as customer_email
    FROM service_reports sr
    JOIN jobs j ON sr.job_id = j.id
    JOIN customers c ON j.customer_id = c.id
    WHERE sr.email_sent = 0 AND j.status = 'completed'
    ORDER BY c.name, j.completed_date
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Create service report
router.post('/', (req, res) => {
  const { job_id, report_content } = req.body;
  
  const query = 'INSERT INTO service_reports (job_id, report_content) VALUES (?, ?)';
  
  db.run(query, [job_id, report_content], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'Service report created successfully' });
  });
});

// Send monthly service reports
router.post('/send-monthly', async (req, res) => {
  try {
    // Get all unsent reports grouped by customer
    const query = `
      SELECT 
        c.name as customer_name,
        c.email as customer_email,
        GROUP_CONCAT(
          j.title || ' - Completed: ' || j.completed_date || '\n' || sr.report_content, 
          '\n\n---\n\n'
        ) as reports_content
      FROM service_reports sr
      JOIN jobs j ON sr.job_id = j.id
      JOIN customers c ON j.customer_id = c.id
      WHERE sr.email_sent = 0 AND j.status = 'completed'
      GROUP BY c.id, c.name, c.email
    `;
    
    db.all(query, [], async (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (rows.length === 0) {
        res.json({ message: 'No reports to send' });
        return;
      }
      
      // Send emails to each customer
      const emailPromises = rows.map(row => {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: row.customer_email,
          subject: `SNP Electrical - Monthly Service Reports`,
          html: `
            <h2>SNP Electrical - Monthly Service Reports</h2>
            <p>Dear ${row.customer_name},</p>
            <p>Please find below the service reports for work completed this month:</p>
            <div style="white-space: pre-line;">${row.reports_content}</div>
            <p>Thank you for choosing SNP Electrical for your maintenance needs.</p>
            <p>Best regards,<br>SNP Electrical Team</p>
          `
        };
        
        return transporter.sendMail(mailOptions);
      });
      
      try {
        await Promise.all(emailPromises);
        
        // Mark reports as sent
        const updateQuery = 'UPDATE service_reports SET email_sent = 1, sent_date = CURRENT_DATE WHERE email_sent = 0';
        db.run(updateQuery, [], (err) => {
          if (err) {
            console.error('Error updating email status:', err);
          }
        });
        
        res.json({ 
          message: `Successfully sent ${rows.length} monthly service report emails`,
          customers: rows.length
        });
      } catch (emailError) {
        res.status(500).json({ error: 'Failed to send emails: ' + emailError.message });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send individual service report
router.post('/send/:id', async (req, res) => {
  try {
    const query = `
      SELECT 
        sr.*,
        j.title as job_title,
        c.name as customer_name,
        c.email as customer_email
      FROM service_reports sr
      JOIN jobs j ON sr.job_id = j.id
      JOIN customers c ON j.customer_id = c.id
      WHERE sr.id = ?
    `;
    
    db.get(query, [req.params.id], async (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (!row) {
        res.status(404).json({ error: 'Service report not found' });
        return;
      }
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: row.customer_email,
        subject: `SNP Electrical - Service Report: ${row.job_title}`,
        html: `
          <h2>SNP Electrical - Service Report</h2>
          <p>Dear ${row.customer_name},</p>
          <h3>Job: ${row.job_title}</h3>
          <div style="white-space: pre-line;">${row.report_content}</div>
          <p>Thank you for choosing SNP Electrical.</p>
          <p>Best regards,<br>SNP Electrical Team</p>
        `
      };
      
      try {
        await transporter.sendMail(mailOptions);
        
        // Mark as sent
        const updateQuery = 'UPDATE service_reports SET email_sent = 1, sent_date = CURRENT_DATE WHERE id = ?';
        db.run(updateQuery, [req.params.id], (err) => {
          if (err) {
            console.error('Error updating email status:', err);
          }
        });
        
        res.json({ message: 'Service report sent successfully' });
      } catch (emailError) {
        res.status(500).json({ error: 'Failed to send email: ' + emailError.message });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
