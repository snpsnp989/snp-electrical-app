const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
// Using Firebase Admin SDK (server-side)
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Generate a new service report
router.post('/generate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { job_id, job_data } = req.body;
    
    if (!job_id || !job_data) {
      return res.status(400).json({ error: 'Job ID and job data are required' });
    }

    // Generate report number
    const reportNumber = `SR-${Date.now()}`;
    
    // Create report record in Firebase
    const reportData = {
      job_id: job_id,
      report_number: reportNumber,
      generated_date: new Date().toISOString(),
      status: 'generated',
      job_data: job_data,
      created_at: new Date()
    };

    const reportRef = await db.collection('service_reports').add(reportData);
    
    // Generate PDF
    const pdfUrl = await generatePDF(reportNumber, job_data);
    
    // Update report with PDF URL
    await db.collection('service_reports').doc(reportRef.id).update({
      pdf_url: pdfUrl,
      updated_at: new Date()
    });

    res.json({
      success: true,
      report_id: reportRef.id,
      report_number: reportNumber,
      pdf_url: pdfUrl
    });

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get all reports
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const reportsSnapshot = await db.collection('service_reports').get();
    const reports = reportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Download report PDF
router.get('/:reportId/download', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const reportDoc = await db.collection('service_reports').doc(reportId).get();
    
    if (!reportDoc.exists) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const reportData = reportDoc.data();
    
    if (!reportData.pdf_url) {
      return res.status(404).json({ error: 'PDF not generated yet' });
    }
    
    // For now, we'll generate the PDF on-demand
    // In production, you might want to store the PDF file
    const pdfBuffer = await generatePDFBuffer(reportData.report_number, reportData.job_data);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="service-report-${reportData.report_number}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

// Generate PDF HTML template
function generateReportHTML(jobData) {
  const currentDate = new Date().toLocaleDateString();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Service Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .company-name {
          font-size: 28px;
          font-weight: bold;
          color: #333;
          margin-bottom: 10px;
        }
        .company-details {
          font-size: 14px;
          color: #666;
        }
        .report-title {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          margin: 20px 0;
        }
        .job-details {
          margin-bottom: 30px;
        }
        .detail-row {
          display: flex;
          margin-bottom: 10px;
          border-bottom: 1px solid #eee;
          padding: 8px 0;
        }
        .detail-label {
          font-weight: bold;
          width: 200px;
          color: #333;
        }
        .detail-value {
          flex: 1;
          color: #666;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #333;
          margin-bottom: 15px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        .content {
          color: #666;
          line-height: 1.6;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-name">SNP Electrical</div>
          <div class="company-details">
            Professional Electrical Services<br>
            Phone: (02) 1234 5678 | Email: info@snpelectrical.com.au<br>
            ABN: 12 345 678 901 | REC: 16208
          </div>
        </div>
        
        <div class="report-title">Service Report</div>
        
        <div class="job-details">
          <div class="detail-row">
            <div class="detail-label">Service Report #:</div>
            <div class="detail-value">${jobData.snpid || 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Date:</div>
            <div class="detail-value">${currentDate}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Client:</div>
            <div class="detail-value">${jobData.client_name || 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">End Customer:</div>
            <div class="detail-value">${jobData.end_customer_name || 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Site Address:</div>
            <div class="detail-value">${jobData.site_address || 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Service Type:</div>
            <div class="detail-value">${jobData.service_type || 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Technician:</div>
            <div class="detail-value">${jobData.technician_name || 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Arrival Time:</div>
            <div class="detail-value">${jobData.arrival_time || 'N/A'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Departure Time:</div>
            <div class="detail-value">${jobData.departure_time || 'N/A'}</div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Fault Reported</div>
          <div class="content">${jobData.fault_reported || 'No fault details provided'}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Action Taken</div>
          <div class="content">${jobData.action_taken || 'No action details provided'}</div>
        </div>
        
        ${jobData.parts_json ? `
        <div class="section">
          <div class="section-title">Parts Used</div>
          <div class="content">
            ${JSON.parse(jobData.parts_json).map(part => 
              `• ${part.description} (Qty: ${part.qty})`
            ).join('<br>')}
          </div>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>This service report was generated on ${currentDate}</p>
          <p>SNP Electrical - Professional Electrical Services</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate PDF file
async function generatePDF(reportNumber, jobData) {
  const html = generateReportHTML(jobData);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
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
  
  // For now, return a placeholder URL
  // In production, you'd save the PDF to a file storage service
  return `https://snp-electrical-backend.onrender.com/api/reports/pdf/${reportNumber}`;
}

// Generate PDF buffer for download
async function generatePDFBuffer(reportNumber, jobData) {
  const html = generateReportHTML(jobData);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
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
  
  return pdf;
}

module.exports = router;
