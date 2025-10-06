import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { getJobs as getJobsFromFirebase, createJob as createJobInFirebase, updateJob as updateJobInFirebase, deleteJob as deleteJobInFirebase } from '../services/firebaseService';

// Simple date formatter
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

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  technician_id: string;
  customer_id: string;
  created_at: any;
  updated_at: any;
  actionTaken?: string;
  serviceType?: string;
  partsJson?: string;
  arrivalTime?: string;
  departureTime?: string;
  technician_name?: string;
}

const JobsNew: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    technician_id: '',
    customer_id: '',
    actionTaken: '',
    serviceType: '',
    partsJson: '',
    arrivalTime: '',
    departureTime: '',
    technician_name: ''
  });

  // Parts management
  const [parts, setParts] = useState<Array<{ description: string; qty: number }>>([]);

  // Load jobs on component mount
  useEffect(() => {
    fetchJobs();
  }, []);

  // Simple fetch jobs function - just like Visnu
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await getJobsFromFirebase();
      const normalized = (Array.isArray(data) ? data : []).map((j: any) => ({
        ...j,
        status: j.status || 'pending'
      }));
      const visible = normalized.filter((j: any) => j.deleted !== true);
      setJobs(visible as any);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // Simple handle edit - just like Visnu
  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      title: job.title || '',
      description: job.description || '',
      technician_id: job.technician_id || '',
      customer_id: job.customer_id || '',
      actionTaken: job.actionTaken || '',
      serviceType: job.serviceType || '',
      partsJson: job.partsJson || '',
      arrivalTime: job.arrivalTime || '',
      departureTime: job.departureTime || '',
      technician_name: job.technician_name || ''
    });

    // Load parts
    try {
      let existingParts = [];
      if (job.partsJson) {
        existingParts = JSON.parse(job.partsJson);
      }
      setParts(existingParts);
    } catch (error) {
      setParts([]);
    }

    setShowModal(true);
  };

  // Simple handle submit - just like Visnu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        partsJson: JSON.stringify(parts),
        // Append standard sentence to action taken
        actionTaken: formData.actionTaken ? 
          `${formData.actionTaken}\n\nTested all safety devices prior to returning equipment to service.` :
          'Tested all safety devices prior to returning equipment to service.'
      };

      if (editingJob) {
        await updateJobInFirebase(editingJob.id, payload);
      } else {
        await createJobInFirebase(payload);
      }

      // Simple refresh - just like Visnu
      await fetchJobs();
      
      setShowModal(false);
      setEditingJob(null);
      setParts([]);
      setFormData({
        title: '',
        description: '',
        technician_id: '',
        customer_id: '',
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

  // Simple status change - just like Visnu
  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      
      if (newStatus !== 'completed') {
        updates.completed_date = null;
      }
      
      if (newStatus === 'completed') {
        updates.completed_date = new Date().toISOString();
      }
      
      await updateJobInFirebase(jobId, updates);
      
      // Simple refresh - just like Visnu
      await fetchJobs();
    } catch (error) {
      console.error('Error updating job status:', error);
      alert('Failed to update job status: ' + (error as Error).message);
    }
  };

  // Add part function
  const addPart = () => {
    setParts([...parts, { description: '', qty: 1 }]);
  };

  // Remove part function
  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  // Update part function
  const updatePart = (index: number, field: string, value: any) => {
    const newParts = [...parts];
    newParts[index] = { ...newParts[index], [field]: value };
    setParts(newParts);
  };

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true;
    return job.status === filter;
  });

  if (loading) {
    return <div className="p-8 text-center text-white">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">My Work Orders</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingJob(null);
              setFormData({
                title: '',
                description: '',
                technician_id: '',
                customer_id: '',
                actionTaken: '',
                serviceType: '',
                partsJson: '',
                arrivalTime: '',
                departureTime: '',
                technician_name: ''
              });
              setParts([]);
              setShowModal(true);
            }}
            className="btn-primary"
          >
            ➕ Add New Job
          </button>
          {loading && <span className="text-gray-400 text-sm">Loading…</span>}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex space-x-2">
        {['pending', 'in_progress', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              filter === status 
                ? 'bg-snp-secondary text-white shadow-snp' 
                : 'text-snp-light hover:bg-snp-gray hover:text-white hover:shadow-snp'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Jobs table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-snp-secondary">
          <h2 className="text-xl font-semibold text-white">All Jobs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-snp-secondary">
            <thead className="bg-snp-gray">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-snp-light uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-snp-light uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-snp-light uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-snp-light uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-snp-gray divide-y divide-snp-secondary">
            {filteredJobs.map((job) => (
              <tr key={job.id} className="hover:bg-snp-dark transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                  {job.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                    job.status === 'completed' ? 'bg-green-900 text-green-300' :
                    job.status === 'in_progress' ? 'bg-yellow-900 text-yellow-300' :
                    'bg-red-900 text-red-300'
                  }`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {formatDate(job.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(job)}
                    className="bg-snp-secondary hover:bg-snp-accent text-white px-3 py-1 rounded-md text-sm transition-all duration-200"
                  >
                    ✏️ Edit
                  </button>
                  {job.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange(job.id, 'completed')}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm transition-all duration-200"
                    >
                      ✅ Complete
                    </button>
                  )}
                  {job.status === 'completed' && (
                    <button
                      onClick={() => handleStatusChange(job.id, 'pending')}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-sm transition-all duration-200"
                    >
                      🔄 Reopen
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-snp-gray rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-snp-lg">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingJob ? 'Edit Job' : 'Add New Job'}
            </h2>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-snp-light mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="input-field"
                  required
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-snp-light mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="input-field"
                  rows={3}
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-snp-light mb-2">Action Taken</label>
                <textarea
                  value={formData.actionTaken}
                  onChange={(e) => setFormData({...formData, actionTaken: e.target.value})}
                  className="input-field"
                  rows={3}
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-snp-light mb-2">Service Type</label>
                <input
                  type="text"
                  value={formData.serviceType}
                  onChange={(e) => setFormData({...formData, serviceType: e.target.value})}
                  className="input-field"
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-snp-light mb-2">Parts Used</label>
                {parts.map((part, index) => (
                  <div key={index} className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      placeholder="Part description"
                      value={part.description}
                      onChange={(e) => updatePart(index, 'description', e.target.value)}
                      className="flex-1 input-field"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={part.qty}
                      onChange={(e) => updatePart(index, 'qty', parseInt(e.target.value) || 0)}
                      className="w-20 input-field"
                    />
                    <button
                      type="button"
                      onClick={() => removePart(index)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md transition-all duration-200"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPart}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-all duration-200"
                >
                  ➕ Add Part
                </button>
              </div>

              <div className="md:col-span-6 flex justify-end gap-3">
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {editingJob ? '💾 Update Job' : '➕ Create Job'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsNew;
