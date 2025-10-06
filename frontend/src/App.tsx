import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Jobs from './components/Jobs';
import JobsNew from './components/JobsNew';
import Customers from './components/Customers';
import Clients from './components/Clients';
import Equipment from './components/Equipment';
import Parts from './components/Parts';
import Technicians from './components/Technicians';
import Reports from './components/Reports';
import TechnicianMobile from './components/TechnicianMobile';
import MobileTest from './components/MobileTest';
import UnifiedLogin from './components/UnifiedLogin';
import { apiClient } from './utils/apiClient';

function App() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [isMobile, setIsMobile] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('admin');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');

  const handleLogout = () => {
    // Clear only authentication-related localStorage data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('technicianId');
    localStorage.removeItem('technicianName');
    
    // Clear console
    console.clear();
    
    // Reset all state
    setIsAuthenticated(false);
    setUserRole('admin');
    setUserName('');
    setUserId('');
    
    // Force page reload to clear any cached data
    window.location.reload();
  };

  useEffect(() => {
    // Clear any old admin authentication data first
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    
    // Check if user is on mobile device
    const checkMobile = () => {
      const isMobileWidth = window.innerWidth < 768;
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileWidth || isMobileUserAgent);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Check for existing authentication
    const savedRole = localStorage.getItem('userRole');
    const savedName = localStorage.getItem('userName');
    const savedUserId = localStorage.getItem('userId');
    
    if (savedRole && savedName) {
      setIsAuthenticated(true);
      setUserRole(savedRole);
      setUserName(savedName);
      if (savedUserId) setUserId(savedUserId);
    }
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show unified login if not authenticated
  if (!isAuthenticated) {
    return <UnifiedLogin onLogin={(authenticated, role, name, userId) => {
      setIsAuthenticated(authenticated);
      setUserRole(role);
      setUserName(name);
      if (userId) setUserId(userId);
    }} />;
  }

  // Show mobile technician view for technicians
  if (userRole === 'technician') {
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
    <div className="min-h-screen bg-snp-dark text-white font-sans">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} userName={userName} userRole={userRole} />
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="bg-snp-gray rounded-lg shadow-snp-lg p-6 min-h-[calc(100vh-8rem)]">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
