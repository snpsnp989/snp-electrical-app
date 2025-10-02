const express = require('express');
const router = express.Router();
const db = require('../database');
const nodemailer = require('nodemailer');

// Gmail Email Configuration (safe for deploy)
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

let transporter;
if (!EMAIL_USER || !EMAIL_PASS) {
  // Use a mock transporter in environments without credentials to avoid crashes
  transporter = {
    sendMail: async (options) => {
      console.log('=== EMAIL SENDING (MOCK MODE) ===');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('Attachments:', options.attachments?.length || 0);
      return { messageId: 'mock-' + Date.now() };
    }
  };
  console.log('📭 Email credentials not set. Using mock transporter (no real emails will be sent).');
} else {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
  });
  // Test email configuration only when real creds are present
  transporter.verify((error) => {
    if (error) {
      console.log('❌ Gmail configuration error:', error);
    } else {
      console.log('✅ Gmail server is ready to send messages');
      console.log('📧 Email will be sent from:', EMAIL_USER);
    }
  });
}

// SNP Electrical Company Information
const COMPANY_CONFIG = {
  name: 'SNP Electrical',
  adminEmail: 'snpelec@gmail.com', // SNP admin email
  supportEmail: 'snpelec@gmail.com',
  website: 'www.snpelectrical.com',
  phone: '(03) 1234 5678' // Add your phone number
};

// Note: verification handled above only when real credentials exist

// Email template for customer reports
const generateEmailTemplate = (jobs, customerName) => {
  const jobCount = jobs.length;
  const jobList = jobs.map(job => `
    <div style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px;">
      <h4 style="margin: 0 0 10px 0; color: #333;">${job.title}</h4>
      <p style="margin: 5px 0;"><strong>Equipment:</strong> ${job.equipment || 'N/A'}</p>
      <p style="margin: 5px 0;"><strong>Service Type:</strong> ${job.service_type || 'N/A'}</p>
      <p style="margin: 5px 0;"><strong>Completed:</strong> ${job.completed_date || 'N/A'}</p>
      <p style="margin: 5px 0;"><strong>Report #:</strong> ${job.snpid || job.id}</p>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Service Reports - ${jobCount} Report${jobCount > 1 ? 's' : ''}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #f4f4f4; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; }
        .highlight { background-color: #e7f3ff; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; }
        .job-summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Service Reports</h1>
        <p>${jobCount} Service Report${jobCount > 1 ? 's' : ''} - ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="content">
        <h2>Dear ${customerName},</h2>
        
        <p>Please find attached ${jobCount} service report${jobCount > 1 ? 's' : ''} for the work completed on your equipment.</p>
        
        <div class="highlight">
          <h3>Summary of Completed Work:</h3>
          ${jobList}
        </div>
        
        <div class="job-summary">
          <h3>What's Included:</h3>
          <ul>
            <li>Detailed service reports for each completed job</li>
            <li>Equipment information and fault descriptions</li>
            <li>Actions taken and service type classification</li>
            <li>Completion dates and technician details</li>
          </ul>
        </div>
        
        <p>If you have any questions about these service reports, please don't hesitate to contact us.</p>
        
        <p>Thank you for choosing our services.</p>
        
        <p>Best regards,<br>
        <strong>${COMPANY_CONFIG.name} Team</strong><br>
        <em>Professional Electrical Services</em></p>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <h4 style="margin: 0 0 10px 0; color: #333;">Contact Information</h4>
          <p style="margin: 5px 0;"><strong>Phone:</strong> ${COMPANY_CONFIG.phone}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${COMPANY_CONFIG.supportEmail}</p>
          <p style="margin: 5px 0;"><strong>Website:</strong> ${COMPANY_CONFIG.website}</p>
        </div>
      </div>
      
      <div class="footer">
        <p>This is an automated message from ${COMPANY_CONFIG.name}.</p>
        <p>For support, contact us at: ${COMPANY_CONFIG.supportEmail}</p>
        <p>© ${new Date().getFullYear()} ${COMPANY_CONFIG.name}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
};

// Send reports to customers
router.post('/send-reports', async (req, res) => {
  try {
    const { jobIds } = req.body;
    
    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({ error: 'No job IDs provided' });
    }

    console.log('Sending reports for job IDs:', jobIds);

    // Get job details from database
    const placeholders = jobIds.map(() => '?').join(',');
    const jobs = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM jobs WHERE id IN (${placeholders})`, jobIds, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (jobs.length === 0) {
      return res.status(404).json({ error: 'No jobs found' });
    }

    console.log(`Found ${jobs.length} jobs to send`);

    // Group jobs by customer email to send one email per customer
    const customerGroups = {};
    
    for (const job of jobs) {
      // Get customer email (you may need to adjust this based on your data structure)
      const customerEmail = job.client_email || job.customer_email || 'customer@example.com';
      const customerName = job.client_name || job.end_customer_name || 'Valued Customer';
      
      if (!customerGroups[customerEmail]) {
        customerGroups[customerEmail] = {
          customerName: customerName,
          jobs: []
        };
      }
      customerGroups[customerEmail].jobs.push(job);
    }

    const results = [];
    
    // Send one email per customer with all their PDFs attached
    for (const [customerEmail, customerData] of Object.entries(customerGroups)) {
      try {
        console.log(`Sending email to ${customerEmail} with ${customerData.jobs.length} reports`);
        
        // Generate PDFs for all jobs for this customer
        const attachments = [];
        
        for (const job of customerData.jobs) {
          try {
            // Generate PDF for the job (works locally and on Render)
            const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5001}`;
            const pdfResponse = await fetch(`${baseUrl}/api/pdf/job/${job.id}`);
            if (!pdfResponse.ok) {
              throw new Error(`Failed to generate PDF for job ${job.id}`);
            }
            
            const pdfBuffer = await pdfResponse.buffer();
            
            attachments.push({
              filename: `service-report-${job.id}-${job.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            });
            
            console.log(`Generated PDF for job ${job.id}: ${job.title}`);
            
          } catch (error) {
            console.error(`Error generating PDF for job ${job.id}:`, error);
            // Continue with other PDFs even if one fails
          }
        }
        
        if (attachments.length === 0) {
          throw new Error('No PDFs could be generated');
        }
        
        // Generate email content for all jobs
        const emailHtml = generateEmailTemplate(customerData.jobs, customerData.customerName);
        
        // Send single email with all PDFs attached
        const mailOptions = {
          from: `"${COMPANY_CONFIG.name}" <${COMPANY_CONFIG.adminEmail}>`,
          to: customerEmail,
          subject: `Service Reports - ${customerData.jobs.length} Report${customerData.jobs.length > 1 ? 's' : ''} (${new Date().toLocaleDateString()})`,
          html: emailHtml,
          attachments: attachments
        };
        
        console.log(`Sending email with ${attachments.length} PDF attachments`);
        await transporter.sendMail(mailOptions);
        
        // Update all jobs to mark as sent
        for (const job of customerData.jobs) {
          await new Promise((resolve, reject) => {
            db.run(
              'UPDATE jobs SET pdf_generated = 1 WHERE id = ?',
              [job.id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
          
          results.push({
            jobId: job.id,
            status: 'sent',
            customerEmail: customerEmail,
            pdfGenerated: true
          });
        }
        
        console.log(`Successfully sent ${attachments.length} reports to ${customerEmail}`);
        
      } catch (error) {
        console.error(`Error sending reports to ${customerEmail}:`, error);
        
        // Mark all jobs for this customer as failed
        for (const job of customerData.jobs) {
          results.push({
            jobId: job.id,
            status: 'failed',
            customerEmail: customerEmail,
            error: error.message
          });
        }
      }
    }
    
    const successCount = results.filter(r => r.status === 'sent').length;
    const failureCount = results.filter(r => r.status === 'failed').length;
    
    console.log(`Email sending complete: ${successCount} successful, ${failureCount} failed`);
    
    res.json({
      message: `Reports sent: ${successCount} successful, ${failureCount} failed`,
      totalJobs: jobs.length,
      totalCustomers: Object.keys(customerGroups).length,
      results: results
    });
    
  } catch (error) {
    console.error('Error sending reports:', error);
    res.status(500).json({ error: 'Failed to send reports' });
  }
});

module.exports = router;
