import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';

// Job Management
// Transaction-safe sequential Service Report Number generator
async function getNextServiceReportNumber(): Promise<number> {
  const counterRef = doc(db, 'meta', 'serviceReport');
  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    if (!snap.exists()) {
      // Initialize at 1 if absent; you can change this doc's `next` later to start from any number
      tx.set(counterRef, { next: 2 });
      return 1;
    }
    const current = (snap.data() as any).next ?? 1;
    tx.update(counterRef, { next: current + 1 });
    return current;
  });
  return next;
}

export const createJob = async (jobData: any) => {
  // Allocate a sequential Service Report Number (snpid)
  const snpid = await getNextServiceReportNumber();
  const docRef = await addDoc(collection(db, 'jobs'), {
    ...jobData,
    snpid,
    status: jobData.status || 'pending',
    created_at: Timestamp.now(),
    updated_at: Timestamp.now()
  });
  return docRef.id;
};

export const updateJob = async (jobId: string, updates: any) => {
  const jobRef = doc(db, 'jobs', jobId);
  
  // Convert date strings to Firestore Timestamps if needed
  const processedUpdates = { ...updates };
  if (processedUpdates.completed_date && typeof processedUpdates.completed_date === 'string') {
    processedUpdates.completed_date = Timestamp.fromDate(new Date(processedUpdates.completed_date));
  } else if (processedUpdates.completed_date === null || processedUpdates.completed_date === '') {
    processedUpdates.completed_date = null;
  }
  if (processedUpdates.scheduled_date && typeof processedUpdates.scheduled_date === 'string') {
    processedUpdates.scheduled_date = Timestamp.fromDate(new Date(processedUpdates.scheduled_date));
  }
  
  await updateDoc(jobRef, {
    ...processedUpdates,
    updated_at: Timestamp.now()
  });
};

export const deleteJob = async (jobId: string) => {
  await deleteDoc(doc(db, 'jobs', jobId));
};

export const getJobs = async () => {
  const jobsSnapshot = await getDocs(collection(db, 'jobs'));
  return jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getJob = async (jobId: string): Promise<any | null> => {
  const jobDoc = await getDoc(doc(db, 'jobs', jobId));
  return jobDoc.exists() ? { id: jobDoc.id, ...jobDoc.data() } : null;
};

export const getJobsByTechnician = async (technicianId: string) => {
  const q = query(
    collection(db, 'jobs'),
    where('technician_id', '==', technicianId),
    orderBy('created_at', 'desc')
  );
  const jobsSnapshot = await getDocs(q);
  return jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getJobsByStatus = async (status: string) => {
  const q = query(
    collection(db, 'jobs'),
    where('status', '==', status),
    orderBy('created_at', 'desc')
  );
  const jobsSnapshot = await getDocs(q);
  return jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Real-time job updates
export const subscribeToJobs = (callback: (jobs: any[]) => void) => {
  const q = query(collection(db, 'jobs'), orderBy('created_at', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(jobs);
  });
};

export const subscribeToTechnicianJobs = (technicianId: string, callback: (jobs: any[]) => void) => {
  const q = query(
    collection(db, 'jobs'),
    where('technician_id', '==', technicianId)
  );
  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => {
        const aTime = a.created_at?.toMillis?.() || new Date(a.created_at || 0).getTime() || 0;
        const bTime = b.created_at?.toMillis?.() || new Date(b.created_at || 0).getTime() || 0;
        return bTime - aTime;
      });
    callback(jobs);
  });
};

// Customer Management
export const createCustomer = async (customerData: any) => {
  const docRef = await addDoc(collection(db, 'customers'), {
    ...customerData,
    created_at: Timestamp.now()
  });
  return docRef.id;
};

export const getCustomers = async () => {
  const customersSnapshot = await getDocs(collection(db, 'customers'));
  return customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateCustomer = async (customerId: string, updates: any) => {
  const customerRef = doc(db, 'customers', customerId);
  await updateDoc(customerRef, updates);
};

export const deleteCustomer = async (customerId: string) => {
  await deleteDoc(doc(db, 'customers', customerId));
};

// Technician Management
export const createTechnician = async (technicianData: any) => {
  const docRef = await addDoc(collection(db, 'technicians'), {
    ...technicianData,
    created_at: Timestamp.now()
  });
  return docRef.id;
};

export const getTechnicians = async () => {
  const techniciansSnapshot = await getDocs(collection(db, 'technicians'));
  return techniciansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateTechnician = async (technicianId: string, updates: any) => {
  const technicianRef = doc(db, 'technicians', technicianId);
  await updateDoc(technicianRef, updates);
};

export const deleteTechnician = async (technicianId: string) => {
  await deleteDoc(doc(db, 'technicians', technicianId));
};

// Fetch a single technician by Firestore document ID
export const getTechnicianById = async (technicianId: string): Promise<any | null> => {
  const techDoc = await getDoc(doc(db, 'technicians', technicianId));
  return techDoc.exists() ? { id: techDoc.id, ...techDoc.data() } : null;
};

// Clients / End-Customers / Sites
export const createClient = async (client: any) => {
  const ref = await addDoc(collection(db, 'clients'), {
    ...client,
    created_at: Timestamp.now()
  });
  return ref.id;
};

export const getClients = async () => {
  const snapshot = await getDocs(collection(db, 'clients'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateClient = async (clientId: string, updates: any) => {
  await updateDoc(doc(db, 'clients', clientId), updates);
};

export const deleteClient = async (clientId: string) => {
  await deleteDoc(doc(db, 'clients', clientId));
};

export const createEndCustomer = async (clientId: string, customer: any) => {
  const ref = await addDoc(collection(db, `clients/${clientId}/customers`), {
    ...customer,
    created_at: Timestamp.now()
  });
  return ref.id;
};

export const getEndCustomers = async (clientId: string) => {
  const snapshot = await getDocs(collection(db, `clients/${clientId}/customers`));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createSite = async (clientId: string, customerId: string, site: any) => {
  const ref = await addDoc(collection(db, `clients/${clientId}/customers/${customerId}/sites`), {
    ...site,
    created_at: Timestamp.now()
  });
  return ref.id;
};

export const getSites = async (clientId: string, customerId: string) => {
  const snapshot = await getDocs(collection(db, `clients/${clientId}/customers/${customerId}/sites`));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateSite = async (clientId: string, customerId: string, siteId: string, siteData: any) => {
  const siteRef = doc(db, `clients/${clientId}/customers/${customerId}/sites`, siteId);
  await updateDoc(siteRef, siteData);
};

export const deleteSite = async (clientId: string, customerId: string, siteId: string) => {
  const siteRef = doc(db, `clients/${clientId}/customers/${customerId}/sites`, siteId);
  await deleteDoc(siteRef);
};


// Mobile-specific functions
export const updateJobStatus = async (jobId: string, status: string, technicianNotes?: string) => {
  const updates: any = { status };
  
  if (status === 'completed') {
    updates.completed_date = Timestamp.now();
  }
  
  if (technicianNotes) {
    updates.technician_notes = technicianNotes;
  }
  
  await updateJob(jobId, updates);
};

export const addJobPhoto = async (jobId: string, photoUrl: string, caption?: string, category?: string) => {
  const jobRef = doc(db, 'jobs', jobId);
  const job: any = await getJob(jobId);
  const photos = (job && Array.isArray(job.photos)) ? job.photos : [];
  
  photos.push({
    url: photoUrl,
    caption: caption || '',
    category: category || '',
    timestamp: Timestamp.now()
  });
  
  await updateDoc(jobRef, { photos });
};
