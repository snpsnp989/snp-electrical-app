import React, { useState, useEffect } from 'react';

interface ServiceReport {
  id: number;
  job_id: number;
  report_content: string;
  sent_date: string;
  email_sent: boolean;
  job_title: string;
  customer_name: string;
  customer_email: string;
  completed_date: string;
  // Some API responses include a created_at field
  created_at?: string;
}

interface Job {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  scheduled_date: string;
  completed_date: string;
  customer_name: string;
  technician_name: string;
  service_report: string;
  pdf_generated?: boolean;
  client_name?: string;
  end_customer_name?: string;
  site_address?: string;
  site_contact?: string;
  site_phone?: string;
  order_number?: string;
  equipment?: string;
  fault_reported?: string;
  arrival_time?: string;
  departure_time?: string;
  action_taken?: string;
  parts_json?: string;
}

const Reports: React.FC = () => {
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<ServiceReport[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string>('');

  const [formData, setFormData] = useState({
    job_id: '',
    report_content: ''
  });

  useEffect(() => {
    fetchReports();
    fetchMonthlyReports();
    fetchJobs();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/reports');
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchMonthlyReports = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/reports/monthly');
      const data = await response.json();
      setMonthlyReports(data);
    } catch (error) {
      console.error('Error fetching monthly reports:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5001' 
        : 'http://192.168.0.223:5001';
      
      const response = await fetch(`${apiUrl}/api/jobs`);
      if (response.ok) {
        const data = await response.json();
        setJobs(data.filter((job: any) => job.status === 'completed'));
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const generatePdf = async (jobId: number) => {
    try {
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5001' 
        : 'http://192.168.0.223:5001';
      
      const response = await fetch(`${apiUrl}/api/pdf/job/${jobId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Create download link with explicit save dialog
        const a = document.createElement('a');
        a.href = url;
        a.download = `service-report-${jobId}.pdf`;
        a.style.display = 'none';
        a.setAttribute('target', '_blank');
        
        // Add to DOM, click, then remove
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);
      } else {
        alert('Failed to generate PDF report');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report');
    }
  };

  const viewPdf = async (jobId: number) => {
    try {
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5001' 
        : 'http://192.168.0.223:5001';
      
      const response = await fetch(`${apiUrl}/api/pdf/job/${jobId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setSelectedPdfUrl(url);
        setShowPdfViewer(true);
      } else {
        alert('Failed to generate PDF report');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5001/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchReports();
        fetchMonthlyReports();
        setShowModal(false);
        setFormData({ job_id: '', report_content: '' });
        setSelectedJob(null);
      }
    } catch (error) {
      console.error('Error creating report:', error);
    }
  };

  const handleSendIndividual = async (reportId: number) => {
    try {
      const response = await fetch(`http://localhost:5001/api/reports/send/${reportId}`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchReports();
        fetchMonthlyReports();
        alert('Service report sent successfully!');
      }
    } catch (error) {
      console.error('Error sending report:', error);
    }
  };

  const handleSendMonthly = async () => {
    if (monthlyReports.length === 0) {
      alert('No reports available to send');
      return;
    }

    if (window.confirm(`Send monthly service reports to ${monthlyReports.length} customers?`)) {
      try {
        const response = await fetch('http://localhost:5001/api/reports/send-monthly', {
          method: 'POST',
        });

        if (response.ok) {
          const result = await response.json();
          alert(`Successfully sent ${result.customers} monthly service report emails!`);
          fetchReports();
          fetchMonthlyReports();
        }
      } catch (error) {
        console.error('Error sending monthly reports:', error);
      }
    }
  };

  const handleJobSelect = (jobId: string) => {
    const job = jobs.find(j => j.id.toString() === jobId);
    setSelectedJob(job);
    setFormData({ ...formData, job_id: jobId });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Service Reports</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowModal(true)}
            className="bg-darker-blue hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Create Report
          </button>
          <button
            onClick={handleSendMonthly}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Send Monthly Reports ({monthlyReports.length})
          </button>
        </div>
      </div>

      {/* Monthly Reports Summary */}
      <div className="bg-gray-800 rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Monthly Reports Ready to Send</h2>
        </div>
        <div className="p-6">
          {monthlyReports.length > 0 ? (
            <div className="space-y-4">
              {monthlyReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{report.job_title}</h3>
                    <p className="text-gray-400 text-sm">Customer: {report.customer_name}</p>
                    <p className="text-gray-400 text-sm">Completed: {new Date(report.completed_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-400 text-sm">Ready to send</span>
                    <button
                      onClick={() => handleSendIndividual(report.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                    >
                      Send Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No reports ready for monthly sending</p>
          )}
        </div>
      </div>

      {/* Completed Jobs with PDF Reports */}
      <div className="bg-gray-800 rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Completed Jobs - PDF Reports</h2>
        </div>
        <div className="p-6">
          {jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{job.title}</h3>
                    <p className="text-gray-400 text-sm">Client: {job.client_name || 'N/A'}</p>
                    <p className="text-gray-400 text-sm">End Customer: {job.end_customer_name || 'N/A'}</p>
                    <p className="text-gray-400 text-sm">Site: {job.site_address || 'N/A'}</p>
                    <p className="text-gray-400 text-sm">Completed: {job.completed_date ? new Date(job.completed_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => viewPdf(job.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                    >
                      👁️ View PDF
                    </button>
                    <button
                      onClick={() => generatePdf(job.id)}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${
                        job.pdf_generated 
                          ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                      title={job.pdf_generated ? 'PDF Report Already Generated' : 'Generate PDF Report'}
                    >
                      📥 {job.pdf_generated ? 'PDF ✓' : 'Download PDF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No completed jobs available for PDF generation</p>
          )}
        </div>
      </div>

      {/* All Reports */}
      <div className="bg-gray-800 rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">All Service Reports</h2>
        </div>
        <div className="p-6">
          {reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{report.job_title}</h3>
                    <p className="text-gray-400 text-sm">Customer: {report.customer_name}</p>
                    <p className="text-gray-400 text-sm">
                      Created: {report.created_at ? new Date(report.created_at).toLocaleDateString() : '—'}
                    </p>
                    {report.sent_date && (
                      <p className="text-gray-400 text-sm">Sent: {new Date(report.sent_date).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      report.email_sent 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {report.email_sent ? 'Sent' : 'Pending'}
                    </span>
                    {!report.email_sent && (
                      <button
                        onClick={() => handleSendIndividual(report.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                      >
                        Send
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No service reports found</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">Create Service Report</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Select Job</label>
                <select
                  value={formData.job_id}
                  onChange={(e) => handleJobSelect(e.target.value)}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  required
                >
                  <option value="">Select a completed job</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} - {job.customer_name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedJob && (
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-2">Job Details</h3>
                  <p className="text-gray-300 text-sm">Customer: {selectedJob.customer_name}</p>
                  <p className="text-gray-300 text-sm">Technician: {selectedJob.technician_name || 'Not assigned'}</p>
                  <p className="text-gray-300 text-sm">Completed: {new Date(selectedJob.completed_date).toLocaleDateString()}</p>
                </div>
              )}

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Service Report Content</label>
                <textarea
                  value={formData.report_content}
                  onChange={(e) => setFormData({ ...formData, report_content: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  rows={8}
                  placeholder="Enter detailed service report including work performed, issues found, recommendations, etc."
                  required
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-darker-blue hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Create Report
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ job_id: '', report_content: '' });
                    setSelectedJob(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdfViewer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-6xl h-5/6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">PDF Report Viewer</h2>
              <button
                onClick={() => {
                  setShowPdfViewer(false);
                  if (selectedPdfUrl) {
                    window.URL.revokeObjectURL(selectedPdfUrl);
                    setSelectedPdfUrl('');
                  }
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
              >
                Close
              </button>
            </div>
            <div className="h-full">
              {selectedPdfUrl && (
                <iframe
                  src={selectedPdfUrl}
                  className="w-full h-full border-0 rounded-md"
                  title="PDF Report"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
