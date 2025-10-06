import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config/api';
import { getTechnicians as getTechniciansFromFirebase, createTechnician as createTechnicianInFirebase, updateTechnician as updateTechnicianInFirebase, deleteTechnician as deleteTechnicianInFirebase } from '../services/firebaseService';

interface Technician {
  id: any;
  name: string;
  email: string;
  phone?: string;
  specializations?: string;
  role?: string;
  password?: string;
  created_at?: string;
}

const Technicians: React.FC = () => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specializations: '',
    role: 'technician',
    password: ''
  });

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      const data = await getTechniciansFromFirebase();
      const safeArray = Array.isArray(data) ? data : [];
      // Normalize fields for UI
      const normalized = safeArray.map((t: any, idx: number) => ({
        id: t.id || idx,
        name: t.name || '',
        email: t.email || '',
        phone: t.phone || '',
        specializations: t.specializations || '',
        role: t.role || 'technician',
        password: t.password || ''
      }));
      setTechnicians(normalized);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      setTechnicians([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Prepare data for submission
      const submitData: any = { ...formData };
      
      // Password is always included now (showing existing password)
      
      if (editingTechnician) {
        await updateTechnicianInFirebase(String(editingTechnician.id), submitData);
      } else {
        await createTechnicianInFirebase(submitData);
      }
      fetchTechnicians();
      setShowModal(false);
      setEditingTechnician(null);
      setFormData({ name: '', email: '', phone: '', specializations: '', role: 'technician', password: '' });
    } catch (error) {
      console.error('Error saving technician:', error);
    }
  };

  const handleEdit = (technician: Technician) => {
    setEditingTechnician(technician);
    setFormData({
      name: technician.name,
      email: technician.email,
      phone: technician.phone || '',
      specializations: technician.specializations || '',
      role: technician.role || 'technician',
      password: technician.password || '' // Show existing password
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this technician?')) {
      try {
        await deleteTechnicianInFirebase(String(id));
        fetchTechnicians();
      } catch (error) {
        console.error('Error deleting technician:', error);
      }
    }
  };

  const filteredTechnicians = (Array.isArray(technicians) ? technicians : []).filter(technician =>
    (technician.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (technician.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (technician.specializations || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Users</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-darker-blue hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Add New Technician
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-gray-700 text-white px-4 py-2 rounded-md w-64"
        />
        <span className="text-gray-400">{filteredTechnicians.length} users</span>
      </div>

      {/* Users List */}
      <div className="bg-gray-800 rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">User List</h2>
        </div>
        <div className="p-6">
          {filteredTechnicians.length > 0 ? (
            <div className="space-y-4">
              {filteredTechnicians.map((technician) => (
                <div key={technician.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{technician.name}</h3>
                    <p className="text-gray-400 text-sm">{technician.email}</p>
                    <p className="text-blue-400 text-sm font-medium">
                      Role: {technician.role || 'technician'}
                    </p>
                    <p className="text-yellow-400 text-sm">
                      Password: {technician.password || 'Not set'}
                    </p>
                    {technician.phone && (
                      <p className="text-gray-400 text-sm">Phone: {technician.phone}</p>
                    )}
                    {technician.specializations && (
                      <p className="text-gray-400 text-sm">Specializations: {technician.specializations}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(technician)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(technician.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No technicians found</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingTechnician ? 'Edit User' : 'Add New User'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                >
                  <option value="technician">Technician</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  placeholder="Enter password"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Specializations</label>
                <textarea
                  value={formData.specializations}
                  onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  rows={3}
                  placeholder="e.g., Electrical Systems, Safety Inspections, Emergency Repairs"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-darker-blue hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  {editingTechnician ? 'Update' : 'Create'} Technician
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTechnician(null);
                    setFormData({ name: '', email: '', phone: '', specializations: '', role: 'technician', password: '' });
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
  );
};

export default Technicians;
