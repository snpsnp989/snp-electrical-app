import React, { useState, useEffect } from 'react';
import { getTechnicians } from '../services/firebaseService';

interface UnifiedLoginProps {
  onLogin: (authenticated: boolean, role: string, name: string, userId?: string) => void;
}

const UnifiedLogin: React.FC<UnifiedLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load technicians for technician login
    const loadTechnicians = async () => {
      try {
        const techs = await getTechnicians();
        console.log('🔍 Loaded technicians:', techs);
        console.log('🔍 George specifically:', techs.find((t: any) => t.email === 'george.tsiogas@hotmail.com'));
        setTechnicians(techs);
      } catch (err: any) {
        setError('Database connection failed. Please check your internet connection and try again.');
      }
    };
    loadTechnicians();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (technicians.length === 0) {
        setError('No users loaded from database. Please refresh the page.');
        return;
      }
      
      // Find user by email and role
      const user = technicians.find(t => 
        t.email.toLowerCase() === email.toLowerCase() && 
        t.role === 'admin' &&
        t.password === password
      );

      if (user) {
        localStorage.setItem('adminToken', 'admin-token-' + Date.now());
        localStorage.setItem('adminEmail', email);
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('userName', user.name);
        localStorage.setItem('userId', user.id);
        onLogin(true, 'admin', user.name, user.id);
      } else {
        setError('Invalid email, password, or insufficient permissions');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTechnicianLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (technicians.length === 0) {
        setError('No technicians loaded from database. Please refresh the page.');
        return;
      }
      
      // Find technician by email and password
      console.log('🔍 Looking for technician with email:', email, 'password:', password);
      console.log('🔍 Available technicians:', technicians);
      const technician = technicians.find(t => 
        t.email.toLowerCase() === email.toLowerCase() && 
        t.role === 'technician' &&
        t.password === password
      );
      console.log('🔍 Found technician:', technician);

      if (technician) {
        localStorage.setItem('technicianId', technician.id);
        localStorage.setItem('technicianName', technician.name);
        localStorage.setItem('userRole', 'technician');
        localStorage.setItem('userName', technician.name);
        localStorage.setItem('userId', technician.id);
        onLogin(true, 'technician', technician.name, technician.id);
      } else {
        setError('Invalid email, password, or insufficient permissions');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            SNP Electrical Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Sign in to your account
          </p>
        </div>
        
        {/* Role Selection */}
        <div className="flex space-x-4 mb-6">
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
              role === 'admin'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setRole('technician')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
              role === 'technician'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Technician
          </button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={role === 'admin' ? handleAdminLogin : handleTechnicianLogin}>
          {role === 'admin' ? (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </>
          )}

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnifiedLogin;
