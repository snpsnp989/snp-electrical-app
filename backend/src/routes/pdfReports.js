const express = require('express');
const puppeteer = require('puppeteer');
const { db } = require('../database');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Generate PDF report for a specific job
router.get('/job/:id', async (req, res) => {
  try {
    const jobId = req.params.id;
    
    // Get job data with customer and technician info
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
    
    db.get(query, [jobId], async (err, job) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      
      // Only allow PDF generation for completed jobs
      if (job.status !== 'completed') {
        res.status(400).json({ error: 'PDF reports can only be generated for completed jobs' });
        return;
      }
      
      // Load and encode logo image
      let logoBase64 = '';
      try {
        const logoPath = path.join(__dirname, '..', 'assets', 'snp-logo.png');
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          logoBase64 = logoBuffer.toString('base64');
        }
      } catch (error) {
        console.log('Logo file not found, using CSS logo fallback');
      }

      // Generate HTML for the report
      console.log('PDF Generation - Job data:', {
        id: job.id,
        service_type: job.service_type,
        action_taken: job.action_taken
      });
      const html = generateReportHTML(job, logoBase64);
      
      // Generate PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });
      
      await browser.close();
      
      // Mark job as having PDF generated
      db.run('UPDATE jobs SET pdf_generated = 1 WHERE id = ?', [jobId], (err) => {
        if (err) {
          console.error('Error updating PDF generated status:', err);
        }
      });
      
      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="service-report-${job.snpid || jobId}.pdf"`);
      res.send(pdf);
    });
    
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

// Generate HTML template for the report
function generateReportHTML(job, logoBase64 = '') {
  const currentDate = new Date().toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
  
  const completedDate = job.completed_date ? 
    new Date(job.completed_date).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }) : currentDate;
  
  // Parse parts JSON if it exists
  let parts = [];
  if (job.parts_json) {
    try {
      parts = JSON.parse(job.parts_json);
    } catch (e) {
      console.error('Error parsing parts JSON:', e);
    }
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Service Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          font-size: 12px;
          line-height: 1.4;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
        }
        .company-info {
          flex: 1;
        }
        .logo-section {
          text-align: right;
          flex: 1;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
          text-align: center;
          line-height: 1.1;
        }
        .logo .snp {
          color: #ff6600;
          font-size: 36px;
          font-weight: 900;
          letter-spacing: 2px;
          display: block;
          margin-bottom: 2px;
        }
        .logo .electrical {
          color: #333;
          font-size: 20px;
          font-weight: 300;
          position: relative;
          display: inline-block;
          letter-spacing: 1px;
        }
        .logo .electrical::before {
          content: "|";
          color: #666;
          margin-right: 8px;
          font-weight: 300;
        }
        .logo .electrical::after {
          content: "|";
          color: #666;
          margin-left: 8px;
          font-weight: 300;
        }
        .logo .electrical-underline {
          display: block;
          height: 1px;
          background: #4A90E2;
          margin-top: 3px;
          width: 100%;
        }
        .company-details {
          text-align: center;
          font-weight: bold;
          font-size: 12px;
          margin-top: 8px;
        }
        .title {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          text-decoration: underline;
          margin: 30px 0;
        }
        .job-details {
          background-color: #f5f5f5;
          padding: 15px;
          margin-bottom: 20px;
        }
        .job-details table {
          width: 100%;
          border-collapse: collapse;
        }
        .job-details td {
          padding: 8px;
          border: none;
        }
        .job-details .label {
          background-color: #e0e0e0;
          font-weight: bold;
          width: 30%;
        }
        .fault-reported {
          background-color: #f5f5f5;
          padding: 15px;
          margin: 20px 0;
          border: 1px solid #ddd;
        }
        .fault-reported h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #333;
        }
        .fault-reported p {
          margin: 5px 0;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .action-taken {
          background-color: #f5f5f5;
          padding: 15px;
          margin: 20px 0;
          border: 1px solid #ddd;
        }
        .action-taken h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #333;
        }
        .action-taken p {
          margin: 5px 0;
          padding-left: 20px;
          line-height: 1.5;
        }
        .time-serviced {
          display: flex;
          justify-content: space-between;
          margin: 20px 0;
        }
        .time-serviced div {
          flex: 1;
          margin-right: 20px;
        }
        .time-serviced div:last-child {
          margin-right: 0;
        }
        .parts-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        .parts-table th,
        .parts-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        .parts-table th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <strong>SNP Electrical</strong><br>
          18 Newell Close, Taylors Lakes 3038<br>
          Phone: 0488 038 898<br>
          Email: snpelec@gmail.com
        </div>
        <div class="logo-section">
          <div class="logo">
            ${logoBase64 ? 
              `<img src="data:image/png;base64,${logoBase64}" alt="SNP Electrical" style="max-height: 80px; max-width: 200px;" />` :
              `<div class="snp">SNP</div>
               <div class="electrical">electrical</div>
               <div class="electrical-underline"></div>`
            }
          </div>
          <div class="company-details">
            REC 16208<br>
            ABN: 22 592 137 842
          </div>
        </div>
      </div>
      
      <div class="title">Service Report</div>
      
      <div class="job-details">
        <table>
          <tr>
            <td class="label">Service Report Number:</td>
            <td>${job.snpid || job.id}</td>
            <td class="label">Date:</td>
            <td>${completedDate}</td>
          </tr>
          <tr>
            <td class="label">Customer's Name:</td>
            <td>${job.client_name || job.customer_name || '—'}</td>
            <td class="label">Site Name:</td>
            <td>${job.end_customer_name || '—'}</td>
          </tr>
          <tr>
            <td class="label">Site:</td>
            <td>${job.site_address || job.customer_address || '—'}</td>
            <td class="label">Site Contact:</td>
            <td>${job.site_contact || '—'}</td>
          </tr>
          <tr>
            <td class="label">Phone Number:</td>
            <td>${job.site_phone || job.customer_phone || '—'}</td>
            <td class="label">Order Number:</td>
            <td>${job.order_number || '—'}</td>
          </tr>
          <tr>
            <td class="label">Service Type:</td>
            <td>${job.service_type || '—'}</td>
            <td class="label">Equipment:</td>
            <td>${job.equipment || '—'}</td>
          </tr>
        </table>
      </div>
      
      <div class="fault-reported">
        <h3>Fault Reported:</h3>
        <p>${job.fault_reported || 'No fault details provided'}</p>
      </div>
      
      <div class="action-taken">
        <h3>Action Taken:</h3>
        ${job.action_taken ? 
          job.action_taken.split('\n').map(line => `<p>• ${line}</p>`).join('') : 
          '<p>No action details provided</p>'
        }
      </div>
      
      <div class="time-serviced">
        <div>
          <strong>Arrival Time:</strong> ${job.arrival_time || '—'}
        </div>
        <div>
          <strong>Departure Time:</strong> ${job.departure_time || '—'}
        </div>
        <div>
          <strong>Serviced By:</strong> ${job.technician_name || '—'}
        </div>
      </div>
      
      ${parts.length > 0 ? `
        <table class="parts-table">
          <thead>
            <tr>
              <th>Part Number</th>
              <th>QTY</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${parts.map(part => `
              <tr>
                <td>${part.description || '—'}</td>
                <td>${part.qty || '—'}</td>
                <td>${part.description || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
      
    </body>
    </html>
  `;
}

module.exports = router;
