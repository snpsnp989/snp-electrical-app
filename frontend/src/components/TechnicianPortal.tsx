import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

const TechnicianPortal: React.FC = () => {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedTechId = localStorage.getItem('technicianId');
    const savedTechName = localStorage.getItem('technicianName');
    if (savedTechId && savedTechName) {
      window.location.href = window.location.pathname + '?role=technician';
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const techsRef = collection(db, 'technicians');
      const qTech = query(techsRef, where('email', '==', email));
      const snap = await getDocs(qTech);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const tech = docSnap.data() as any;
        localStorage.setItem('technicianId', docSnap.id);
        localStorage.setItem('technicianName', tech.name || 'Technician');
        window.location.href = window.location.pathname + '?role=technician';
        return;
      }

      if (pin === 'tech123') {
        const created = await addDoc(techsRef, {
          name: email.split('@')[0],
          email,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('technicianId', created.id);
        localStorage.setItem('technicianName', email.split('@')[0]);
        window.location.href = window.location.pathname + '?role=technician';
        return;
      }

      setError('Invalid credentials');
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Technician Portal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none"
              placeholder="tech@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none"
              placeholder="Enter PIN"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-md transition-colors font-medium"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TechnicianPortal;


