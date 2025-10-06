import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config/api';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface Customer {
  id: number;
  name: string;
  contact_name?: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const snap = await getDocs(collection(db, 'customers'));
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any;
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', String(editingCustomer.id)), { ...formData, updated_at: Timestamp.now() } as any);
      } else {
        await addDoc(collection(db, 'customers'), { ...formData, created_at: Timestamp.now() } as any);
      }
      await fetchCustomers();
      setShowModal(false);
      setEditingCustomer(null);
      setFormData({ name: '', contact_name: '', email: '', phone: '', address: '' });
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      contact_name: customer.contact_name || '',
      email: customer.email,
      phone: customer.phone,
      address: customer.address
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteDoc(doc(db, 'customers', String(id)));
        fetchCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Customers</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-darker-blue hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Add New Customer
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-gray-700 text-white px-4 py-2 rounded-md w-64"
        />
        <span className="text-gray-400">{filteredCustomers.length} customers</span>
      </div>

      {/* Customers List */}
      <div className="bg-gray-800 rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Customer List</h2>
        </div>
        <div className="p-6">
          {filteredCustomers.length > 0 ? (
            <div className="space-y-4">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{customer.name}</h3>
                    {customer.contact_name && (
                      <p className="text-gray-400 text-sm">Contact: {customer.contact_name}</p>
                    )}
                    <p className="text-gray-400 text-sm">{customer.email}</p>
                    {customer.phone && (
                      <p className="text-gray-400 text-sm">Phone: {customer.phone}</p>
                    )}
                    {customer.address && (
                      <p className="text-gray-400 text-sm">Address: {customer.address}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No customers found</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Company / Contact in two columns on larger screens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Company Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Australian Building Authority"
                    autoComplete="organization"
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-md h-11"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="e.g., Doug Ballantyne"
                    autoComplete="name"
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-md h-11"
                  />
                </div>
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
                <label className="block text-gray-300 text-sm font-medium mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-md"
                  rows={3}
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-darker-blue hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  {editingCustomer ? 'Update' : 'Create'} Customer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCustomer(null);
                    setFormData({ name: '', contact_name: '', email: '', phone: '', address: '' });
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

export default Customers;
