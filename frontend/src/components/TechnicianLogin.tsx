import React, { useState } from 'react';

interface TechnicianLoginProps {
  onLogin: (technicianId: string, technicianName: string) => void;
}

const TechnicianLogin: React.FC<TechnicianLoginProps> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // In a real app, this would validate against your backend
      // For now, we'll use simple demo credentials
      if (credentials.email === 'tech@snpelectrical.com' && credentials.password === 'tech123') {
        onLogin('1', 'Demo Technician');
      } else if (credentials.email === 'tech2@snpelectrical.com' && credentials.password === 'tech123') {
        onLogin('2', 'John Smith');
      } else if (credentials.email === 'simon@snp-electrical.com' && credentials.password === 'tech123') {
        onLogin('10', 'Simon Potter');
      } else {
        setError('Invalid credentials. Use tech@snpelectrical.com / tech123, tech2@snpelectrical.com / tech123, or simon@snp-electrical.com / tech123');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">SNP Electrical</h1>
          <p className="text-gray-400">Technician Login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-darker-blue hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-md transition-colors font-medium"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 p-4 bg-gray-700 rounded-md">
          <h3 className="text-white font-medium mb-2">Demo Credentials:</h3>
          <div className="text-sm text-gray-300 space-y-1">
            <p><strong>Technician 1:</strong> tech@snpelectrical.com / tech123</p>
            <p><strong>Technician 2:</strong> tech2@snpelectrical.com / tech123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicianLogin;
