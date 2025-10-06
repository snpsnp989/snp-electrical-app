import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';
import jsPDF from 'jspdf';

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  clientName: string;
  endCustomerName: string;
  siteAddress: string;
  technician_name: string;
  serviceType: string;
  faultReported: string;
  actionTaken: string;
  partsJson: string;
  arrivalTime: string;
  departureTime: string;
  completed_date: string;
  snpid: number;
  orderNumber: string;
  equipment: string;
}

interface ServiceReport {
  id: string;
  job_id: string;
  report_number: string;
  generated_date: string;
  status: 'generated' | 'sent' | 'delivered';
}

const Reports: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  useEffect(() => {
    fetchCompletedJobs();
    fetchReports();
  }, []);

  const fetchCompletedJobs = async () => {
    try {
      // Get all jobs from Firebase
      const jobsSnapshot = await getDocs(collection(db, 'jobs'));
      const allJobs = jobsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[];
      
      // Filter for completed jobs
      const completedJobs = allJobs.filter(job => job.status === 'completed');
      setJobs(completedJobs);
    } catch (error) {
      console.error('Error fetching completed jobs:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const reportsSnapshot = await getDocs(collection(db, 'service_reports'));
      const reportsData = reportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ServiceReport[];
      
      setReports(reportsData);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const generateServiceReport = async (job: Job) => {
    setLoading(true);
    try {
      // Generate report number
      const reportNumber = `SR-${Date.now()}`;
      
      // Create report record in Firebase
      const reportData = {
        job_id: job.id,
        report_number: reportNumber,
        generated_date: new Date().toISOString(),
        status: 'generated',
        job_data: job,
        created_at: new Date()
      };

      const reportRef = await addDoc(collection(db, 'service_reports'), reportData);
      
      // Generate PDF using jsPDF
      const pdf = generatePDF(job, reportNumber);
      
      // Save PDF to downloads
      pdf.save(`service-report-${reportNumber}.pdf`);
      
      // Refresh reports list
      fetchReports();
      setShowGenerateModal(false);
      setSelectedJob(null);
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = (job: Job, reportNumber: string) => {
    const doc = new jsPDF();
    
    // Header Section - Professional Layout
    const pageWidth = doc.internal.pageSize.width;
    
    // Company Logo/Name (Top Right)
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 140, 0); // Orange/Gold color for SNP
    doc.text('SNP', pageWidth - 40, 20);
    doc.setTextColor(0, 0, 0); // Black for electrical
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('electrical', pageWidth - 40, 28);
    
    // Company Information (Left Side)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SNP Electrical', 20, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('18 Newell Close, Taylors Lakes 3038', 20, 30);
    doc.text('Phone: 0488 038 898', 20, 35);
    doc.setTextColor(0, 0, 255); // Blue for email
    doc.text('snpelec@gmail.com', 20, 40);
    doc.setTextColor(0, 0, 0); // Back to black
    
    // Regulatory Information (Right Side)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('REC 16208', pageWidth - 40, 35);
    doc.text('ABN: 22 592 137 842', pageWidth - 40, 42);
    
    // Title - Service Report (Centered, Underlined)
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const titleWidth = doc.getTextWidth('Service Report');
    doc.text('Service Report', (pageWidth - titleWidth) / 2, 60);
    
    // Underline the title
    doc.setLineWidth(0.8);
    doc.line((pageWidth - titleWidth) / 2, 62, (pageWidth + titleWidth) / 2, 62);
    
    // Professional Job Details Table
    const formatDate = (date: any) => {
      try {
        if (date && typeof date === 'object' && (date as any).toDate) {
          return (date as any).toDate().toLocaleDateString('en-AU');
        }
        return new Date(date).toLocaleDateString('en-AU');
      } catch (error) {
        return new Date().toLocaleDateString('en-AU');
      }
    };
    
    // Table styling
    const tableStartY = 80;
    const rowHeight = 12;
    const col1X = 20;
    const col2X = 100;
    const col3X = 180;
    
    // Table header background
    doc.setFillColor(240, 240, 240);
    doc.rect(col1X - 5, tableStartY - 5, 170, rowHeight, 'F');
    
    // Table headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Service Report Number:', col1X, tableStartY);
    doc.text('Date:', col2X, tableStartY);
    
    // Table content rows
    doc.setFont('helvetica', 'normal');
    let currentY = tableStartY + rowHeight;
    
    // Row 1: Service Report Number and Date
    doc.text(String(job.snpid || 'N/A'), col1X, currentY);
    doc.text(job.completed_date ? formatDate(job.completed_date) : 'N/A', col2X, currentY);
    currentY += rowHeight;
    
    // Row 2: Customer's Name
    doc.text("Customer's Name:", col1X, currentY);
    doc.text(job.clientName || 'N/A', col1X + 60, currentY);
    currentY += rowHeight;
    
    // Row 3: Site Name
    doc.text('Site Name:', col1X, currentY);
    doc.text(job.endCustomerName || 'N/A', col1X + 60, currentY);
    currentY += rowHeight;
    
    // Row 4: Site
    doc.text('Site:', col1X, currentY);
    doc.text(job.siteAddress || 'N/A', col1X + 60, currentY);
    currentY += rowHeight;
    
    // Row 5: Site Contact and Phone
    doc.text('Site Contact:', col1X, currentY);
    doc.text('N/A', col1X + 60, currentY); // You may need to add this field
    doc.text('Phone Number:', col2X, currentY);
    doc.text('N/A', col2X + 60, currentY); // You may need to add this field
    currentY += rowHeight;
    
    // Row 6: Order Number and Equipment
    doc.text('Order Number:', col1X, currentY);
    doc.text(job.orderNumber || 'N/A', col1X + 60, currentY);
    doc.text('Equipment:', col2X, currentY);
    doc.text(job.equipment || 'N/A', col2X + 60, currentY);
    currentY += rowHeight + 10;
    
    // Content Sections - Professional Format
    currentY += 20;
    
    // Fault Reported Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Fault Reported:', 20, currentY);
    currentY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (job.faultReported) {
      const faultLines = doc.splitTextToSize(job.faultReported, 170);
      doc.text(faultLines, 20, currentY);
      currentY += faultLines.length * 5 + 15;
    } else {
      doc.text('No fault reported', 20, currentY);
      currentY += 20;
    }
    
    // Action Taken Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Action Taken:', 20, currentY);
    currentY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (job.actionTaken) {
      const actionLines = doc.splitTextToSize(job.actionTaken, 170);
      doc.text(actionLines, 20, currentY);
      currentY += actionLines.length * 5 + 15;
    } else {
      doc.text('No action taken', 20, currentY);
      currentY += 20;
    }
    
    // Time Serviced Section - Professional Layout
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Time Serviced:', 20, currentY);
    currentY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Arrival Time: ${job.arrivalTime || ''}`, 20, currentY);
    doc.text(`Departure Time: ${job.departureTime || ''}`, 100, currentY);
    doc.text(`Serviced By: ${job.technician_name || 'N/A'}`, 180, currentY);
    currentY += 20;
    
    // Professional Parts/Labour Table
    if (job.partsJson) {
      try {
        const parts = JSON.parse(job.partsJson);
        if (parts && parts.length > 0) {
          // Table header with gray background
          doc.setFillColor(240, 240, 240);
          doc.rect(20, currentY - 5, 170, 12, 'F');
          
          // Table headers
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('QTY', 20, currentY);
          doc.text('Description', 60, currentY);
          currentY += 12;
          
          // Table content
          doc.setFont('helvetica', 'normal');
          parts.forEach((part: any, index: number) => {
            const qty = part.qty || 'N/A';
            const description = part.description || 'N/A';
            
            doc.text(String(qty), 20, currentY);
            
            // Split long descriptions
            const descLines = doc.splitTextToSize(description, 80);
            doc.text(descLines, 60, currentY);
            currentY += Math.max(descLines.length * 4, 12);
          });
          
          // Add empty rows for additional parts (like your example)
          for (let i = 0; i < 5; i++) {
            doc.text('', 20, currentY);
            doc.text('', 60, currentY);
            currentY += 12;
          }
        }
      } catch (e) {
        console.log('Error parsing parts:', e);
      }
    }
    
    // Professional Footer
    currentY += 30;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`This service report was generated on ${new Date().toLocaleDateString('en-AU')}`, pageWidth / 2, currentY, { align: 'center' });
    doc.text('SNP Electrical - Professional Electrical Services', pageWidth / 2, currentY + 8, { align: 'center' });
    
    return doc;
  };

  const downloadReport = (report: ServiceReport) => {
    // Find the job data for this report
    const job = jobs.find(j => j.id === report.job_id);
    if (job) {
      const pdf = generatePDF(job, report.report_number);
      pdf.save(`service-report-${report.report_number}.pdf`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Service Reports</h1>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          📄 Generate New Report
        </button>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Select Job for Report Generation</h2>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setSelectedJob(null);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedJob?.id === job.id
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                    }`}
                    onClick={() => setSelectedJob(job)}
                  >
                    <div className="space-y-2">
                      <h3 className="text-white font-semibold text-lg">{job.title}</h3>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-400">Service Report #:</span>
                          <span className="text-white ml-2">{job.snpid || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Completed Date:</span>
                          <span className="text-white ml-2">
                            {job.completed_date ? (() => {
                              try {
                                // Handle Firestore Timestamp objects
                                if (job.completed_date && typeof job.completed_date === 'object' && (job.completed_date as any).toDate) {
                                  return (job.completed_date as any).toDate().toLocaleDateString();
                                }
                                // Handle string dates
                                return new Date(job.completed_date).toLocaleDateString();
                              } catch (error) {
                                return 'Invalid Date';
                              }
                            })() : 'Date not available'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Order Number:</span>
                          <span className="text-white ml-2">{job.orderNumber || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Site Address:</span>
                          <span className="text-white ml-2">{job.siteAddress || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Equipment:</span>
                          <span className="text-white ml-2">{job.equipment || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Fault:</span>
                          <span className="text-white ml-2">{job.faultReported || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-600">
                        <div className="flex justify-between text-sm">
                          <div>
                            <span className="text-gray-400">Client:</span>
                            <span className="text-white ml-2">{job.clientName || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Technician:</span>
                            <span className="text-white ml-2">{job.technician_name || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8">No completed jobs available for report generation</p>
              )}
            </div>

            {selectedJob && (
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowGenerateModal(false);
                    setSelectedJob(null);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => generateServiceReport(selectedJob)}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Generated Reports</h2>
        
        {reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-white font-semibold">
                      Service Report #{report.report_number}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Generated: {new Date(report.generated_date).toLocaleDateString()}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Status: <span className={`capitalize ${
                        report.status === 'generated' ? 'text-yellow-400' :
                        report.status === 'sent' ? 'text-blue-400' :
                        'text-green-400'
                      }`}>
                        {report.status}
                      </span>
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => downloadReport(report)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                    >
                      📥 Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No reports generated yet</p>
        )}
      </div>
    </div>
  );
};

export default Reports;