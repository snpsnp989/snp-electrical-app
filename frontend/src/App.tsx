import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Jobs from './components/Jobs';
import Customers from './components/Customers';
import Clients from './components/Clients';
import Equipment from './components/Equipment';
import Parts from './components/Parts';
import Technicians from './components/Technicians';
import Reports from './components/Reports';
import TechnicianMobile from './components/TechnicianMobile';
import MobileTest from './components/MobileTest';
import AdminLogin from './components/AdminLogin';

function App() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [isMobile, setIsMobile] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('admin');
  const [userName, setUserName] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
    setUserRole('admin');
    setUserName('');
  };

  useEffect(() => {
    // Check if user is on mobile device
    const checkMobile = () => {
      const isMobileWidth = window.innerWidth < 768;
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileWidth || isMobileUserAgent);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Check for user authentication
    const adminToken = localStorage.getItem('adminToken');
    const storedUserRole = localStorage.getItem('userRole');
    const storedUserName = localStorage.getItem('userName');
    
    if (adminToken) {
      setIsAuthenticated(true);
      if (storedUserRole) setUserRole(storedUserRole);
      if (storedUserName) setUserName(storedUserName);
    }
    
    // In real app, get user role from authentication
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role') || (urlParams.get('technician') === 'true' ? 'technician' : 'manager');
    setUserRole(role);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin onLogin={(authenticated, role, name) => {
      setIsAuthenticated(authenticated);
      if (role) setUserRole(role);
      if (name) setUserName(name);
    }} />;
  }

  // Show mobile technician view
  if (isMobile && userRole === 'technician') {
    return <TechnicianMobile />;
  }

  // Force mobile technician view for mobile URLs
  if (userRole === 'technician' && (window.location.pathname.includes('mobile') || window.location.search.includes('mobile=true'))) {
    return <TechnicianMobile />;
  }

  // Mobile test page
  if (window.location.search.includes('test=mobile')) {
    return <MobileTest />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'jobs':
        return <Jobs />;
      case 'customers':
        return <Clients />;
      case 'equipment':
        return <Equipment />;
      case 'technicians':
        return <Technicians />;
      case 'parts':
        return <Parts />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} userName={userName} userRole={userRole} />
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
