import React, { useState, useEffect } from 'react';

interface Equipment {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

const Equipment: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5001' 
        : 'http://192.168.0.223:5001';
      const response = await fetch(`${apiUrl}/api/equipment`);
      const data = await response.json();
      setEquipment(data);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5001' 
        : 'http://192.168.0.223:5001';
      
      const url = editingEquipment
        ? `${apiUrl}/api/equipment/${editingEquipment.id}`
        : `${apiUrl}/api/equipment`;
      
      const method = editingEquipment ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          is_active: editingEquipment ? editingEquipment.is_active : true
        }),
      });

      if (response.ok) {
        fetchEquipment();
        setShowModal(false);
        setEditingEquipment(null);
        setFormData({ name: '', description: '' });
      } else {
        alert('Failed to save equipment');
      }
    } catch (error) {
      console.error('Error saving equipment:', error);
      alert('Failed to save equipment');
    }
  };

  const handleEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setFormData({
      name: equipment.name,
      description: equipment.description || ''
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (equipmentId: string) => {
    try {
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5001' 
        : 'http://192.168.0.223:5001';
      await fetch(`${apiUrl}/api/equipment/${equipmentId}/toggle`, { method: 'PATCH' });
      fetchEquipment();
    } catch (error) {
      console.error('Error toggling equipment status:', error);
      alert('Failed to toggle equipment status');
    }
  };

  const handleDelete = async (equipmentId: string) => {
    if (!window.confirm('Delete this equipment? This cannot be undone.')) return;
    try {
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5001' 
        : 'http://192.168.0.223:5001';
      await fetch(`${apiUrl}/api/equipment/${equipmentId}`, { method: 'DELETE' });
      fetchEquipment();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      alert('Failed to delete equipment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Equipment Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-darker-blue hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Add New Equipment
        </button>
      </div>

      {/* Equipment List */}
      <div className="bg-gray-800 rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Equipment Types ({equipment.length})</h2>
        </div>
        <div className="p-6">
          {equipment.length > 0 ? (
            <div className="space-y-4">
              {equipment.map((item) => (
                <div key={item.id} className={`rounded-lg p-4 ${item.is_active ? 'bg-gray-700' : 'bg-gray-600 opacity-75'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.is_active 
                            ? 'bg-green-900 text-green-300' 
                            : 'bg-red-900 text-red-300'
                        }`}>
                          {item.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-gray-300 mt-1">{item.description}</p>
                      )}
                      <p className="text-gray-400 text-sm mt-2">
                        Created: {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleStatus(item.id)}
                        className={`px-3 py-1 rounded-md text-sm transition-colors ${
                          item.is_active
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                        title={item.is_active ? 'Disable Equipment' : 'Enable Equipment'}
                      >
                        {item.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No equipment found. Add your first equipment type to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                {editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingEquipment(null);
                  setFormData({ name: '', description: '' });
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Equipment Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  placeholder="e.g., Bollards, Roller Doors, Boom Gates"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md h-24"
                  placeholder="Brief description of the equipment type..."
                />
              </div>

              {editingEquipment && (
                <div className="bg-yellow-900 bg-opacity-30 border border-yellow-500 rounded-lg p-3">
                  <p className="text-yellow-300 text-sm">
                    <strong>Status:</strong> {editingEquipment.is_active ? 'Active' : 'Disabled'} - 
                    Use the Enable/Disable button to change status
                  </p>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-darker-blue hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  {editingEquipment ? 'Update' : 'Create'} Equipment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingEquipment(null);
                    setFormData({ name: '', description: '' });
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

export default Equipment;
