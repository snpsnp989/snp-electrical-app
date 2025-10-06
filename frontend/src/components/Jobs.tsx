import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '../firebase';
import { collection, getDocs, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getApiUrl } from '../config/api';
import { apiClient } from '../utils/apiClient';
import { getJobs as getJobsFromFirebase, createJob as createJobInFirebase, updateJob as updateJobInFirebase, deleteJob as deleteJobInFirebase } from '../services/firebaseService';
import jsPDF from 'jspdf';

// Safe date formatter for Firestore Timestamp, ISO string, or Date
const formatDate = (value: any): string => {
  if (!value) return '—';
  try {
    if (value?.toDate && typeof value.toDate === 'function') {
      return value.toDate().toLocaleDateString();
    }
    if (value?.seconds !== undefined && value?.nanoseconds !== undefined) {
      const millis = value.seconds * 1000 + Math.floor(value.nanoseconds / 1e6);
      return new Date(millis).toLocaleDateString();
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
  } catch {}
  return String(value);
};

// Standard sentence to always append to Action Taken
const STANDARD_ACTION_SENTENCE = 'Tested all safety devices prior to returning equipment to service.';

// Append the standard sentence to Action Taken exactly once
const appendStandardActionTaken = (text: string): string => {
  const base = (text || '').trim();
  if (!base) return STANDARD_ACTION_SENTENCE;
  if (base.endsWith(STANDARD_ACTION_SENTENCE)) return base;
  return `${base}\n\n${STANDARD_ACTION_SENTENCE}`;
};

interface Job {
  id: string;
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
  // Optional foreign keys used when editing/creating a job
  customer_id?: number;
  technician_id?: number;
  photos?: Array<{
    url: string;
    caption: string;
    timestamp: any;
    category?: string;
    isUploading?: boolean;
  }>;
}

interface Customer {
  id: number;
  name: string;
  email: string;
}

interface Technician {
  id: string | number;
  name: string;
  email: string;
}

const Jobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [filter, setFilter] = useState('pending');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
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
    // Technician completion fields - only used when editing completed jobs
    actionTaken: '',
    serviceType: '',
    partsJson: '',
    arrivalTime: '',
    departureTime: '',
    technician_name: ''
  });

  const [clients, setClients] = useState<any[]>([]);
  const [endCustomers, setEndCustomers] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  
  // Parts management state
  const [parts, setParts] = useState<Array<{ description: string; qty: number }>>([]);
  const [availableParts, setAvailableParts] = useState<Array<{ id: string; partNumber: string; description: string; unitType: 'qty' | 'hours' }>>([]);
  
  // Debug parts changes
  useEffect(() => {
    console.log('🔍 Admin parts list changed:', parts);
  }, [parts]);
  const [partsSearch, setPartsSearch] = useState<string>('');
  const [filteredParts, setFilteredParts] = useState<Array<{ id: string; partNumber: string; description: string; unitType: 'qty' | 'hours' }>>([]);
  const [showPartsDropdown, setShowPartsDropdown] = useState<boolean>(false);
  const [showSiteDropdown, setShowSiteDropdown] = useState<boolean>(false);
  const [siteSearchTerm, setSiteSearchTerm] = useState<string>('');

  useEffect(() => {
    // Set up real-time jobs listener
    const q = query(collection(db, 'jobs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        console.log(`Received ${snapshot.docs.length} jobs from Firestore for admin`);
        const allJobs = snapshot.docs.map((d) => {
          const data: any = d.data();
          // Safely convert all Firestore Timestamps to strings
          const safeConvert = (val: any) => {
            if (!val) return null;
            if (val?.toDate && typeof val.toDate === 'function') return val.toDate().toISOString();
            if (val?.seconds !== undefined && val?.nanoseconds !== undefined) {
              const millis = val.seconds * 1000 + Math.floor(val.nanoseconds / 1e6);
              return new Date(millis).toISOString();
            }
            return val;
          };
          return {
            id: d.id,
            ...data,
            created_at: safeConvert(data.created_at),
            updated_at: safeConvert(data.updated_at),
            completed_date: safeConvert(data.completed_date),
            scheduled_date: safeConvert(data.scheduled_date),
            requested_date: safeConvert(data.requested_date),
            due_date: safeConvert(data.due_date),
          } as Job & any;
        });

        // Filter out deleted jobs
        const visible = allJobs.filter((j: any) => j.deleted !== true);
        
        // Sort by created_at desc
        visible.sort((a: any, b: any) => {
          const aTime = a.created_at instanceof Date ? a.created_at.getTime() : new Date(a.created_at || 0).getTime();
          const bTime = b.created_at instanceof Date ? b.created_at.getTime() : new Date(b.created_at || 0).getTime();
          return bTime - aTime;
        });
        
        setJobs(visible);
        console.log(`Set ${visible.length} jobs in admin state`);
      } catch (error) {
        console.error('Error processing jobs snapshot:', error);
      }
    });

    fetchCustomers();
    fetchTechnicians();
    loadClients();
    fetchEquipment();
    fetchParts();
    
    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  // Force re-render when filter changes
  useEffect(() => {
    console.log('Filter changed to:', filter);
  }, [filter]);

  const fetchEquipment = async () => {
    try {
      const snap = await getDocs(collection(db, 'equipment'));
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any;
      setEquipment(Array.isArray(data) ? data : []);
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

  const fetchParts = async () => {
    try {
      console.log('🔍 Fetching parts from database...');
      const partsSnapshot = await getDocs(collection(db, 'parts'));
      const partsData = partsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Array<{ id: string; partNumber: string; description: string; unitType: 'qty' | 'hours' }>;
      
      setAvailableParts(partsData);
      console.log('🔍 Loaded parts from database:', partsData.length, 'parts');
      console.log('🔍 First few parts:', partsData.slice(0, 3));
    } catch (error) {
      console.error('Error fetching parts from Firebase:', error);
    }
  };

  // No longer needed - using manual parts input

  // Update part quantity
  const updatePartQuantity = (index: number, newQty: number) => {
    console.log('🔍 updatePartQuantity called:', { index, newQty, currentQty: parts[index]?.qty });
    if (newQty < 0) return;
    const updatedParts = [...parts];
    updatedParts[index].qty = newQty;
    console.log('🔍 Setting parts to:', updatedParts);
    setParts(updatedParts);
  };

  // Filter parts based on search
  const handlePartsSearch = (searchTerm: string) => {
    console.log('🔍 Parts search triggered:', searchTerm);
    console.log('🔍 Available parts count:', availableParts.length);
    setPartsSearch(searchTerm);
    
    if (searchTerm.trim() === '') {
      // Show all parts when search is empty
      setFilteredParts(availableParts);
      console.log('🔍 Showing all parts:', availableParts.length);
    } else {
      // Filter parts based on search term
      const filtered = availableParts.filter(part => {
        const partNumber = part.partNumber?.toLowerCase() || '';
        const description = part.description?.toLowerCase() || '';
        const searchLower = searchTerm.toLowerCase();
        return partNumber.includes(searchLower) || description.includes(searchLower);
      });
      setFilteredParts(filtered);
      console.log('🔍 Filtered parts:', filtered.length, 'matches');
      console.log('🔍 First few filtered parts:', filtered.slice(0, 3));
    }
    setShowPartsDropdown(true);
  };

  // Add part to list
  const addPartToList = (part: { id: string; partNumber: string; description: string; unitType: 'qty' | 'hours' }) => {
    console.log('🔍 Adding part to admin list:', part.description);
    console.log('🔍 Current parts before adding:', parts);
    const newParts = [...parts, { 
      description: part.description, 
      qty: 1
    }];
    console.log('🔍 New parts after adding:', newParts);
    setParts(newParts);
    setPartsSearch('');
    setShowPartsDropdown(false);
  };

  // Initialize filtered parts when available parts are loaded
  useEffect(() => {
    if (availableParts.length > 0) {
      setFilteredParts(availableParts);
      console.log('🔍 Initialized filtered parts with all available parts:', availableParts.length);
    }
  }, [availableParts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.parts-search-container')) {
        setShowPartsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchJobs = async () => {
    try {
      const data = await getJobsFromFirebase();
      const normalized = (Array.isArray(data) ? data : []).map((j: any) => ({
        ...j,
        status: j.status || 'pending'
      }));
      const visible = normalized.filter((j: any) => j.deleted !== true);
      
      // Force synchronous state update and refresh
      flushSync(() => {
        setJobs(visible as any);
        setRefreshKey(prev => prev + 1);
      });
    } catch (error) {
      console.error('Error fetching jobs (Firebase):', error);
      setJobs([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const snap = await getDocs(collection(db, 'customers'));
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any;
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchTechnicians = async () => {
    try {
      // Use Firestore technicians so admin list and job editor match
      const snap = await getDocs(collection(db, 'technicians'));
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any;
      setTechnicians(data);
    } catch (error) {
      console.error('Error fetching technicians from Firestore:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Prepare payload
      const selectedSite = sites.find((s:any)=>s.id===formData.siteId);
      const siteAddress = selectedSite ? [selectedSite.address, selectedSite.suburb, selectedSite.state, selectedSite.postcode].filter(Boolean).join(', ') : '';
      const payload: any = {
        // Admin job creation fields
        customer_id: formData.customer_id,
        technician_id: formData.technician_id,
        title: formData.equipment || 'Job',
        description: formData.faultReported || '',
        requestedDate: formData.requestedDate,
        dueDate: formData.dueDate,
        clientId: formData.clientId,
        endCustomerId: formData.endCustomerId,
        siteId: formData.siteId,
        siteContact: formData.siteContact,
        sitePhone: formData.sitePhone,
        orderNumber: formData.orderNumber,
        equipment: formData.equipment,
        faultReported: formData.faultReported,
        // Persist selected relationships to Firestore
        client_id: formData.clientId || '',
        end_customer_id: formData.endCustomerId || '',
        site_id: formData.siteId || '',
        siteAddress,
        clientName: (clients.find((c:any)=>c.id===formData.clientId)?.name) || '',
        endCustomerName: (endCustomers.find((c:any)=>c.id===formData.endCustomerId)?.name) || '',
        status: editingJob ? editingJob.status : 'pending' // Preserve existing status when editing, set to pending for new jobs
      };

      // Apply technician completion logic when editing completed jobs
      if (editingJob && editingJob.status === 'completed') {
        // Include all technician completion fields with same logic as technician portal
        payload.action_taken = appendStandardActionTaken(formData.actionTaken);
        payload.service_type = formData.serviceType;
        payload.parts_json = JSON.stringify(parts);
        payload.arrival_time = formData.arrivalTime;
        payload.departure_time = formData.departureTime;
        payload.technician_name = formData.technician_name;
        
        // Apply same completion logic as technician portal
        payload.status = 'completed';
        payload.completed_date = new Date().toISOString();
        payload.updated_at = new Date();
        
        console.log('🔍 Admin completing job with payload:', payload);
      }
    
      if (editingJob) {
        await updateJobInFirebase(String(editingJob.id), payload);
      } else {
        await createJobInFirebase(payload);
      }

      // Simple refresh - just like Visnu codebase
      // Jobs will update automatically via real-time listener
      
      // Small delay to ensure React processes the state update
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
        // Technician completion fields - only used when editing completed jobs
        actionTaken: '',
        serviceType: '',
        partsJson: '',
        arrivalTime: '',
        departureTime: '',
        technician_name: ''
      });
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Failed to save job: ' + (error as Error).message);
    }
  };

  const handleEdit = async (job: Job) => {
    alert('Edit button clicked!');
    alert('Job ID: ' + job.id);
    alert('Job title: ' + job.title);
    console.log('🔍 EDIT BUTTON CLICKED!');
    console.log('🔍 Opening amend modal for job:', job.id);
    console.log('🔍 Job data structure:', job);
    
    // Simple approach - just like Visnu codebase
    const jobToEdit = job;
    
    setEditingJob(jobToEdit);
    const anyJob: any = jobToEdit as any;
    const clientId = anyJob.client_id || anyJob.clientId || '';
    const endCustomerId = anyJob.end_customer_id || anyJob.endCustomerId || '';
    const siteId = anyJob.site_id || anyJob.siteId || '';
    
    console.log('🔍 Extracted IDs:', { clientId, endCustomerId, siteId });
    console.log('🔍 Job title:', jobToEdit.title);
    console.log('🔍 Job description:', jobToEdit.description);
    
    const formDataToSet = {
      customer_id: jobToEdit.customer_id?.toString() || '',
      technician_id: jobToEdit.technician_id?.toString() || '',
      title: jobToEdit.title || '',
      description: jobToEdit.description || '',
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
      // Technician completion fields - only used when editing completed jobs
      actionTaken: anyJob.actionTaken || anyJob.action_taken || '',
      serviceType: anyJob.serviceType || anyJob.service_type || '',
      partsJson: anyJob.parts_json || '',
      arrivalTime: anyJob.arrival_time || anyJob.arrivalTime || '',
      departureTime: anyJob.departure_time || anyJob.departureTime || '',
      technician_name: anyJob.technician_name || ''
    };
    
    console.log('🔍 Form data to set:', formDataToSet);
    setFormData(formDataToSet);
    
    // Load parts data
    try {
      let existingParts = [];
      if (anyJob.parts_json) {
        existingParts = JSON.parse(anyJob.parts_json);
      } else if (anyJob.partsJson) {
        existingParts = JSON.parse(anyJob.partsJson);
      } else if (anyJob.parts) {
        existingParts = Array.isArray(anyJob.parts) ? anyJob.parts : [];
      }
      setParts(existingParts);
    } catch (error) {
      console.error('Error parsing parts data:', error);
      setParts([]);
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

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      // Prepare updates based on status change
      const updates: any = { status: newStatus };
      
      // If changing from completed to another status, clear completed_date
      if (newStatus !== 'completed') {
        updates.completed_date = null;
      }
      
      // If changing to completed, set completed_date
      if (newStatus === 'completed') {
        updates.completed_date = new Date().toISOString();
      }
      
      await updateJobInFirebase(String(jobId), updates);
      
      // Simple refresh - just like Visnu codebase
      // Jobs will update automatically via real-time listener
      
      // Small delay to ensure React processes the state update
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error updating job status:', error);
      alert(`Failed to update job status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Jobs will update automatically via real-time listener
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!window.confirm('Delete this job? This cannot be undone.')) return;
    try {
      // Hard delete in Firestore
      await deleteJobInFirebase(String(jobId));
      // Optimistically update UI
      setJobs(prev => prev.filter(j => j.id !== jobId));
      // Jobs will update automatically via real-time listener
    } catch (error) {
      console.error('Hard delete failed, attempting soft delete:', error);
      try {
        await updateJobInFirebase(String(jobId), { deleted: true });
        setJobs(prev => prev.filter(j => j.id !== jobId));
        // Jobs will update automatically via real-time listener
      } catch (err2) {
        console.error('Soft delete also failed:', err2);
        alert('Failed to delete job');
      }
    }
  };




  const handleJobSelection = (jobId: string) => {
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
      const response = await fetch(`${getApiUrl()}/api/send-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          jobIds: selectedJobs
        })
      });

      if (response.ok) {
        alert(`Successfully sent ${selectedJobs.length} report(s) to customers`);
        setSelectedJobs([]);
        setIsSelectAll(false);
        // Jobs will update automatically via real-time listener
      } else {
        const error = await response.json();
        alert(`Failed to send reports: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending reports:', error);
      alert('Failed to send reports to customers');
    }
  };

  // Report generation functions - Original working system
  const generatePDF = async (job: any) => {
    const doc = new jsPDF();
    
    // Date formatting function
    const formatDate = (date: any) => {
      try {
        if (date && typeof date === 'object' && (date as any).toDate) {
          return (date as any).toDate().toLocaleDateString('en-AU');
        } else if (date) {
          return new Date(date).toLocaleDateString('en-AU');
        }
        return 'N/A';
      } catch (e) {
        return 'N/A';
      }
    };
    
    // Get technician name from ID
    let technicianName = 'N/A';
    if (job.technician || job.technician_name || job.technicianName || job.technician_id) {
      const technicianId = job.technician || job.technician_name || job.technicianName || job.technician_id;
      console.log('🔍 Looking up technician with ID:', technicianId);
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        
        // Try to get the document directly by ID
        const technicianDocRef = doc(db, 'technicians', technicianId);
        const technicianDoc = await getDoc(technicianDocRef);
        
        console.log('🔍 Document exists:', technicianDoc.exists());
        
        if (technicianDoc.exists()) {
          const technicianData = technicianDoc.data();
          console.log('🔍 Technician data:', technicianData);
          technicianName = technicianData.name || 
                          technicianData.fullName || 
                          (technicianData.firstName && technicianData.lastName ? 
                            `${technicianData.firstName} ${technicianData.lastName}` : 
                            technicianId);
        } else {
          technicianName = technicianId; // Fallback to ID if document not found
        }
      } catch (error) {
        console.log('Error fetching technician:', error);
        technicianName = technicianId; // Fallback to ID
      }
    }
    
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 20;

    // Professional header with blue styling
    // Header background box - dark blue-gray
    doc.setFillColor(45, 55, 70); // Dark blue-gray background
    doc.rect(15, 15, pageWidth - 30, 45, 'F'); // Filled rectangle
    
    // Header border - darker blue
    doc.setDrawColor(30, 40, 55); // Darker blue border
    doc.setLineWidth(0.8);
    doc.rect(15, 15, pageWidth - 30, 45); // Border rectangle
    
    // Left side company info - white text on blue background
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255); // White text on blue background
    doc.text('18 Newell Close', 20, currentY);
    currentY += 4;
    doc.text('Taylors Lakes 3038', 20, currentY);
    currentY += 4;
    doc.text('0488 038 898', 20, currentY);
    currentY += 4;
    doc.text('snpelec@gmail.com', 20, currentY);
    currentY += 4;
    
    // Center - Service Report title with blue styling
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255); // White text on blue background
    doc.text('SERVICE REPORT v2.0', pageWidth / 2 - 50, 25);
    
    // Right side - Logo and Company details
    try {
      // Add the SNP logo image on the right side
      const logoWidth = 40;
      const logoHeight = 20;
      doc.addImage('/snp-logo.jpg', 'JPEG', pageWidth - 60, 15, logoWidth, logoHeight);
    } catch (error) {
      console.log('Logo not found, using text fallback:', error);
      // Fallback to text if logo not found
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 140, 0); // Orange
      doc.text('SNP', pageWidth - 60, 20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('electrical', pageWidth - 60, 30);
    }
    
    // Company details below logo - white text on blue background
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255); // White text on blue background
    doc.text('REC 16208', pageWidth - 60, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('ABN: 22 592 137 642', pageWidth - 60, 46);
    
    currentY = 70;

    // Helper: split text to size with consistent line height (prevents overlap)
    const renderLines = (lines: string[], x: number, startY: number, lineHeight = 7, draw = true) => {
      let cursorY = startY;
      for (const line of lines) {
        if (draw) doc.text(line || ' ', x, cursorY);
        cursorY += lineHeight;
      }
      return cursorY;
    };

    // Helper function to wrap text using splitTextToSize. If draw=false, only measures.
    const wrapText = (text: string, maxWidth: number, x: number, y: number, draw: boolean = true) => {
      const lines = doc.splitTextToSize(String(text || ''), maxWidth) as string[];
      return renderLines(lines, x, y, 7, draw);
    };

    // Helper: wrap multi-paragraph text (handles \n and blank lines). If draw=false, only measures.
    const wrapTextBlock = (text: string, maxWidth: number, x: number, y: number, draw: boolean = true) => {
      const paragraphs = String(text || '').replace(/\r\n/g, '\n').split('\n');
      let cursorY = y;
      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        if (p.trim().length === 0) {
          // preserve blank line spacing
          cursorY += 7;
          continue;
        }
        const lines = doc.splitTextToSize(p, maxWidth) as string[];
        cursorY = renderLines(lines, x, cursorY, 7, draw);
      }
      return cursorY;
    };

    // Original simple layout - compact for 20+ parts
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    // Job details section with blue styling
    // Background for job details - light blue-gray
    doc.setFillColor(240, 245, 250); // Light blue-gray background
    doc.rect(15, currentY - 5, pageWidth - 30, 25, 'F');
    
    // Border for job details - blue border
    doc.setDrawColor(100, 130, 160);
    doc.setLineWidth(0.5);
    doc.rect(15, currentY - 5, pageWidth - 30, 25);
    
    // Service Report Number and Date - blue styling
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(45, 55, 70); // Dark blue-gray labels
    doc.text('Service Report Number:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30); // Dark text for values
    doc.text(String(job.snpid || job.id || 'N/A'), 20 + 50, currentY);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 70); // Dark blue-gray labels
    doc.text('Date:', pageWidth / 2 + 10, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30); // Dark text for values
    doc.text(job.completed_date ? formatDate(job.completed_date) : 'N/A', pageWidth / 2 + 10 + 50, currentY);
    currentY += 8;
    
    // Order Number
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 70); // Dark blue-gray labels
    doc.text('Order Number:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 0, 0); // Red color for order number data
    doc.text(job.orderNumber || job.order_number || 'N/A', 20 + 50, currentY);
    currentY += 8;
    
    // Customer details section - NO border (like your reference)
    // Customer Name
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 70);
    doc.text("Customer's Name:", 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(job.clientName || 'N/A', 20 + 50, currentY);
    currentY += 8;
    
    // Site Name
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 70);
    doc.text('Site Name:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(job.endCustomerName || 'N/A', 20 + 50, currentY);
    currentY += 8;
    
    // Site Address
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 70);
    doc.text('Site:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(job.siteAddress || 'N/A', 20 + 50, currentY);
    currentY += 8;
    
    // Site Contact and Phone Number
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 70);
    doc.text('Site Contact:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(job.siteContact || job.clientContactName || 'N/A', 20 + 50, currentY);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 70);
    doc.text('Phone Number:', pageWidth / 2 + 10, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(job.sitePhone || job.clientPhone || 'N/A', pageWidth / 2 + 10 + 50, currentY);
    currentY += 8;
    
    // Equipment
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 70);
    doc.text('Equipment:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(job.equipment || 'N/A', 20 + 50, currentY);
    currentY += 8;
    
    // Service Type
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 70);
    doc.text('Service Type:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 0, 0); // Red color for service type data
    doc.text(job.serviceType || job.service_type || 'N/A', 20 + 50, currentY);
    currentY += 8;
    
    // Fault Reported section with border
    currentY += 10; // Add space before fault section
    doc.setFillColor(248, 250, 252); // Very light blue background
    doc.rect(15, currentY - 5, pageWidth - 30, 25, 'F');
    doc.setDrawColor(180, 200, 220); // Blue border
    doc.setLineWidth(0.3);
    doc.rect(15, currentY - 5, pageWidth - 30, 25);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 70);
    doc.text('Fault Reported:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    if (job.faultReported) {
      wrapText(job.faultReported, pageWidth - 40, 20, currentY + 6);
    } else {
      doc.text('No fault reported', 20, currentY + 6);
    }
    currentY += 20;
    
    // Action Taken section with dynamic height and multi-page support
    currentY += 10; // Add space before action section
    const actionBoxLeft = 15;
    const actionBoxWidth = pageWidth - 30;
    let actionLabelY = currentY;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 70);
    doc.text('Action Taken:', 20, actionLabelY);

    // Prepare text
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const actionTextRaw = (job as any).actionTaken || (job as any).action_taken || '';
    const actionText = appendStandardActionTaken(actionTextRaw);

    // Split into paragraphs and lines using splitTextToSize (robust for 1500-2000 chars)
    const paragraphs = String(actionText || '').replace(/\r\n/g, '\n').split('\n');
    const allLines: string[] = [];
    for (const p of paragraphs) {
      if (p.trim().length === 0) {
        allLines.push('');
      } else {
        const lines = doc.splitTextToSize(p, pageWidth - 40) as string[];
        allLines.push(...lines);
      }
    }

    const lineHeight = 8; // generous spacing to avoid overlap
    let cursorIndex = 0;
    const pageBottom = 250; // keep consistent with parts paging

    while (cursorIndex <= allLines.length) {
      const startY = actionLabelY + 6;
      const available = pageBottom - startY - 5; // leave small padding
      const maxLinesThisPage = Math.max(1, Math.floor(available / lineHeight));
      const endIndexExclusive = Math.min(allLines.length, cursorIndex + maxLinesThisPage);
      const linesThisPage = allLines.slice(cursorIndex, endIndexExclusive);

      // Compute box height for this page
      const contentHeight = Math.max(10, linesThisPage.length * lineHeight);
      const boxTop = actionLabelY - 5;
      const boxHeight = Math.max(25, contentHeight + 12);

      // Draw background and border for this page section
      doc.setFillColor(248, 250, 252);
      doc.rect(actionBoxLeft, boxTop, actionBoxWidth, boxHeight, 'F');
      doc.setDrawColor(180, 200, 220);
      doc.setLineWidth(0.3);
      doc.rect(actionBoxLeft, boxTop, actionBoxWidth, boxHeight);

      // Draw label again (ensures it shows on page splits only once per section)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 55, 70);
      doc.text('Action Taken:', 20, actionLabelY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);

      // Render lines
      let textY = startY;
      for (const line of linesThisPage) {
        doc.text(line || ' ', 20, textY);
        textY += lineHeight;
      }

      cursorIndex = endIndexExclusive;
      if (cursorIndex < allLines.length) {
        // More lines remain → add page and continue
        doc.addPage();
        actionLabelY = 20; // top margin on new page
      } else {
        // Advance currentY to below the box
        currentY = boxTop + boxHeight + 5;
        break;
      }
    }
    
    // Serviced By - no border, moved down 2 lines
    currentY += 16; // Add 2 lines of spacing (8 pixels per line)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 70);
    doc.text('Serviced By:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(technicianName, 20 + 50, currentY);
    currentY += 15;
    
    // Parts/Service table with blue styling
    // Table header background - dark blue
    doc.setFillColor(45, 55, 70); // Dark blue-gray header background
    doc.rect(15, currentY - 5, pageWidth - 30, 12, 'F');
    
    // Table header border - darker blue
    doc.setDrawColor(30, 40, 55);
    doc.setLineWidth(0.5);
    doc.rect(15, currentY - 5, pageWidth - 30, 12);
    
    // Table header text - white on blue
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255); // White text on blue background
    doc.text('QTY', 20, currentY);
    doc.text('Description', 60, currentY);
    currentY += 10;
    
    // Get parts data
    let parts = [];
    console.log('🔍 PDF Generation v2.0 - Job data:', {
      id: job.id,
      title: job.title,
      partsJson: job.partsJson,
      parts_json: job.parts_json,
      parts: job.parts,
      timestamp: new Date().toISOString()
    });
    
    if (job.partsJson) {
      try {
        parts = JSON.parse(job.partsJson);
        console.log('🔍 PDF Generation - Parsed partsJson:', parts);
      } catch (e) {
        console.log('Error parsing partsJson:', e);
      }
    } else if (job.parts_json) {
      try {
        parts = JSON.parse(job.parts_json);
        console.log('🔍 PDF Generation - Parsed parts_json:', parts);
      } catch (e) {
        console.log('Error parsing parts_json:', e);
      }
    } else if (job.parts) {
      parts = job.parts;
      console.log('🔍 PDF Generation - Using parts array:', parts);
    }
    
    console.log('🔍 PDF Generation - Final parts array:', parts);
    console.log('🔍 PDF Generation - Parts length:', parts.length);
    if (parts.length > 0) {
      console.log('🔍 PDF Generation - First part:', parts[0]);
      console.log('🔍 PDF Generation - First part description:', parts[0].description);
    }
    
        // Render parts with page break handling and professional styling
        if (parts && parts.length > 0) {
          parts.forEach((part: any, index: number) => {
            // Check if we need a new page
            if (currentY > 250) { // Leave space for footer
              doc.addPage();
              currentY = 20;
              
              // Re-add header on new page with styling
              doc.setFillColor(50, 50, 50);
              doc.rect(15, currentY - 5, pageWidth - 30, 12, 'F');
              doc.setDrawColor(30, 30, 30);
              doc.setLineWidth(0.5);
              doc.rect(15, currentY - 5, pageWidth - 30, 12);
              
              doc.setFontSize(10);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(255, 255, 255);
              doc.text('QTY', 20, currentY);
              doc.text('Description', 60, currentY);
              currentY += 10;
            }
            
            // Alternating row colors - blue theme
            if (index % 2 === 0) {
              doc.setFillColor(248, 250, 252); // Very light blue for even rows
            } else {
              doc.setFillColor(240, 245, 250); // Light blue-gray for odd rows
            }
            doc.rect(15, currentY - 3, pageWidth - 30, 8, 'F');
            
            // Row border - blue
            doc.setDrawColor(180, 200, 220);
            doc.setLineWidth(0.2);
            doc.rect(15, currentY - 3, pageWidth - 30, 8);
            
            const qty = part.qty || part.quantity || '1';
            const description = part.description || 'Labour';
            
            console.log('🔍 PDF Part Debug:', {
              part: part,
              qty: qty,
              description: description,
              hasDescription: !!part.description,
              partDescription: part.description,
              partQty: part.qty
            });
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(30, 30, 30);
            doc.text(String(qty), 20, currentY);
            wrapText(description, 60, 60, currentY);
            
            currentY += 8;
          });
        } else {
          // Default entries if no parts with blue styling
          // Service Call row
          doc.setFillColor(248, 250, 252); // Very light blue
          doc.rect(15, currentY - 3, pageWidth - 30, 8, 'F');
          doc.setDrawColor(180, 200, 220); // Blue border
          doc.setLineWidth(0.2);
          doc.rect(15, currentY - 3, pageWidth - 30, 8);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(30, 30, 30);
          doc.text('1', 20, currentY);
          doc.text('Labour', 60, currentY);
          currentY += 8;
          
          // Labour row
          doc.setFillColor(240, 245, 250); // Light blue-gray
          doc.rect(15, currentY - 3, pageWidth - 30, 8, 'F');
          doc.setDrawColor(180, 200, 220); // Blue border
          doc.setLineWidth(0.2);
          doc.rect(15, currentY - 3, pageWidth - 30, 8);
          
          doc.text('1', 20, currentY);
          doc.text('Labour', 60, currentY);
          currentY += 8;
        }
    
    return doc;
  };

  const handleGenerateReport = async (job: any) => {
    console.log('🔍 GENERATE REPORT CLICKED - Job:', job);
    console.log('🔍 Job partsJson:', job.partsJson);
    console.log('🔍 Job parts_json:', job.parts_json);
    console.log('🔍 Job parts:', job.parts);
    console.log('🔍 Job status:', job.status);
    console.log('🔍 Job title:', job.title);
    try {
      // Fetch the latest job data from Firestore to ensure we have the most up-to-date information
      const jobRef: any = doc(db, 'jobs', job.id);
      const jobSnap = await getDoc(jobRef);
      
      if (!jobSnap.exists()) {
        alert('Job not found');
        return;
      }
      
      const latestJobData = { id: jobSnap.id, ...(jobSnap.data() as any) };
      console.log('🔍 Latest job data from Firestore:', latestJobData);
      console.log('🔍 Latest parts_json:', latestJobData.parts_json);
      
      // Generate service report number
      const reportNumber = `SR-${Date.now()}`;
      console.log('🔍 About to call generatePDF with latest job data:', latestJobData);
      console.log('🔍 Report number:', reportNumber);
      
      const pdfDoc = await generatePDF(latestJobData);
      console.log('🔍 PDF generated successfully');
      const fileName = `service-report-${reportNumber}.pdf`;
      pdfDoc.save(fileName);
      console.log('🔍 PDF saved as:', fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report');
    }
  };

  const handleViewReport = async (job: any) => {
    try {
      // Fetch the latest job data from Firestore to ensure we have the most up-to-date information
      const jobRef: any = doc(db, 'jobs', job.id);
      const jobSnap = await getDoc(jobRef);
      
      if (!jobSnap.exists()) {
        alert('Job not found');
        return;
      }
      
      const latestJobData = { id: jobSnap.id, ...(jobSnap.data() as any) };
      console.log('🔍 View Report - Latest job data from Firestore:', latestJobData);
      
      const pdfDoc = await generatePDF(latestJobData);
      const pdfBlob = pdfDoc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error('Error viewing PDF:', error);
      alert('Failed to open PDF report');
    }
  };

  const filteredJobs = jobs.filter(job => {
    // Debug specific job filtering
    if (job.id === 'J5CVHLcCAWgqjGHJuhk0') {
      console.log('Filtering debug job:', {
        id: job.id,
        status: job.status,
        filter: filter,
        serviceTypeFilter: serviceTypeFilter,
        searchTerm: searchTerm
      });
    }
    
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

    const statusMatch = job.status === filter;
    const serviceTypeMatch = serviceTypeFilter === '' || 
      (job as any).service_type === serviceTypeFilter || 
      (job as any).serviceType === serviceTypeFilter;
    const result = statusMatch && serviceTypeMatch && searchMatch;
    
    if (job.id === 'J5CVHLcCAWgqjGHJuhk0') {
      console.log('Debug job filter result:', {
        statusMatch,
        serviceTypeMatch,
        searchMatch,
        result
      });
    }
    
    if (filter === 'completed' && job.status === 'completed') {
      console.log(`Job ${job.id} (${job.title}): status=${job.status}, filter=${filter}, statusMatch=${statusMatch}, serviceTypeMatch=${serviceTypeMatch}, searchMatch=${searchMatch}, result=${result}`);
    }
    return result;
  });

  console.log('Current filter:', filter);
  console.log('Total jobs:', jobs.length);
  console.log('All jobs:', jobs);
  console.log('Filtered jobs count:', filteredJobs.length);
  console.log('Filtered jobs:', filteredJobs);
  console.log('Service type filter:', serviceTypeFilter);
  console.log('Search term:', searchTerm);

  return (
    <div key={refreshKey} className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
              <p className="mt-1 text-sm text-gray-600">Manage and track all service requests</p>
            </div>
            <div className="flex space-x-3">
              {selectedJobs.length > 0 && filter === 'completed' && (
                <button
                  onClick={handleSendReportsToCustomer}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Reports ({selectedJobs.length})
                </button>
              )}
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Job
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
            {/* Status Filters */}
            <div className="flex space-x-2">
              {['pending', 'in_progress', 'completed'].map((status) => (
              <button
                key={status}
                onClick={async () => {
                  console.log('🔍 Tab clicked:', status, '- refreshing current screen first');
                  
                  // Step 1: Refresh current screen first
                  // Jobs will update automatically via real-time listener
                  console.log('🔍 Current screen refreshed, now switching to:', status);
                  
                  // Step 2: Move to selected tab
                  setFilter(status);
                  setServiceTypeFilter(''); // Reset service type filter when changing status
                  if (status !== 'completed') {
                    setSelectedJobs([]); // Clear selected jobs when not in completed tab
                    setIsSelectAll(false);
                  }
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
          
          {/* Manual Refresh Button - Temporary for debugging */}
          <button
            onClick={async () => {
              console.log('🔄 ===== MANUAL REFRESH BUTTON CLICKED =====');
              console.log('🔄 Manual refresh button clicked...');
              // Jobs will update automatically via real-time listener
              console.log('🔄 Manual refresh completed');
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
            title="Refresh jobs data"
          >
            🔄 Manual Refresh
          </button>
          
          {/* Service Type Filter - Only show for completed jobs */}
          {filter === 'completed' && (
            <div className="flex items-center space-x-2">
              <label className="text-gray-300 text-sm">Service Type:</label>
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
                className="bg-white text-gray-900 border border-gray-300 px-3 py-2 rounded-md text-sm"
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
              className="w-full bg-white text-gray-900 px-4 py-2 pl-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Jobs ({filteredJobs.length})
              </h2>
              {searchTerm && (
                <p className="text-sm text-gray-600 mt-1">
                  Filtered by "{searchTerm}"
                </p>
              )}
            </div>
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
                <div key={job.id} className="flex items-center justify-between p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
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
                    <h3 className="text-gray-900 font-medium flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-gray-600 text-xs">Service Report Number {(job as any).snpid || job.id}</span>
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">Order Number: {(job as any).order_number || (job as any).orderNumber || '—'}</p>
                    <p className="text-gray-600 text-sm">Service Type: {(job as any).service_type || (job as any).serviceType || '—'}</p>
                    <p className="text-gray-600 text-sm">{(job as any).site_address || (job as any).siteAddress || 'Site address not set'}</p>
                    <p className="text-gray-600 text-sm">Equipment: {(job as any).equipment || '—'} • Fault: {(job as any).fault_reported || (job as any).faultReported || '—'}</p>
                    {job.status !== 'completed' && (
                      <p className="text-gray-600 text-sm mt-2">Requested: {(job as any).requested_date || (job as any).requestedDate || '—'} • Due: {(job as any).due_date || (job as any).dueDate || '—'}</p>
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
                          className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            job.status === 'completed' 
                              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
                          }`}
                          title={job.status === 'completed' ? 'Amend completed job' : 'Edit job'}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          {job.status === 'completed' ? 'Amend' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                      
                      {/* Report buttons for completed jobs */}
                      {job.status === 'completed' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleGenerateReport(job)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                            title="Generate and download PDF report"
                          >
                            📄 Generate
                          </button>
                          <button
                            onClick={() => handleViewReport(job)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                            title="View PDF report in new tab"
                          >
                            👁️ View
                          </button>
                        </div>
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
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
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
                  <label className="block text-gray-700 text-sm font-medium mb-2">Requested Date</label>
                  <DatePicker
                    selected={formData.requestedDate ? new Date(formData.requestedDate) : null}
                    onChange={(date: Date | null) => setFormData({ ...formData, requestedDate: date ? date.toISOString().slice(0,10) : '' })}
                    className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500"
                    popperClassName="date-popper-lg"
                    calendarClassName="!text-base !p-2"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Must be completed by</label>
                  <DatePicker
                    selected={formData.dueDate ? new Date(formData.dueDate) : null}
                    onChange={(date: Date | null) => setFormData({ ...formData, dueDate: date ? date.toISOString().slice(0,10) : '' })}
                    className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500"
                    popperClassName="date-popper-lg"
                    calendarClassName="!text-base !p-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {clients.length > 1 && (
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Client</label>
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
                  }} className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500" required>
                    <option value="">Select Client</option>
                    {clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                )}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">End-Customer</label>
                  <select value={formData.endCustomerId} onChange={async (e) => {
                    const endCustomerId = e.target.value; setFormData({ ...formData, endCustomerId, siteId: '' });
                    if (formData.clientId && endCustomerId) {
                      const sSnap = await getDocs(collection(db, `clients/${formData.clientId}/customers/${endCustomerId}/sites`));
                      const sitesData = sSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any;
                      console.log('Loaded sites data:', sitesData);
                      setSites(sitesData);
                    }
                  }} className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500" required>
                    <option value="">Select End-Customer</option>
                    {endCustomers.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Site</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.siteId ? (() => {
                        const selectedSite = sites.find(s => s.id === formData.siteId);
                        return selectedSite ? [selectedSite.address, selectedSite.suburb, selectedSite.state, selectedSite.postcode].filter(Boolean).join(', ') : '';
                      })() : siteSearchTerm}
                      onChange={(e) => {
                        const searchTerm = e.target.value;
                        setSiteSearchTerm(searchTerm);
                        if (searchTerm === '') {
                          setFormData({ ...formData, siteId: '' });
                        }
                      }}
                      onFocus={() => setShowSiteDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSiteDropdown(false), 200)}
                      placeholder="Search sites by address, number, suburb..."
                      className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500"
                      required
                    />
                    {showSiteDropdown && (
                      <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                        {sites.length > 0 ? (
                          sites
                            .filter(s => {
                              const fullAddress = [s.address, s.suburb, s.state, s.postcode].filter(Boolean).join(', ').toLowerCase();
                              return fullAddress.includes(siteSearchTerm.toLowerCase());
                            })
                            .map(s => (
                              <div
                                key={s.id}
                                onClick={() => {
                                  const selectedSite = s;
                                  console.log('Site selection changed to:', s.id);
                                  console.log('Available sites:', sites);
                                  
                                  // Auto-populate equipment from site
                                  let equipmentList = '';
                                  console.log('Selected site data:', selectedSite);
                                  console.log('Site equipment:', selectedSite?.equipment);
                                  console.log('Available equipment:', equipment);
                                  
                                  if (selectedSite && selectedSite.equipment && Array.isArray(selectedSite.equipment)) {
                                    const siteEquipment = selectedSite.equipment.map((eqId: string) => {
                                      const eq = equipment.find(e => e.id === eqId);
                                      return eq ? eq.name : eqId;
                                    }).filter(Boolean);
                                    equipmentList = siteEquipment.join(', ');
                                    console.log('Mapped equipment list:', equipmentList);
                                  }
                                  
                                  setFormData({ 
                                    ...formData, 
                                    siteId: s.id, 
                                    title: formData.equipment || 'Job', 
                                    description: formData.faultReported || '', 
                                    siteContact: formData.siteContact, 
                                    sitePhone: formData.sitePhone,
                                    equipment: equipmentList
                                  });
                                  setSiteSearchTerm('');
                                  setShowSiteDropdown(false);
                                }}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                              >
                                <div className="text-gray-900">{[s.address, s.suburb, s.state, s.postcode].filter(Boolean).join(', ')}</div>
                              </div>
                            ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500">Loading sites...</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">Site Contact</label>
                    <input value={formData.siteContact} onChange={(e)=>setFormData({...formData, siteContact: e.target.value})} className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">Phone Number</label>
                    <input value={formData.sitePhone} onChange={(e)=>setFormData({...formData, sitePhone: e.target.value})} className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">Order Number</label>
                    <input value={formData.orderNumber} onChange={(e)=>setFormData({...formData, orderNumber: e.target.value})} className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">Equipment</label>
                    <select value={formData.equipment} onChange={(e)=>setFormData({...formData, equipment: e.target.value})} className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500">
                      <option value="">Select Equipment</option>
                      {equipment.filter(eq => eq.is_active !== false).map((eq) => (
                        <option key={eq.id} value={eq.name}>{eq.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Fault Reported</label>
                  <input value={formData.faultReported} onChange={(e)=>setFormData({...formData, faultReported: e.target.value})} className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500" />
                </div>
              </div>

              {technicians.length > 1 && (
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Technician</label>
                <select
                  value={formData.technician_id}
                  onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
                  className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500"
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


              {/* Inspector/Technician Completion Fields - Always show for completed jobs */}
              {editingJob && editingJob.status === 'completed' && (
                <div className="border-t border-gray-600 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Inspector/Technician Completion Data</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Arrival Time</label>
                      <input
                        type="time"
                        value={formData.arrivalTime}
                        onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                        className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Departure Time</label>
                      <input
                        type="time"
                        value={formData.departureTime}
                        onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                        className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">Service Type</label>
                    <select
                      value={formData.serviceType}
                      onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                      className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500"
                    >
                      <option value="">Select Service Type</option>
                      <option value="Vandalism">Vandalism</option>
                      <option value="Repairs/Maintenance">Repairs/Maintenance</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">Action Taken</label>
                    <textarea
                      value={formData.actionTaken}
                      onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                      onInput={(e) => {
                        const el = e.currentTarget as HTMLTextAreaElement;
                        el.style.height = 'auto';
                        el.style.height = `${el.scrollHeight}px`;
                      }}
                      className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500"
                      rows={3}
                      style={{ overflow: 'hidden' }}
                      placeholder="Describe the action taken to resolve the issue..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">Parts/Labour Used</label>
                    
                    {/* Parts Search with Database */}
                    <div className="relative mb-3 parts-search-container">
                      <input
                        type="text"
                        value={partsSearch}
                        onChange={(e) => handlePartsSearch(e.target.value)}
                        onFocus={() => setShowPartsDropdown(true)}
                        placeholder="Search parts by number or description..."
                        className="w-full bg-white text-gray-900 border-2 border-gray-400 px-3 py-2 rounded-md focus:border-blue-500"
                      />
                      
                      {/* Parts Dropdown */}
                      {showPartsDropdown && (
                        <div className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto">
                          <div className="px-3 py-2 text-gray-400 text-sm">
                            Debug: showPartsDropdown={showPartsDropdown.toString()}, filteredParts={filteredParts.length}, availableParts={availableParts.length}
                          </div>
                          {filteredParts.length > 0 ? (
                            <>
                              {filteredParts.slice(0, 10).map((part) => (
                                <div
                                  key={part.id}
                                  onClick={() => addPartToList(part)}
                                  className="px-3 py-2 hover:bg-gray-600 cursor-pointer border-b border-gray-600 last:border-b-0"
                                >
                                  <div className="text-white font-medium">{part.partNumber}</div>
                                  <div className="text-gray-300 text-sm">{part.description}</div>
                                  <div className="text-gray-400 text-xs">
                                    {part.unitType === 'qty' ? 'Quantity' : 'Hours'}
                                  </div>
                                </div>
                              ))}
                              {filteredParts.length > 10 && (
                                <div className="px-3 py-2 text-gray-400 text-sm text-center">
                                  ... and {filteredParts.length - 10} more
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="px-3 py-2 text-gray-400 text-sm">
                              No parts found. Available parts: {availableParts.length}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Parts List - Simplified like Technician Portal */}
                    <div className="space-y-2">
                      {parts.map((p, idx) => (
                        <div key={idx} className="flex gap-1 items-center">
                          <div className="flex-1">
                            <input 
                              value={p.description} 
                              onChange={(e)=>{
                                const v=[...parts]; v[idx].description = e.target.value; setParts(v);
                              }}
                              className="w-full bg-white text-gray-900 border border-gray-300 px-2 py-2 rounded-md text-sm" 
                              placeholder="Part description..." 
                            />
                          </div>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center bg-gray-700 rounded-md">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('🔍 Minus button clicked for part', idx, 'current qty:', p.qty);
                                updatePartQuantity(idx, p.qty - 1);
                              }}
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
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('🔍 Plus button clicked for part', idx, 'current qty:', p.qty);
                                updatePartQuantity(idx, p.qty + 1);
                              }}
                              className="px-2 py-2 text-white hover:bg-gray-600 rounded-r-md text-sm"
                            >
                              +
                            </button>
                          </div>
                          
                          <button 
                            type="button"
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
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md font-medium"
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

              {/* Photos Section - Show for completed jobs */}
              {editingJob && editingJob.status === 'completed' && editingJob.photos && editingJob.photos.length > 0 && (
                <div className="border-t border-gray-600 pt-4">
                  <h3 className="text-lg font-semibold text-white mb-3">📸 Job Photos</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {editingJob.photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo.url}
                          alt={photo.caption || `Job photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-600"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-image.png';
                          }}
                        />
                        {photo.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 rounded-b-lg">
                            {photo.caption}
                          </div>
                        )}
                        {photo.category && (
                          <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            {photo.category}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => window.open(photo.url, '_blank')}
                            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1 rounded text-sm"
                          >
                            View Full Size
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-400 text-sm mt-2">
                    {editingJob.photos.length} photo{editingJob.photos.length !== 1 ? 's' : ''} uploaded for this job
                  </p>
                </div>
              )}

              <div>
                {/* Priority/Scheduled removed per spec */}
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  onClick={(e) => {
                    console.log('🔍 Update Job button clicked!');
                    console.log('🔍 Button click - parts state:', parts);
                    console.log('🔍 Button click - parts length:', parts.length);
                    // Let the form submission handle the rest
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors font-medium"
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
                      // Technician completion fields - only used when editing completed jobs
                      actionTaken: '',
                      serviceType: '',
                      partsJson: '',
                      arrivalTime: '',
                      departureTime: '',
                      technician_name: ''
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

        </div>
      </div>
    </div>
  );
};

export default Jobs;
