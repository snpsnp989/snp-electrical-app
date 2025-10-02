import React, { useState, useEffect } from 'react';
import { 
  addJobPhoto
} from '../services/firebaseService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import TechnicianLogin from './TechnicianLogin';
import PhotoUploadForm from './PhotoUploadForm';
import TechnicianPerformance from './TechnicianPerformance';

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  end_customer_name?: string;
  site_address?: string;
  site_phone?: string;
  equipment?: string;
  fault_reported?: string;
  order_number?: string;
  snpid?: string;
  scheduled_date: any;
  technician_notes?: string;
  photos?: Array<{
    url: string;
    caption: string;
    timestamp: any;
    category?: string;
    isUploading?: boolean;
  }>;
}

const TechnicianMobile: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [technicianName, setTechnicianName] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notes, setNotes] = useState('');
  const [serviceType, setServiceType] = useState<string>('');
  const [arrival, setArrival] = useState<string>('');
  const [departure, setDeparture] = useState<string>('');
  const [parts, setParts] = useState<Array<{ description: string; qty: number }>>([]);
  const [availableParts, setAvailableParts] = useState<Array<{ id: string; partNumber: string; description: string; unitType: 'qty' | 'hours' }>>([]);
  const [partsSearch, setPartsSearch] = useState<string>('');
  const [filteredParts, setFilteredParts] = useState<Array<{ id: string; partNumber: string; description: string; unitType: 'qty' | 'hours' }>>([]);
  const [showPartsDropdown, setShowPartsDropdown] = useState<boolean>(false);
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [photoCategories, setPhotoCategories] = useState<Array<{
    id: string;
    name: string;
    photos: Array<{
      url: string;
      caption: string;
      timestamp: any;
      category: string;
      metadata?: {
        location?: string;
        equipment?: string;
        issue?: string;
      };
    }>;
  }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [sortBy, setSortBy] = useState('date');
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: Date;
  }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [timesheet, setTimesheet] = useState<Array<{
    id: string;
    jobId: string;
    jobTitle: string;
    startTime: Date;
    endTime?: Date;
    breakTime: number; // minutes
    totalHours: number;
    status: 'active' | 'completed';
    notes?: string;
  }>>([]);
  const [currentTimesheet, setCurrentTimesheet] = useState<{
    jobId: string;
    startTime: Date;
    breakTime: number;
  } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState<Array<{
    type: 'job_update' | 'photo_upload' | 'timesheet';
    data: any;
    timestamp: Date;
  }>>([]);
  const [activeTab, setActiveTab] = useState<'jobs' | 'performance'>('jobs');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get the correct API URL based on environment
  const getApiUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5001';
    }
    // For production and mobile devices, use the Mac's IP address
    return 'http://192.168.0.223:5001';
  };

  // Fetch parts data from Firebase
  const fetchParts = async () => {
    try {
      const partsSnapshot = await getDocs(collection(db, 'parts'));
      const partsData = partsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Array<{ id: string; partNumber: string; description: string; unitType: 'qty' | 'hours' }>;
      
      setAvailableParts(partsData);
      setFilteredParts(partsData);
    } catch (error) {
      console.error('Error fetching parts from Firebase:', error);
    }
  };

  // Populate form fields when a job is selected
  useEffect(() => {
    if (selectedJob) {
      // Populate action taken (notes) from completed job
      if (selectedJob.status === 'completed' && (selectedJob as any).action_taken) {
        setNotes((selectedJob as any).action_taken);
      } else {
        setNotes('');
      }

      // Populate service type from completed job
      if (selectedJob.status === 'completed' && (selectedJob as any).service_type) {
        setServiceType((selectedJob as any).service_type);
      } else {
        setServiceType('');
      }

      // Populate parts from completed job
      if (selectedJob.status === 'completed' && (selectedJob as any).parts_json) {
        try {
          const existingParts = JSON.parse((selectedJob as any).parts_json);
          setParts(existingParts);
        } catch (error) {
          console.error('Error parsing parts_json:', error);
          setParts([]);
        }
      } else {
        setParts([]);
      }
    }
  }, [selectedJob]);

  // Filter parts based on search
  const handlePartsSearch = (searchTerm: string) => {
    setPartsSearch(searchTerm);
    if (searchTerm.trim() === '') {
      setFilteredParts(availableParts);
    } else {
      const filtered = availableParts.filter(part => 
        part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredParts(filtered);
    }
    setShowPartsDropdown(true);
  };

  // Add part to list
  const addPartToList = (part: { id: string; partNumber: string; description: string; unitType: 'qty' | 'hours' }) => {
    setParts([...parts, { description: part.description, qty: 1 }]);
    setPartsSearch('');
    setShowPartsDropdown(false);
    setHasUnsavedChanges(true);
  };

  // Update part quantity
  const updatePartQuantity = (index: number, newQty: number) => {
    if (newQty < 0) return;
    const updatedParts = [...parts];
    updatedParts[index].qty = newQty;
    setParts(updatedParts);
    setHasUnsavedChanges(true);
  };

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


  useEffect(() => {
    // Check for existing authentication
    const savedTechId = localStorage.getItem('technicianId');
    const savedTechName = localStorage.getItem('technicianName');
    if (savedTechId && savedTechName) {
      setTechnicianId(savedTechId);
      setTechnicianName(savedTechName);
      setIsAuthenticated(true);
    }

    // Load offline data
    loadOfflineData();

    // Load parts data
    fetchParts();
  }, []);

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      addNotification('Connection restored', 'success');
      syncPendingData();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      addNotification('Working offline - changes will sync when online', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic sync check when online
  useEffect(() => {
    if (isOnline && pendingSync.length > 0) {
      const interval = setInterval(() => {
        syncPendingData();
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isOnline, pendingSync.length]);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.notification-dropdown')) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  useEffect(() => {
    if (technicianId) {
      // Fetch jobs from SQLite backend
      const fetchTechnicianJobs = async () => {
        try {
          const apiUrl = getApiUrl();
          console.log('Fetching jobs from:', apiUrl);
          console.log('Technician ID:', technicianId);
          
          const response = await fetch(`${apiUrl}/api/jobs`);
          const allJobs = await response.json();
          
          console.log('All jobs from API:', allJobs);
          console.log('Current technician ID:', technicianId, 'Type:', typeof technicianId);
          
          // Debug: Log each job's technician_id and status
          allJobs.forEach((job: any, index: number) => {
            console.log(`Job ${index}: ID=${job.id}, technician_id=${job.technician_id} (${typeof job.technician_id}), status=${job.status}`);
          });
          
          // Filter jobs for this technician and only show pending, in progress, and completed
          const technicianJobs = allJobs.filter((job: any) => {
            const technicianMatch = (job.technician_id === parseInt(technicianId) || 
                                   job.technician_id === technicianId ||
                                   job.technician_id === technicianId.toString());
            const statusMatch = (job.status === 'pending' || 
                               job.status === 'in progress' || 
                               job.status === 'completed');
            
            console.log(`Job ${job.id}: technicianMatch=${technicianMatch}, statusMatch=${statusMatch}, willShow=${technicianMatch && statusMatch}`);
            
            return technicianMatch && statusMatch;
          });
          
          console.log('Filtered jobs for technician:', technicianJobs);
          
          // Check for new jobs
          const previousJobIds = jobs.map((job: Job) => job.id);
          const newJobs = technicianJobs.filter((job: any) => !previousJobIds.includes(job.id));
          if (newJobs.length > 0) {
            addNotification(`New job assigned: ${newJobs[0].title}`, 'info');
          }
          
          // Check for status changes
          jobs.forEach((oldJob: Job) => {
            const newJob = technicianJobs.find((job: any) => job.id === oldJob.id);
            if (newJob && newJob.status !== oldJob.status) {
              addNotification(`Job "${newJob.title}" status changed to ${getStatusText(newJob.status)}`, 'success');
            }
          });
          
          setJobs(technicianJobs);
          saveOfflineData();
        } catch (error) {
          console.error('Error fetching technician jobs:', error);
          console.error('API URL attempted:', getApiUrl());
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          addNotification(`Error loading jobs: ${errorMessage}`, 'error');
        }
      };

      fetchTechnicianJobs();
      
      // Set up polling for real-time updates
      const interval = setInterval(fetchTechnicianJobs, 30000); // Poll every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [technicianId]);

  // Filter and sort jobs
  useEffect(() => {
    let filtered = jobs;

    // Filter by status
    filtered = filtered.filter(job => job.status === statusFilter);

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.customer_name && job.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (job.customer_address && job.customer_address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (job.end_customer_name && job.end_customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (job.site_address && job.site_address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (job.equipment && job.equipment.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (job.fault_reported && job.fault_reported.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (job.order_number && job.order_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (job.snpid && job.snpid.toLowerCase().includes(searchTerm.toLowerCase())) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort jobs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        case 'customer':
          return a.customer_name.localeCompare(b.customer_name);
        default:
          return 0;
      }
    });

    setFilteredJobs(filtered);
  }, [jobs, searchTerm, statusFilter, sortBy]);

  const addNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    const notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only last 5 notifications
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const requestLocationPermission = async () => {
    if (!navigator.geolocation) {
      addNotification('Geolocation is not supported by this browser', 'error');
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
      setLocationPermission('granted');
      addNotification('Location access granted', 'success');
    } catch (error) {
      setLocationPermission('denied');
      addNotification('Location access denied', 'warning');
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };

  const getDistanceToJob = (jobAddress: string): string => {
    if (!currentLocation) return 'Location not available';
    
    // In a real app, you'd geocode the address to get coordinates
    // For demo purposes, we'll simulate with random coordinates
    const jobLat = 40.7128 + (Math.random() - 0.5) * 0.1;
    const jobLon = -74.0060 + (Math.random() - 0.5) * 0.1;
    
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      jobLat,
      jobLon
    );
    
    return `${distance.toFixed(1)} km away`;
  };

  const startTimesheet = (jobId: string, jobTitle: string) => {
    const startTime = new Date();
    setCurrentTimesheet({ jobId, startTime, breakTime: 0 });
    
    const newEntry = {
      id: Date.now().toString(),
      jobId,
      jobTitle,
      startTime,
      breakTime: 0,
      totalHours: 0,
      status: 'active' as const
    };
    
    setTimesheet(prev => [...prev, newEntry]);
    addNotification(`Started timesheet for ${jobTitle}`, 'info');
    saveOfflineData();
  };

  const endTimesheet = (jobId: string, notes?: string) => {
    const endTime = new Date();
    const entry = timesheet.find(t => t.jobId === jobId && t.status === 'active');
    
    if (entry) {
      const totalMinutes = (endTime.getTime() - entry.startTime.getTime()) / (1000 * 60);
      const workMinutes = totalMinutes - (currentTimesheet?.breakTime || 0);
      const totalHours = workMinutes / 60;
      
      setTimesheet(prev => prev.map(t => 
        t.id === entry.id 
          ? { ...t, endTime, totalHours, status: 'completed' as const, notes }
          : t
      ));
      
      setCurrentTimesheet(null);
      addNotification(`Timesheet completed: ${totalHours.toFixed(2)} hours`, 'success');
      saveOfflineData();
    }
  };

  const addBreakTime = (minutes: number) => {
    if (currentTimesheet) {
      setCurrentTimesheet(prev => prev ? { ...prev, breakTime: prev.breakTime + minutes } : null);
      addNotification(`Added ${minutes} minutes break time`, 'info');
      saveOfflineData();
    }
  };

  const handlePhotoUpload = async (jobId: string, file: File, caption: string, category: string) => {
    // Create local URL for immediate display
    const localUrl = URL.createObjectURL(file);
    const tempPhoto = { 
      url: localUrl, 
      caption, 
      timestamp: new Date(),
      category,
      isUploading: true
    };
    
    // Update local state immediately with local URL
    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { 
            ...job, 
            photos: [...(job.photos || []), tempPhoto]
          }
        : job
    ));
    
    if (selectedJob?.id === jobId) {
      setSelectedJob(prev => prev ? {
        ...prev,
        photos: [...(prev.photos || []), tempPhoto]
      } : null);
      setHasUnsavedChanges(true);
    }
    
    // Upload to Firebase in background without blocking UI
    (async () => {
      try {
        // Upload to Firebase in background
        const storageRef = ref(storage, `job-photos/${jobId}/${category}/${Date.now()}-${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const photoUrl = await getDownloadURL(snapshot.ref);
        
        await addJobPhoto(jobId, photoUrl, caption, category);
        
        // Update local state with Firebase URL
        setJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { 
                ...job, 
                photos: job.photos?.map(photo => 
                  photo.url === localUrl 
                    ? { ...photo, url: photoUrl, isUploading: false }
                    : photo
                ) || []
              }
            : job
        ));
        
        if (selectedJob?.id === jobId) {
          setSelectedJob(prev => {
            const updatedPhotos = prev?.photos?.map(photo => 
              photo.url === localUrl 
                ? { ...photo, url: photoUrl, isUploading: false }
                : photo
            ) || [];
            console.log('Updating selectedJob photos:', updatedPhotos);
            return prev ? {
              ...prev,
              photos: updatedPhotos
            } : null;
          });
        }
        
        addNotification(`${category} photo uploaded successfully!`, 'success');
        saveOfflineData();
      } catch (error) {
        console.error('Error uploading photo:', error);
        addNotification('Failed to upload photo', 'error');
        
        // Remove the failed photo from local state
        setJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { 
                ...job, 
                photos: job.photos?.filter(photo => photo.url !== localUrl) || []
              }
            : job
        ));
        
        if (selectedJob?.id === jobId) {
          setSelectedJob(prev => prev ? {
            ...prev,
            photos: prev.photos?.filter(photo => photo.url !== localUrl) || []
          } : null);
        }
      }
    })();
  };

  const getTotalHoursToday = () => {
    const today = new Date().toDateString();
    return timesheet
      .filter(t => t.startTime.toDateString() === today)
      .reduce((total, t) => total + t.totalHours, 0);
  };

  const loadOfflineData = () => {
    try {
      const savedJobs = localStorage.getItem('offline_jobs');
      const savedTimesheet = localStorage.getItem('offline_timesheet');
      const savedPendingSync = localStorage.getItem('pending_sync');
      const savedPhotoCategories = localStorage.getItem('offline_photo_categories');

      if (savedJobs) {
        const parsedJobs = JSON.parse(savedJobs);
        // Convert date strings back to Date objects
        const jobsWithDates = parsedJobs.map((job: any) => ({
          ...job,
          scheduled_date: job.scheduled_date ? new Date(job.scheduled_date) : null
        }));
        setJobs(jobsWithDates);
      }
      if (savedTimesheet) {
        const parsedTimesheet = JSON.parse(savedTimesheet);
        // Convert date strings back to Date objects
        const timesheetWithDates = parsedTimesheet.map((entry: any) => ({
          ...entry,
          startTime: new Date(entry.startTime),
          endTime: entry.endTime ? new Date(entry.endTime) : undefined
        }));
        setTimesheet(timesheetWithDates);
      }
      if (savedPendingSync) {
        const parsedPendingSync = JSON.parse(savedPendingSync);
        // Convert date strings back to Date objects
        const pendingSyncWithDates = parsedPendingSync.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setPendingSync(pendingSyncWithDates);
      }
      if (savedPhotoCategories) {
        const parsedPhotoCategories = JSON.parse(savedPhotoCategories);
        // Convert date strings back to Date objects
        const photoCategoriesWithDates = parsedPhotoCategories.map((category: any) => ({
          ...category,
          photos: category.photos.map((photo: any) => ({
            ...photo,
            timestamp: new Date(photo.timestamp)
          }))
        }));
        setPhotoCategories(photoCategoriesWithDates);
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const saveOfflineData = () => {
    try {
      localStorage.setItem('offline_jobs', JSON.stringify(jobs));
      localStorage.setItem('offline_timesheet', JSON.stringify(timesheet));
      localStorage.setItem('pending_sync', JSON.stringify(pendingSync));
      localStorage.setItem('offline_photo_categories', JSON.stringify(photoCategories));
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  };

  const addToPendingSync = (type: 'job_update' | 'photo_upload' | 'timesheet', data: any) => {
    const syncItem = {
      type,
      data,
      timestamp: new Date()
    };
    setPendingSync(prev => [...prev, syncItem]);
    addNotification('Action queued for sync', 'info');
  };

  const syncPendingData = async () => {
    if (!isOnline || pendingSync.length === 0) return;

    try {
      const syncPromises = pendingSync.map(async (item) => {
        switch (item.type) {
          case 'job_update':
            return fetch(`${getApiUrl()}/api/jobs/${item.data.jobId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.data.payload)
            });
          case 'photo_upload':
            // Handle photo upload sync - upload to Firebase Storage
            const { jobId, photoData, category } = item.data;
            const storageRef = ref(storage, `job-photos/${jobId}/${category}/${Date.now()}-${photoData.metadata.fileName}`);
            const response = await fetch(photoData.url);
            const blob = await response.blob();
            const snapshot = await uploadBytes(storageRef, blob);
            const photoUrl = await getDownloadURL(snapshot.ref);
            
            // Update photo data with new URL
            await addJobPhoto(jobId, photoUrl, photoData.caption);
            break;
          case 'timesheet':
            // Handle timesheet sync - could send to backend API
            console.log('Syncing timesheet data:', item.data);
            break;
        }
      });

      await Promise.all(syncPromises);
      setPendingSync([]);
      saveOfflineData();
      addNotification('All pending changes synced', 'success');
    } catch (error) {
      console.error('Error syncing data:', error);
      addNotification('Sync failed - will retry later', 'error');
    }
  };

  const handleLogin = (techId: string, techName: string) => {
    setTechnicianId(techId);
    setTechnicianName(techName);
    setIsAuthenticated(true);
    localStorage.setItem('technicianId', techId);
    localStorage.setItem('technicianName', techName);
  };

  const handleLogout = () => {
    setTechnicianId(null);
    setTechnicianName('');
    setIsAuthenticated(false);
    localStorage.removeItem('technicianId');
    localStorage.removeItem('technicianName');
    setJobs([]);
    setFilteredJobs([]);
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      const payload: any = { status: newStatus };
      if (notes) payload.actionTaken = notes;
      if (arrival) payload.arrivalTime = arrival;
      if (departure) payload.departureTime = departure;
      if (parts.length) payload.partsJson = JSON.stringify(parts);
      
      // Include photos in the payload
      const currentJob = jobs.find(job => job.id === jobId);
      if (currentJob?.photos && currentJob.photos.length > 0) {
        payload.photos = currentJob.photos;
      }

      if (isOnline) {
        const response = await fetch(`${getApiUrl()}/api/jobs/${jobId}`, { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        addNotification('Job status updated successfully!', 'success');
      } else {
        addToPendingSync('job_update', { jobId, payload });
        // Update local state immediately
        setJobs(prev => prev.map(job => 
          job.id === jobId ? { ...job, status: newStatus } : job
        ));
        addNotification('Job status updated (will sync when online)', 'info');
      }
      
      // Update selected job if it's the one being changed
      if (selectedJob?.id === jobId) {
        setSelectedJob(prev => prev ? { ...prev, status: newStatus } : null);
      }
      
      setNotes('');
      saveOfflineData();
    } catch (error) {
      console.error('Error updating job status:', error);
      addNotification('Error updating job status', 'error');
    }
  };

  const handleCompleteJob = async (jobId: string) => {
    if (completing) return; // Prevent multiple clicks
    
    setCompleting(true);
    
    try {
      // Prepare completion data
      const payload: any = { 
        status: 'completed',
        completed_date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      };
      
      if (notes) payload.actionTaken = notes;
      if (serviceType) payload.serviceType = serviceType;
      if (arrival) payload.arrivalTime = arrival;
      if (departure) payload.departureTime = departure;
      if (parts.length) payload.partsJson = JSON.stringify(parts);

      console.log('Completing job with payload:', payload);

      if (isOnline) {
        // Update job status
        const response = await fetch(`${getApiUrl()}/api/jobs/${jobId}`, { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        console.log('Job status updated successfully');
      } else {
        // Offline mode
        addToPendingSync('job_update', { jobId, payload });
        setJobs(prev => prev.map(job => 
          job.id === jobId ? { ...job, status: 'completed' } : job
        ));
        console.log('Job marked for sync when online');
      }
      
      // End timesheet
      try {
        await endTimesheet(jobId, notes);
        console.log('Timesheet ended successfully');
      } catch (timesheetError) {
        console.error('Error ending timesheet:', timesheetError);
        // Don't fail the whole operation for timesheet errors
      }
      
      // Update selected job
      if (selectedJob?.id === jobId) {
        setSelectedJob(prev => prev ? { ...prev, status: 'completed' } : null);
      }
      
      // Clear form data
      setNotes('');
      setServiceType('');
      setArrival('');
      setDeparture('');
      setParts([]);
      setHasUnsavedChanges(false);
      
      // Save offline data
      saveOfflineData();
      
      // Show success notification
      addNotification('Job completed successfully!', 'success');
      
      console.log('Job completion process finished');
      
    } catch (error) {
      console.error('Error completing job:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addNotification(`Error completing job: ${errorMessage}`, 'error');
    } finally {
      setCompleting(false);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <TechnicianLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="bg-dark-blue rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
        <h1 className="text-2xl font-bold text-center">SNP Electrical</h1>
        <p className="text-center text-gray-300">Technician Mobile</p>
          </div>
          <div className="text-right flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-300 hover:text-white transition-colors"
              >
                🔔
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="notification-dropdown absolute right-0 top-full mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-white font-medium">Notifications</h3>
                    <button
                      onClick={clearNotifications}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div key={notification.id} className="p-3 border-b border-gray-700 last:border-b-0">
                          <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              notification.type === 'info' ? 'bg-blue-500' :
                              notification.type === 'success' ? 'bg-green-500' :
                              notification.type === 'warning' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} />
                            <div className="flex-1">
                              <p className="text-white text-sm">{notification.message}</p>
                              <p className="text-gray-400 text-xs">
                                {notification.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-400 text-sm">
                        No notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Location Status */}
              <div className="text-right">
                {locationPermission === 'granted' && currentLocation ? (
                  <div className="text-xs text-green-400">
                    📍 Location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                  </div>
                ) : locationPermission === 'denied' ? (
                  <div className="text-xs text-red-400">📍 Location denied</div>
                ) : (
                  <button
                    onClick={requestLocationPermission}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    📍 Enable Location
                  </button>
                )}
              </div>
              
              <div>
                <p className="text-sm text-gray-300">Welcome, {technicianName}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-green-400">
                    ⏱️ Today: {getTotalHoursToday().toFixed(1)}h
                  </span>
                  {currentTimesheet && (
                    <span className="text-blue-400">
                      🔄 Active: {Math.floor((Date.now() - currentTimesheet.startTime.getTime()) / (1000 * 60 * 60))}h
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className={`${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                      {isOnline ? '🟢 Online' : '🔴 Offline'}
                    </span>
                    {pendingSync.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">
                          ⏳ {pendingSync.length} pending
                        </span>
                        {isOnline && (
                          <button
                            onClick={syncPendingData}
                            className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded"
                          >
                            Sync
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-white underline"
                  >
                    Logout
                  </button>
                  <button
                    onClick={() => setShowDebugPanel(!showDebugPanel)}
                    className="text-xs text-gray-500 hover:text-gray-300"
                    title="Debug Panel"
                  >
                    🔧
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-yellow-600">
          <h3 className="text-yellow-400 font-semibold mb-3">🔧 Debug Panel</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="text-white font-medium mb-2">Connection Status</h4>
              <p className="text-gray-300">Online: {isOnline ? '✅' : '❌'}</p>
              <p className="text-gray-300">Pending Sync: {pendingSync.length}</p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Data Status</h4>
              <p className="text-gray-300">Jobs: {jobs.length}</p>
              <p className="text-gray-300">Timesheet Entries: {timesheet.length}</p>
              <p className="text-gray-300">Photo Categories: {photoCategories.length}</p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Actions</h4>
              <button
                onClick={() => {
                  console.log('Current state:', { jobs, timesheet, pendingSync, photoCategories });
                  addNotification('State logged to console', 'info');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs mr-2"
              >
                Log State
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  addNotification('Local storage cleared', 'warning');
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
              >
                Clear Storage
              </button>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Pending Sync Items</h4>
              {pendingSync.length > 0 ? (
                <div className="space-y-1">
                  {pendingSync.map((item, index) => (
                    <div key={index} className="text-xs text-gray-300">
                      {item.type}: {item.timestamp.toLocaleTimeString()}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-xs">No pending items</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'jobs' 
              ? 'bg-darker-blue text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📋 Jobs
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'performance' 
              ? 'bg-darker-blue text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📊 Performance
        </button>
      </div>

      {/* Performance View */}
      {activeTab === 'performance' && (
        <TechnicianPerformance 
          technicianId={technicianId || ''}
          timesheet={timesheet}
          jobs={jobs}
        />
      )}

      {/* Jobs View */}
      {activeTab === 'jobs' && currentView === 'list' && (
        <>
          {/* Search and Filter Controls */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div>
            <input
              type="text"
              placeholder="Search jobs by title, customer, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Filter and Sort Controls */}
          <div className="flex flex-wrap gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="date">Sort by Date</option>
              <option value="status">Sort by Status</option>
              <option value="customer">Sort by Customer</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-400">
            Showing {filteredJobs.length} of {jobs.length} jobs
          </div>
        </div>
      </div>

      {/* Job List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Your Jobs ({filteredJobs.length})</h2>
        
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <div 
              key={job.id} 
              className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedJob(job);
                setCurrentView('detail');
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-white">
                      {job.order_number ? `Order #${job.order_number}` : job.title}
                    </h3>
                    {job.scheduled_date && (
                      <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                        {new Date(job.scheduled_date).toLocaleDateString()}
                      </span>
                  )}
                </div>
                  {job.order_number && job.title !== job.order_number && (
                    <p className="text-gray-500 text-sm">Service: {job.title}</p>
                  )}
                  {job.snpid && (
                    <p className="text-gray-500 text-sm">SNP ID: {job.snpid}</p>
                  )}
                  <p className="text-gray-400 text-sm font-medium">{job.end_customer_name || job.customer_name}</p>
                  <p className="text-gray-400 text-sm">📍 {job.site_address || job.customer_address}</p>
                  {currentLocation && job.site_address && (
                    <p className="text-blue-400 text-xs">📍 {getDistanceToJob(job.site_address)}</p>
                  )}
                  {job.equipment && (
                    <p className="text-gray-400 text-sm">🔧 Equipment: {job.equipment}</p>
                  )}
                  {job.fault_reported && (
                    <p className="text-gray-400 text-sm">⚠️ Fault: {job.fault_reported}</p>
                  )}
                  {job.site_phone && (
                    <p className="text-gray-400 text-sm">📞 {job.site_phone}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(job.status)}`}>
                  {getStatusText(job.status)}
                </span>
                  {job.photos && job.photos.length > 0 && (
                    <span className="text-xs text-blue-400">📷 {job.photos.length} photos</span>
                  )}
                </div>
              </div>

              {job.description && (
                <p className="text-gray-300 text-sm mb-3">{job.description}</p>
              )}

              {/* Job Photos */}
              {job.photos && job.photos.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Photos:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {job.photos.map((photo, index) => (
                      <div key={index} className="relative">
                      <img
                        src={photo.url}
                        alt={photo.caption}
                        className="w-full h-24 object-cover rounded"
                      />
                        {photo.isUploading && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="mb-3 flex gap-2 flex-wrap">
                {job.customer_phone && (
                  <a
                    href={`tel:${job.customer_phone}`}
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm transition-colors"
                  >
                    📞 Call Customer
                  </a>
                )}
                {currentLocation && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.customer_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm transition-colors"
                  >
                    🗺️ Navigate
                  </a>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col space-y-2">
                {job.status === 'pending' && (
                  <div className="space-y-2">
                  <button
                      onClick={() => {
                        handleStatusChange(job.id, 'in_progress');
                        startTimesheet(job.id, job.title);
                      }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
                  >
                      Start Job & Timesheet
                  </button>
                  </div>
                )}

                {job.status === 'in_progress' && (
                  <>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input type="time" value={arrival} onChange={(e)=>setArrival(e.target.value)} className="bg-gray-700 text-white px-3 py-2 rounded-md" placeholder="Arrival" />
                      <input type="time" value={departure} onChange={(e)=>setDeparture(e.target.value)} className="bg-gray-700 text-white px-3 py-2 rounded-md" placeholder="Departure" />
                    </div>
                    <div className="space-y-2">
                    <button
                      onClick={() => {
                          handleStatusChange(job.id, 'completed');
                          endTimesheet(job.id, notes);
                      }}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors"
                    >
                        Complete Job & Timesheet
                    </button>
                      
                      {/* Break Time Controls */}
                      {currentTimesheet && currentTimesheet.jobId === job.id && (
                        <div className="flex gap-2">
                    <button
                            onClick={() => addBreakTime(15)}
                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-2 rounded text-sm"
                    >
                            +15min Break
                    </button>
                          <button
                            onClick={() => addBreakTime(30)}
                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-2 rounded text-sm"
                          >
                            +30min Break
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {job.status === 'completed' && (
                  <div className="bg-green-900 bg-opacity-30 border border-green-500 rounded-lg p-3">
                    <div className="text-green-400 text-center py-1 mb-2">
                    ✅ Job Completed
                    </div>
                    
                    {/* Action Taken */}
                    {(job as any).action_taken && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-400 font-medium">Action Taken:</div>
                        <div className="text-sm text-white">{(job as any).action_taken}</div>
                  </div>
                )}
                    
                    {/* Parts/Labour */}
                    {(job as any).parts_json && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-400 font-medium">Parts/Labour:</div>
                        <div className="text-sm text-white">
                          {JSON.parse((job as any).parts_json).map((part: any, idx: number) => (
                            <div key={idx} className="text-xs">
                              {part.description} (Qty: {part.qty})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Completion Date */}
                    {(job as any).completed_date && (
                      <div className="text-xs text-gray-400">
                        Completed: {(job as any).completed_date}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">No jobs assigned</p>
          </div>
        )}
      </div>
        </>
      )}

      {/* Job Detail Screen */}
      {currentView === 'detail' && selectedJob && (
        <div className="min-h-screen bg-gray-900">
          {/* Header */}
          <div className="bg-gray-800 p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentView('list')}
                className="flex items-center text-white hover:text-gray-300"
              >
                <span className="mr-2">←</span>
                Back to Jobs
              </button>
              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(selectedJob.status)}`}>
                {getStatusText(selectedJob.status)}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white mt-2">
              {selectedJob.order_number ? `Order #${selectedJob.order_number}` : selectedJob.title}
            </h1>
            {selectedJob.order_number && selectedJob.title !== selectedJob.order_number && (
              <p className="text-gray-400 text-sm">Service: {selectedJob.title}</p>
            )}
          </div>

          {/* Job Information */}
          <div className="p-4 space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Job Details</h3>
              <div className="space-y-2">
                <p className="text-gray-300">
                  <span className="text-gray-400">Customer:</span> {selectedJob.end_customer_name || selectedJob.customer_name}
                </p>
                <p className="text-gray-300">
                  <span className="text-gray-400">Site:</span> {selectedJob.site_address || selectedJob.customer_address}
                </p>
                {selectedJob.equipment && (
                  <p className="text-gray-300">
                    <span className="text-gray-400">Equipment:</span> {selectedJob.equipment}
                  </p>
                )}
                {selectedJob.fault_reported && (
                  <p className="text-gray-300">
                    <span className="text-gray-400">Fault:</span> {selectedJob.fault_reported}
                  </p>
                )}
                {selectedJob.site_phone && (
                  <p className="text-gray-300">
                    <span className="text-gray-400">Phone:</span> {selectedJob.site_phone}
                  </p>
                )}
                {currentLocation && selectedJob.site_address && (
                  <p className="text-blue-400 text-sm">
                    📍 {getDistanceToJob(selectedJob.site_address)}
                  </p>
                )}
              </div>
            </div>

              {/* Start Job Button */}
              {selectedJob.status === 'pending' && (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      handleStatusChange(selectedJob.id, 'in_progress');
                      startTimesheet(selectedJob.id, selectedJob.title);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-medium"
                  >
                    🚀 Start Job & Timesheet
                  </button>
                </div>
              )}

            {/* Service Type Section */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Service Type</h3>
                {selectedJob?.status === 'completed' && (selectedJob as any).service_type && (
                  <span className="text-xs text-green-400 bg-green-900 bg-opacity-30 px-2 py-1 rounded">
                    Pre-filled from completion
                  </span>
                )}
              </div>
              <select
                value={serviceType}
                onChange={(e) => {
                  setServiceType(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
              >
                <option value="">Select Service Type</option>
                <option value="Vandalism">Vandalism</option>
                <option value="Repairs/Maintenance">Repairs/Maintenance</option>
              </select>
            </div>

            {/* Action Taken Section */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Action Taken</h3>
                {selectedJob?.status === 'completed' && (selectedJob as any).action_taken && (
                  <span className="text-xs text-green-400 bg-green-900 bg-opacity-30 px-2 py-1 rounded">
                    Pre-filled from completion
                  </span>
                )}
              </div>
                <textarea
                  value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                rows={4}
                placeholder="Describe what work was performed..."
                />
              </div>

            {/* Parts/Labour Section */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Parts/Labour</h3>
                {selectedJob?.status === 'completed' && (selectedJob as any).parts_json && (
                  <span className="text-xs text-green-400 bg-green-900 bg-opacity-30 px-2 py-1 rounded">
                    Pre-filled from completion
                  </span>
                )}
              </div>
              
              {/* Parts Search */}
              <div className="mb-4 relative parts-search-container">
                <input
                  type="text"
                  value={partsSearch}
                  onChange={(e) => handlePartsSearch(e.target.value)}
                  onFocus={() => setShowPartsDropdown(true)}
                  placeholder="Search parts by number or description..."
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                />
                
                {/* Parts Dropdown */}
                {showPartsDropdown && filteredParts.length > 0 && (
                  <div className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto">
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
                  onClick={()=>setParts([...parts,{description:'',qty:1}])} 
                  className="bg-darker-blue hover:bg-blue-700 text-white px-3 py-2 rounded-md"
                >
                  Add Custom Line
                </button>
                {parts.length > 0 && (
                  <button 
                    onClick={()=>setParts([])} 
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Photos Section */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Photos</h3>
              
              <div className="space-y-4">
              <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">📸 Before Photo (Optional)</label>
                  <PhotoUploadForm 
                    jobId={selectedJob.id}
                    onUpload={(jobId, file, caption) => 
                      handlePhotoUpload(jobId, file, caption, 'Before')
                    }
                    uploading={false}
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">📸 After Photo (Optional)</label>
                  <PhotoUploadForm 
                    jobId={selectedJob.id}
                    onUpload={(jobId, file, caption) => 
                      handlePhotoUpload(jobId, file, caption, 'After')
                    }
                    uploading={false}
                />
              </div>
              </div>
            </div>

            {/* Timesheet Summary */}
            {currentTimesheet && currentTimesheet.jobId === selectedJob.id && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Current Timesheet</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">
                    Started: {currentTimesheet.startTime.toLocaleTimeString()}
                  </p>
                  <p className="text-gray-300">
                    Total Time: {getTotalHoursToday().toFixed(1)} hours
                  </p>
                  {currentTimesheet.breakTime > 0 && (
                    <p className="text-gray-300">
                      Break Time: {currentTimesheet.breakTime.toFixed(1)} hours
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                <button
                    onClick={() => addBreakTime(15)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-3 rounded text-sm"
                  >
                    Add Break
                  </button>
                  <button
                    onClick={() => endTimesheet(selectedJob.id, notes)}
                    className="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm"
                  >
                    End Timesheet
                  </button>
                </div>
              </div>
            )}

            {/* Photos */}
            {selectedJob.photos && selectedJob.photos.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Photos ({selectedJob.photos.length})</h3>
                
                {/* Before Photos */}
                {selectedJob.photos.filter(photo => photo.category === 'Before').length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">📸 Before Photos</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedJob.photos.filter(photo => photo.category === 'Before').map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={photo.url}
                            alt={photo.caption || 'Before photo'}
                            className="w-full h-24 object-cover rounded"
                          />
                          {photo.isUploading && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            </div>
                          )}
                          {photo.caption && (
                            <p className="text-xs text-gray-400 mt-1">{photo.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* After Photos */}
                {selectedJob.photos.filter(photo => photo.category === 'After').length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">📸 After Photos</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedJob.photos.filter(photo => photo.category === 'After').map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={photo.url}
                            alt={photo.caption || 'After photo'}
                            className="w-full h-24 object-cover rounded"
                          />
                          {photo.isUploading && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            </div>
                          )}
                          {photo.caption && (
                            <p className="text-xs text-gray-400 mt-1">{photo.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Other Photos (without category) */}
                {selectedJob.photos.filter(photo => !photo.category).length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">📸 Other Photos</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedJob.photos.filter(photo => !photo.category).map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={photo.url}
                            alt={photo.caption || 'Job photo'}
                            className="w-full h-24 object-cover rounded"
                          />
                          {photo.isUploading && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            </div>
                          )}
                          {photo.caption && (
                            <p className="text-xs text-gray-400 mt-1">{photo.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Completion Summary for Completed Jobs */}
            {selectedJob.status === 'completed' && (
              <div className="bg-green-900 bg-opacity-30 border border-green-500 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-400 mb-3">✅ Job Completion Summary</h3>
                
                {/* Action Taken */}
                {(selectedJob as any).action_taken && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-400 font-medium mb-1">Action Taken:</div>
                    <div className="text-white bg-gray-800 p-2 rounded">{(selectedJob as any).action_taken}</div>
                  </div>
                )}
                
                {/* Parts/Labour */}
                {(selectedJob as any).parts_json && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-400 font-medium mb-1">Parts/Labour Used:</div>
                    <div className="bg-gray-800 p-2 rounded">
                      {JSON.parse((selectedJob as any).parts_json).map((part: any, idx: number) => (
                        <div key={idx} className="text-white text-sm">
                          • {part.description} (Qty: {part.qty})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Completion Date */}
                {(selectedJob as any).completed_date && (
                  <div className="text-sm text-gray-400">
                    <strong>Completed:</strong> {(selectedJob as any).completed_date}
                  </div>
                )}
              </div>
            )}

            {/* Update Job Button for Completed Jobs */}
            {selectedJob.status === 'completed' && (
              <div className="bg-gray-800 rounded-lg p-4">
                <button
                  onClick={async () => {
                    setIsUpdating(true);
                    try {
                      await handleStatusChange(selectedJob.id, 'completed');
                      setHasUnsavedChanges(false);
                      setCurrentView('list'); // Return to job list
                      // Refresh jobs to show updated data
                      const apiUrl = getApiUrl();
                      const response = await fetch(`${apiUrl}/api/jobs`);
                      const allJobs = await response.json();
                      const technicianJobs = allJobs.filter((job: any) => 
                        (job.technician_id === parseInt(technicianId || '0')) &&
                        (job.status === 'pending' || 
                         job.status === 'in progress' || 
                         job.status === 'completed')
                      );
                      setJobs(technicianJobs);
                      addNotification('Job updated successfully!', 'success');
                    } catch (error) {
                      addNotification('Failed to update job', 'error');
                    } finally {
                      setIsUpdating(false);
                    }
                  }}
                  className={`w-full py-3 px-4 rounded-lg transition-colors font-medium ${
                    hasUnsavedChanges && !isUpdating
                      ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!hasUnsavedChanges || isUpdating}
                >
                  {isUpdating ? '⏳ Updating...' : hasUnsavedChanges ? '🔄 Update Job Changes' : '✅ No Changes to Save'}
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  {hasUnsavedChanges 
                    ? 'Save your amendments to this completed job' 
                    : 'Make changes to enable update button'
                  }
                </p>
              </div>
            )}

            {/* Complete Job Button - Bottom */}
            {selectedJob.status === 'in_progress' && (
              <div className="bg-gray-800 rounded-lg p-4">
                <button
                  onClick={() => handleCompleteJob(selectedJob.id)}
                  disabled={completing}
                  className={`w-full py-3 px-4 rounded-lg transition-colors font-medium ${
                    completing 
                      ? 'bg-gray-500 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  {completing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Completing...
                    </div>
                  ) : (
                    '✅ Complete Job'
                  )}
                </button>
                {completing && (
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Please wait while we save your completion data...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default TechnicianMobile;
