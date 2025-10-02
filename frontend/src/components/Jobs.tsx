import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getApiUrl } from '../config/api';

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
  service_type?: string;
  pdf_generated?: boolean;
  // Optional foreign keys used when editing/creating a job
  customer_id?: number;
  technician_id?: number;
}

interface Customer {
  id: number;
  name: string;
  email: string;
}

interface Technician {
  id: number;
  name: string;
  email: string;
}

const Jobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [filter, setFilter] = useState('pending');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string>('');
  const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    customer_id: '',
    technician_id: '',
    title: '',
    description: '',
    requestedDate: '',
    dueDate: '',
    clientId: '',
    endCustomerId: '',
    siteId: '',
    siteContact: '',
    sitePhone: '',
    orderNumber: '',
    equipment: '',
    faultReported: '',
    // Inspector/Technician completion fields
    actionTaken: '',
    serviceType: '',
    partsJson: '',
    arrivalTime: '',
    departureTime: ''
  });

  const [clients, setClients] = useState<any[]>([]);
  const [endCustomers, setEndCustomers] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  
  // Parts management state
  const [parts, setParts] = useState<Array<{ description: string; qty: number }>>([]);
  const [availableParts, setAvailableParts] = useState<Array<{ id: string; partNumber: string; description: string; unitType: 'qty' | 'hours' }>>([]);
  const [partsSearch, setPartsSearch] = useState<string>('');
  const [filteredParts, setFilteredParts] = useState<Array<{ id: string; partNumber: string; description: string; unitType: 'qty' | 'hours' }>>([]);
  const [showPartsDropdown, setShowPartsDropdown] = useState<boolean>(false);

  useEffect(() => {
    fetchJobs();
    fetchCustomers();
    fetchTechnicians();
    loadClients();
    loadParts();
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/equipment`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched equipment data:', data);
        setEquipment(data);
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  // Auto-select single client/technician when only one exists
  useEffect(() => {
    if (clients.length === 1) {
      const only = clients[0];
      console.log('Auto-selecting client:', only);
      console.log('Current formData.clientId:', formData.clientId);
      console.log('Client contact_name:', only.contact_name);
      console.log('Client phone:', only.phone);
      
      // Only auto-select if no client is currently selected OR if we're not editing a job
      if (!formData.clientId || !editingJob) {
        (async () => {
          setFormData((prev) => ({ 
            ...prev, 
            clientId: only.id,
            siteContact: only.contact_name || '',
            sitePhone: only.phone || ''
          }));
          const ecSnap = await getDocs(collection(db, `clients/${only.id}/customers`));
          setEndCustomers(ecSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
        })();
      }
    }
  }, [clients, editingJob]);

  useEffect(() => {
    if (!editingJob && technicians.length === 1 && !formData.technician_id) {
      setFormData((prev) => ({ ...prev, technician_id: (technicians[0] as any).id?.toString?.() || '' }));
    }
  }, [technicians]);

  const loadClients = async () => {
    const snap = await getDocs(collection(db, 'clients'));
    setClients(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
  };

  const loadParts = async () => {
    try {
      const snap = await getDocs(collection(db, 'parts'));
      const partsData = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any;
      setAvailableParts(partsData);
    } catch (error) {
      console.error('Error loading parts:', error);
    }
  };

  // Update part quantity
  const updatePartQuantity = (index: number, newQty: number) => {
    if (newQty < 0) return;
    const updatedParts = [...parts];
    updatedParts[index].qty = newQty;
    setParts(updatedParts);
  };

  // Filter parts based on search
  useEffect(() => {
    if (partsSearch.trim()) {
      const filtered = availableParts.filter(part => 
        part.description.toLowerCase().includes(partsSearch.toLowerCase()) ||
        part.partNumber.toLowerCase().includes(partsSearch.toLowerCase())
      );
      setFilteredParts(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      setFilteredParts([]);
    }
  }, [partsSearch, availableParts]);

  // Close parts dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPartsDropdown) {
        setShowPartsDropdown(false);
      }
    };
    
    if (showPartsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPartsDropdown]);

  const fetchJobs = async () => {
    try {
      const apiUrl = getApiUrl();
      console.log('Fetching jobs from:', `${apiUrl}/api/jobs`);
      const response = await fetch(`${apiUrl}/api/jobs`);
      console.log('API Response status:', response.status);
      const data = await response.json();
      console.log('Fetched jobs from API:', data);
      console.log('Jobs count:', data.length);
      // Set all jobs - filtering will be done in the component
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/customers`);
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/technicians`);
      const data = await response.json();
      setTechnicians(data);
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = getApiUrl();
      const url = editingJob
        ? `${apiUrl}/api/jobs/${editingJob.id}`
        : `${apiUrl}/api/jobs`;
      
      const method = editingJob ? 'PUT' : 'POST';
      
      const selectedSite = sites.find((s:any)=>s.id===formData.siteId);
      const siteAddress = selectedSite ? [selectedSite.address, selectedSite.suburb, selectedSite.state, selectedSite.postcode].filter(Boolean).join(', ') : '';
      const payload: any = {
        ...formData,
        customer_id: formData.customer_id || '1',
        title: formData.equipment || 'Job',
        description: formData.faultReported || '',
        siteAddress,
        clientName: (clients.find((c:any)=>c.id===formData.clientId)?.name) || '',
        endCustomerName: (endCustomers.find((c:any)=>c.id===formData.endCustomerId)?.name) || '',
        // Include inspector/technician completion fields
        actionTaken: formData.actionTaken,
        serviceType: formData.serviceType,
        partsJson: JSON.stringify(parts),
        arrivalTime: formData.arrivalTime,
        departureTime: formData.departureTime
      };
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchJobs();
        
        setShowModal(false);
        setEditingJob(null);
        setParts([]);
        setFormData({
          customer_id: '',
          technician_id: '',
          title: '',
          description: '',
          requestedDate: '',
          dueDate: '',
          clientId: '',
          endCustomerId: '',
          siteId: '',
          siteContact: '',
          sitePhone: '',
          orderNumber: '',
          equipment: '',
          faultReported: '',
          // Inspector/Technician completion fields
          actionTaken: '',
          serviceType: '',
          partsJson: '',
          arrivalTime: '',
          departureTime: ''
        });
      } else {
        const msg = await response.text();
        console.error('Save failed', msg);
        alert('Failed to save job: ' + msg);
      }
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    const anyJob: any = job as any;
    const clientId = anyJob.client_id || anyJob.clientId || '';
    const endCustomerId = anyJob.end_customer_id || anyJob.endCustomerId || '';
    const siteId = anyJob.site_id || anyJob.siteId || '';
    console.log('Editing job with clientId:', clientId, 'endCustomerId:', endCustomerId, 'siteId:', siteId);
    setFormData({
      customer_id: job.customer_id?.toString() || '',
      technician_id: job.technician_id?.toString() || '',
      title: job.title,
      description: job.description || '',
      requestedDate: anyJob.requested_date || anyJob.requestedDate || '',
      dueDate: anyJob.due_date || anyJob.dueDate || '',
      clientId,
      endCustomerId,
      siteId,
      siteContact: anyJob.site_contact || anyJob.siteContact || '',
      sitePhone: anyJob.site_phone || anyJob.sitePhone || '',
      orderNumber: anyJob.order_number || anyJob.orderNumber || '',
      equipment: anyJob.equipment || '',
      faultReported: anyJob.fault_reported || anyJob.faultReported || '',
      // Inspector/Technician completion fields
      actionTaken: anyJob.action_taken || '',
      serviceType: anyJob.service_type || '',
      partsJson: anyJob.parts_json || '',
      arrivalTime: anyJob.arrival_time || anyJob.arrivalTime || '',
      departureTime: anyJob.departure_time || anyJob.departureTime || ''
    });
    
    // Load parts data for completed jobs
    if (job.status === 'completed') {
      try {
        const existingParts = anyJob.parts_json ? JSON.parse(anyJob.parts_json) : [];
        setParts(existingParts);
      } catch (error) {
        console.error('Error parsing parts JSON:', error);
        setParts([]);
      }
    }
    
    // preload dependent dropdowns and client contact info
    (async () => {
      try {
        if (clientId) {
          // Load client contact info if not already set
          const selectedClient = clients.find(c => c.id === clientId);
          if (selectedClient && (!anyJob.site_contact && !anyJob.siteContact)) {
            setFormData(prev => ({
              ...prev,
              siteContact: selectedClient.contact_name || '',
              sitePhone: selectedClient.phone || ''
            }));
          }
          
          const ecSnap = await getDocs(collection(db, `clients/${clientId}/customers`));
          const ecs = ecSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setEndCustomers(ecs as any);
          if (endCustomerId) {
            console.log('Loading sites for clientId:', clientId, 'endCustomerId:', endCustomerId);
            const sSnap = await getDocs(collection(db, `clients/${clientId}/customers/${endCustomerId}/sites`));
            const ss = sSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
            console.log('Loaded sites:', ss);
            setSites(ss as any);
          } else {
            console.log('No endCustomerId, clearing sites');
            setSites([]);
          }
        }
      } catch (e) {
        console.error('Failed to preload end customers/sites', e);
      }
    })();
    setShowModal(true);
  };

  const handleStatusChange = async (jobId: number, newStatus: string) => {
    try {
      const apiUrl = getApiUrl();
      await fetch(`${apiUrl}/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchJobs();
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!window.confirm('Delete this job? This cannot be undone.')) return;
    try {
      const apiUrl = getApiUrl();
      await fetch(`${apiUrl}/api/jobs/${jobId}`, { method: 'DELETE' });
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Failed to delete job');
    }
  };

  const handleGeneratePDF = async (jobId: number) => {
    try {
      const apiUrl = getApiUrl();
      
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
        
        // Refresh jobs to update PDF status
        fetchJobs();
      } else {
        alert('Failed to generate PDF report');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report');
    }
  };

  const handleViewPDF = async (jobId: number) => {
    try {
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/pdf/job/${jobId}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setSelectedPdfUrl(url);
        setShowPdfViewer(true);
      } else {
        alert('Failed to view PDF report');
      }
    } catch (error) {
      console.error('Error viewing PDF:', error);
      alert('Failed to view PDF report');
    }
  };

  const handleDownloadPDF = async (jobId: number) => {
    try {
      const apiUrl = getApiUrl();
      
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
        alert('Failed to download PDF report');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF report');
    }
  };

  const handleJobSelection = (jobId: number) => {
    setSelectedJobs(prev => {
      if (prev.includes(jobId)) {
        return prev.filter(id => id !== jobId);
      } else {
        return [...prev, jobId];
      }
    });
  };

  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedJobs([]);
      setIsSelectAll(false);
    } else {
      const allJobIds = filteredJobs.map(job => job.id);
      setSelectedJobs(allJobIds);
      setIsSelectAll(true);
    }
  };

  const handleSendReportsToCustomer = async () => {
    if (selectedJobs.length === 0) {
      alert('Please select at least one job to send');
      return;
    }

    try {
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/send-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobIds: selectedJobs
        })
      });

      if (response.ok) {
        alert(`Successfully sent ${selectedJobs.length} report(s) to customers`);
        setSelectedJobs([]);
        setIsSelectAll(false);
        fetchJobs(); // Refresh the jobs list
      } else {
        const error = await response.json();
        alert(`Failed to send reports: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending reports:', error);
      alert('Failed to send reports to customers');
    }
  };

  const filteredJobs = jobs.filter(job => {
    // Search filter - only apply if searchTerm is not empty
    const searchMatch = searchTerm === '' || 
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job as any).site_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job as any).equipment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job as any).fault_reported?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job as any).action_taken?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job as any).order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job as any).client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job as any).end_customer_name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === 'reports_sent') {
      // For reports sent to customer, show completed jobs that have been sent
      const isReportSent = job.status === 'completed' && job.pdf_generated === true;
      const serviceTypeMatch = serviceTypeFilter === '' || job.service_type === serviceTypeFilter;
      const result = isReportSent && serviceTypeMatch && searchMatch;
      if (job.status === 'completed') {
        console.log(`Job ${job.id} (${job.title}): status=${job.status}, pdf_generated=${job.pdf_generated}, isReportSent=${isReportSent}, serviceTypeMatch=${serviceTypeMatch}, searchMatch=${searchMatch}, result=${result}`);
      }
      return result;
    }
    const statusMatch = job.status === filter;
    const serviceTypeMatch = serviceTypeFilter === '' || job.service_type === serviceTypeFilter;
    const result = statusMatch && serviceTypeMatch && searchMatch;
    if (filter === 'completed' && job.status === 'completed') {
      console.log(`Job ${job.id} (${job.title}): status=${job.status}, filter=${filter}, statusMatch=${statusMatch}, serviceTypeMatch=${serviceTypeMatch}, searchMatch=${searchMatch}, result=${result}`);
    }
    return result;
  });

  console.log('Current filter:', filter);
  console.log('Total jobs:', jobs.length);
  console.log('Filtered jobs count:', filteredJobs.length);
  console.log('Service type filter:', serviceTypeFilter);
  console.log('Search term:', searchTerm);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">My Work Orders</h1>
        <div className="flex space-x-3">
          {selectedJobs.length > 0 && filter === 'completed' && (
            <button
              onClick={handleSendReportsToCustomer}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Send report/s to customer ({selectedJobs.length})
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="bg-darker-blue hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Add New Job
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-col space-y-4">
        <div className="flex space-x-4 items-center">
          <div className="flex space-x-4">
            {['pending', 'in_progress', 'completed', 'reports_sent'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setFilter(status);
                  setServiceTypeFilter(''); // Reset service type filter when changing status
                  if (status !== 'completed') {
                    setSelectedJobs([]); // Clear selected jobs when not in completed tab
                    setIsSelectAll(false);
                  }
                }}
                className={`px-4 py-2 rounded-md transition-colors ${
                  filter === status
                    ? 'bg-darker-blue text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {status === 'reports_sent' ? 'Reports sent to customer' : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
          
          {/* Service Type Filter - Only show for completed jobs and reports sent */}
          {(filter === 'completed' || filter === 'reports_sent') && (
            <div className="flex items-center space-x-2">
              <label className="text-gray-300 text-sm">Service Type:</label>
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
                className="bg-gray-700 text-white px-3 py-2 rounded-md text-sm"
              >
                <option value="">All Service Types</option>
                <option value="Vandalism">Vandalism</option>
                <option value="Repairs/Maintenance">Repairs/Maintenance</option>
              </select>
            </div>
          )}
        </div>
        
        {/* Search Bar */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search jobs by title, description, equipment, site, order number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-2 pl-10 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-md text-sm transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-gray-800 rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">
            Jobs ({filteredJobs.length})
            {searchTerm && (
              <span className="text-sm text-gray-400 ml-2">
                (filtered by "{searchTerm}")
              </span>
            )}
          </h2>
          {filteredJobs.length > 0 && filter === 'completed' && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="selectAll"
                checked={isSelectAll}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="selectAll" className="text-sm text-gray-300">
                Select All
              </label>
            </div>
          )}
        </div>
        <div className="p-6">
          {filteredJobs.length > 0 ? (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3 flex-1">
                    {filter === 'completed' && (
                      <input
                        type="checkbox"
                        checked={selectedJobs.includes(job.id)}
                        onChange={() => handleJobSelection(job.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                    )}
                    <div className="flex-1">
                    <h3 className="text-white font-medium flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-gray-600 text-xs">Service Report Number {(job as any).snpid || job.id}</span>
                    </h3>
                    <p className="text-gray-400 text-sm">{(job as any).site_address || (job as any).siteAddress || 'Site address not set'}</p>
                    <p className="text-gray-400 text-sm">Equipment: {(job as any).equipment || '—'} • Fault: {(job as any).fault_reported || (job as any).faultReported || '—'}</p>
                    {job.status !== 'completed' && (
                      <p className="text-gray-400 text-sm mt-2">Requested: {(job as any).requested_date || (job as any).requestedDate || '—'} • Due: {(job as any).due_date || (job as any).dueDate || '—'}</p>
                    )}
                    
                    {/* Completion Details for Completed Jobs */}
                    {job.status === 'completed' && (
                      <div className="mt-3 p-3 bg-green-900 bg-opacity-30 border border-green-500 rounded-lg">
                        <div className="flex items-center mb-2">
                          <span className="text-green-400 text-sm font-medium">✅ Completion Details</span>
                          <span className="ml-2 text-xs text-gray-400">
                            Completed: {(job as any).completed_date || '—'}
                          </span>
                        </div>
                        
                        {/* Action Taken */}
                        {(job as any).action_taken && (
                          <div className="mb-2">
                            <div className="text-xs text-gray-400 font-medium">Action Taken:</div>
                            <div className="text-sm text-white bg-gray-800 p-2 rounded mt-1">
                              {(job as any).action_taken}
                            </div>
                          </div>
                        )}
                        
                        {/* Parts/Labour */}
                        {(job as any).parts_json && (
                          <div className="mb-2">
                            <div className="text-xs text-gray-400 font-medium">Parts/Labour Used:</div>
                            <div className="text-sm text-white bg-gray-800 p-2 rounded mt-1">
                              {JSON.parse((job as any).parts_json).map((part: any, idx: number) => (
                                <div key={idx} className="text-xs">
                                  • {part.description} (Qty: {part.qty})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Service Report */}
                        {(job as any).service_report && (
                          <div className="mb-2">
                            <div className="text-xs text-gray-400 font-medium">Service Report:</div>
                            <div className="text-sm text-white bg-gray-800 p-2 rounded mt-1">
                              {(job as any).service_report}
                            </div>
                          </div>
                        )}
                        
                        {/* Photos */}
                        {(job as any).photos && (job as any).photos.length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs text-gray-400 font-medium">Inspector Photos ({(job as any).photos.length}):</div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {(job as any).photos.map((photo: any, idx: number) => (
                                <div key={idx} className="relative">
                                  <img
                                    src={photo.url}
                                    alt={photo.caption || 'Job photo'}
                                    className="w-full h-20 object-cover rounded border border-gray-600"
                                  />
                                  {photo.caption && (
                                    <p className="text-xs text-gray-400 mt-1 truncate">{photo.caption}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Technician Notes */}
                        {(job as any).technician_notes && (
                          <div className="mb-2">
                            <div className="text-xs text-gray-400 font-medium">Technician Notes:</div>
                            <div className="text-sm text-white bg-gray-800 p-2 rounded mt-1">
                              {(job as any).technician_notes}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={job.status}
                      onChange={(e) => handleStatusChange(job.id, e.target.value)}
                      className="bg-gray-600 text-white px-3 py-1 rounded-md text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <div className="flex flex-col gap-1">
                      {/* First line: Amend/Edit and Delete */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(job)}
                          className={`px-3 py-1 rounded-md text-sm transition-colors ${
                            job.status === 'completed' 
                              ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                          title={job.status === 'completed' ? 'Amend completed job' : 'Edit job'}
                        >
                          {job.status === 'completed' ? 'Amend' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                      
                      {/* Second line: Generate PDF (only for completed jobs) */}
                      {job.status === 'completed' && (
                        <button
                          onClick={() => handleGeneratePDF(job.id)}
                          className={`px-3 py-1 rounded-md text-sm transition-colors ${
                            job.pdf_generated 
                              ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                          title={job.pdf_generated ? 'PDF Report Already Generated' : 'Generate PDF Report'}
                        >
                          📄 {job.pdf_generated ? 'Generated' : 'Generate Report'}
                        </button>
                      )}
                      
                      {/* Third line: View PDF (only for completed jobs) */}
                      {job.status === 'completed' && (
                        <button
                          onClick={() => handleViewPDF(job.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                          title="View PDF Report"
                        >
                          👁️ View PDF
                        </button>
                      )}
                      
                      {/* Fourth line: Download PDF (only for completed jobs) */}
                      {job.status === 'completed' && (
                        <button
                          onClick={() => handleDownloadPDF(job.id)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                          title="Download PDF Report"
                        >
                          📥 Download PDF
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No jobs found</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                {editingJob ? (
                  editingJob.status === 'completed' ? 'Amend Completed Job' : 'Edit Job'
                ) : 'Add New Job'}
              </h2>
              {editingJob && (
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    editingJob.status === 'completed' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-700 text-gray-200'
                  }`}>
                    {editingJob.status === 'completed' ? 'COMPLETED' : editingJob.status.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 rounded bg-gray-700 text-xs text-gray-200">
                    Service Report Number {(editingJob as any).snpid || editingJob.id}
                  </span>
                </div>
              )}
            </div>
            
            {/* Amendment Notice for Completed Jobs */}
            {editingJob && editingJob.status === 'completed' && (
              <div className="mb-4 p-3 bg-orange-900 bg-opacity-30 border border-orange-500 rounded-lg">
                <div className="flex items-center">
                  <div className="text-orange-400 mr-2">⚠️</div>
                  <div className="text-orange-200 text-sm">
                    <strong>Amending Completed Job:</strong> You are editing a job that has been marked as completed. 
                    Changes will be saved and the job status can be updated if needed.
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Admin assignment fields reflecting report header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Requested Date</label>
                  <DatePicker
                    selected={formData.requestedDate ? new Date(formData.requestedDate) : null}
                    onChange={(date: Date | null) => setFormData({ ...formData, requestedDate: date ? date.toISOString().slice(0,10) : '' })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                    popperClassName="date-popper-lg"
                    calendarClassName="!text-base !p-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Must be completed by</label>
                  <DatePicker
                    selected={formData.dueDate ? new Date(formData.dueDate) : null}
                    onChange={(date: Date | null) => setFormData({ ...formData, dueDate: date ? date.toISOString().slice(0,10) : '' })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                    popperClassName="date-popper-lg"
                    calendarClassName="!text-base !p-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {clients.length > 1 && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Client</label>
                  <select value={formData.clientId} onChange={async (e) => {
                    const clientId = e.target.value;
                    const selected = clients.find((c: any) => c.id === clientId);
                    console.log('Selected client:', selected);
                    setFormData({
                      ...formData,
                      clientId,
                      endCustomerId: '',
                      siteId: '',
                      siteContact: selected?.contact_name || '',
                      sitePhone: selected?.phone || ''
                    });
                    if (clientId) {
                      const ecSnap = await getDocs(collection(db, `clients/${clientId}/customers`));
                      setEndCustomers(ecSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
                      setSites([]);
                    }
                  }} className="w-full bg-gray-700 text-white px-3 py-2 rounded-md" required>
                    <option value="">Select Client</option>
                    {clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                )}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">End-Customer</label>
                  <select value={formData.endCustomerId} onChange={async (e) => {
                    const endCustomerId = e.target.value; setFormData({ ...formData, endCustomerId, siteId: '' });
                    if (formData.clientId && endCustomerId) {
                      const sSnap = await getDocs(collection(db, `clients/${formData.clientId}/customers/${endCustomerId}/sites`));
                      const sitesData = sSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any;
                      console.log('Loaded sites data:', sitesData);
                      setSites(sitesData);
                    }
                  }} className="w-full bg-gray-700 text-white px-3 py-2 rounded-md" required>
                    <option value="">Select End-Customer</option>
                    {endCustomers.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Site</label>
                  <select value={formData.siteId} onChange={(e) => { 
                    const id=e.target.value; 
                    console.log('Site selection changed to:', id);
                    console.log('Available sites:', sites);
                    const s=sites.find((x:any)=>x.id===id); 
                    const label=s?[s.address,s.suburb,s.state,s.postcode].filter(Boolean).join(', '):''; 
                    
                    // Auto-populate equipment from site
                    let equipmentList = '';
                    console.log('Selected site data:', s);
                    console.log('Site equipment:', s?.equipment);
                    console.log('Available equipment:', equipment);
                    
                    if (s && s.equipment && Array.isArray(s.equipment)) {
                      const siteEquipment = s.equipment.map((eqId: string) => {
                        const eq = equipment.find(e => e.id === eqId);
                        return eq ? eq.name : eqId;
                      }).filter(Boolean);
                      equipmentList = siteEquipment.join(', ');
                      console.log('Mapped equipment list:', equipmentList);
                    }
                    
                    setFormData({ 
                      ...formData, 
                      siteId:id, 
                      title: formData.equipment || 'Job', 
                      description: formData.faultReported || '', 
                      siteContact: formData.siteContact, 
                      sitePhone: formData.sitePhone,
                      equipment: equipmentList
                    }); 
                  }} className="w-full bg-gray-700 text-white px-3 py-2 rounded-md" required>
                    <option value="">Select Site</option>
                    {sites.length > 0 ? sites.map(s => (<option key={s.id} value={s.id}>{[s.address, s.suburb, s.state, s.postcode].filter(Boolean).join(', ')}</option>)) : <option disabled>Loading sites...</option>}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Site Contact</label>
                    <input value={formData.siteContact} onChange={(e)=>setFormData({...formData, siteContact: e.target.value})} className="w-full bg-gray-700 text-white px-3 py-2 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Phone Number</label>
                    <input value={formData.sitePhone} onChange={(e)=>setFormData({...formData, sitePhone: e.target.value})} className="w-full bg-gray-700 text-white px-3 py-2 rounded-md" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Order Number</label>
                    <input value={formData.orderNumber} onChange={(e)=>setFormData({...formData, orderNumber: e.target.value})} className="w-full bg-gray-700 text-white px-3 py-2 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Equipment</label>
                    <input value={formData.equipment} onChange={(e)=>setFormData({...formData, equipment: e.target.value})} className="w-full bg-gray-700 text-white px-3 py-2 rounded-md" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Fault Reported</label>
                  <input value={formData.faultReported} onChange={(e)=>setFormData({...formData, faultReported: e.target.value})} className="w-full bg-gray-700 text-white px-3 py-2 rounded-md" />
                </div>
              </div>

              {technicians.length > 1 && (
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Technician</label>
                <select
                  value={formData.technician_id}
                  onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                >
                  <option value="">Select Technician</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name}
                    </option>
                  ))}
                </select>
              </div>
              )}

              {/* Title/Description hidden; mapped from Equipment/Fault Reported */}

              {/* Inspector/Technician Completion Fields - Only show when editing completed jobs */}
              {editingJob && editingJob.status === 'completed' && (
                <div className="border-t border-gray-600 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Inspector/Technician Completion Data</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Arrival Time</label>
                      <input
                        type="time"
                        value={formData.arrivalTime}
                        onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Departure Time</label>
                      <input
                        type="time"
                        value={formData.departureTime}
                        onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Service Type</label>
                    <select
                      value={formData.serviceType}
                      onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                    >
                      <option value="">Select Service Type</option>
                      <option value="Vandalism">Vandalism</option>
                      <option value="Repairs/Maintenance">Repairs/Maintenance</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Action Taken</label>
                    <textarea
                      value={formData.actionTaken}
                      onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                      rows={3}
                      placeholder="Describe the action taken to resolve the issue..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Parts/Labour Used</label>
                    
                    {/* Parts Search */}
                    <div className="relative mb-3">
                      <input
                        type="text"
                        value={partsSearch}
                        onChange={(e) => {
                          setPartsSearch(e.target.value);
                          setShowPartsDropdown(true);
                        }}
                        onFocus={() => setShowPartsDropdown(true)}
                        className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                        placeholder="Search parts..."
                      />
                      
                      {/* Parts Dropdown */}
                      {showPartsDropdown && filteredParts.length > 0 && (
                        <div className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto">
                          {filteredParts.map((part) => (
                            <div
                              key={part.id}
                              onClick={() => {
                                setParts([...parts, { description: part.description, qty: 1 }]);
                                setPartsSearch('');
                                setShowPartsDropdown(false);
                              }}
                              className="px-3 py-2 hover:bg-gray-600 cursor-pointer text-white text-sm"
                            >
                              <div className="font-medium">{part.description}</div>
                              <div className="text-xs text-gray-400">
                                {part.partNumber} • {part.unitType === 'qty' ? 'Quantity' : 'Hours'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Parts List */}
                    <div className="space-y-2">
                      {parts.map((p, idx) => (
                        <div key={idx} className="flex gap-1 items-center">
                          <input 
                            value={p.description} 
                            onChange={(e)=>{
                              const v=[...parts]; v[idx].description = e.target.value; setParts(v);
                            }} 
                            className="flex-1 bg-gray-700 text-white px-2 py-2 rounded-md text-sm" 
                            placeholder="Description or Part #" 
                          />
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center bg-gray-700 rounded-md">
                            <button 
                              onClick={() => updatePartQuantity(idx, p.qty - 1)}
                              className="px-2 py-2 text-white hover:bg-gray-600 rounded-l-md text-sm"
                              disabled={p.qty <= 0}
                            >
                              -
                            </button>
                            <input 
                              type="number" 
                              value={p.qty} 
                              onChange={(e) => updatePartQuantity(idx, Number(e.target.value) || 0)}
                              className="w-12 bg-transparent text-white text-center px-1 py-2 border-0 focus:outline-none text-sm"
                              min="0"
                            />
                            <button
                              onClick={() => updatePartQuantity(idx, p.qty + 1)}
                              className="px-2 py-2 text-white hover:bg-gray-600 rounded-r-md text-sm"
                            >
                              +
                            </button>
                          </div>
                          
                          <button 
                            onClick={()=>{ const v=[...parts]; v.splice(idx,1); setParts(v); }} 
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded-md text-sm flex-shrink-0"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button 
                        type="button"
                        onClick={()=>setParts([...parts,{description:'',qty:1}])} 
                        className="bg-darker-blue hover:bg-blue-700 text-white px-3 py-2 rounded-md"
                      >
                        Add Custom Line
                      </button>
                      {parts.length > 0 && (
                        <button 
                          type="button"
                          onClick={()=>setParts([])} 
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>
                  
                </div>
              )}

              <div>
                {/* Priority/Scheduled removed per spec */}
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-darker-blue hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  {editingJob ? 'Update' : 'Create'} Job
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingJob(null);
                    setParts([]);
                    setFormData({
                      customer_id: '',
                      technician_id: '',
                      title: '',
                      description: '',
                      requestedDate: '',
                      dueDate: '',
                      clientId: '',
                      endCustomerId: '',
                      siteId: '',
                      siteContact: '',
                      sitePhone: '',
                      orderNumber: '',
                      equipment: '',
                      faultReported: '',
                      // Inspector/Technician completion fields
                      actionTaken: '',
                      serviceType: '',
                      partsJson: '',
                      arrivalTime: '',
                      departureTime: ''
                    });
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

export default Jobs;
