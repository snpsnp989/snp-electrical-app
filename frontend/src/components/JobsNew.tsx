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
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">My Work Orders</h1>
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
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add New Job
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex space-x-4">
        {['pending', 'in_progress', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded ${
              filter === status 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Jobs table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredJobs.map((job) => (
              <tr key={job.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {job.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    job.status === 'completed' ? 'bg-green-100 text-green-800' :
                    job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(job.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(job)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  {job.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange(job.id, 'completed')}
                      className="text-green-600 hover:text-green-900"
                    >
                      Complete
                    </button>
                  )}
                  {job.status === 'completed' && (
                    <button
                      onClick={() => handleStatusChange(job.id, 'pending')}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      Reopen
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingJob ? 'Edit Job' : 'Add New Job'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Action Taken</label>
                <textarea
                  value={formData.actionTaken}
                  onChange={(e) => setFormData({...formData, actionTaken: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Service Type</label>
                <input
                  type="text"
                  value={formData.serviceType}
                  onChange={(e) => setFormData({...formData, serviceType: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Parts Used</label>
                {parts.map((part, index) => (
                  <div key={index} className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      placeholder="Part description"
                      value={part.description}
                      onChange={(e) => updatePart(index, 'description', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={part.qty}
                      onChange={(e) => updatePart(index, 'qty', parseInt(e.target.value) || 0)}
                      className="w-20 border border-gray-300 rounded-md px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => removePart(index)}
                      className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPart}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Add Part
                </button>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  {editingJob ? 'Update Job' : 'Create Job'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
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
