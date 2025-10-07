import React from 'react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  userName?: string;
  userRole?: string;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, onLogout, userName, userRole }) => {
  const menuItems = [
    { id: 'jobs', label: 'Jobs', icon: '🔧' },
    { id: 'customers', label: 'Clients', icon: '🏢' },
    { id: 'technicians', label: 'Users', icon: '👥' },
    { id: 'parts', label: 'Parts', icon: '🧩' },
    { id: 'equipment', label: 'Equipment', icon: '⚙️' }
  ];

  return (
    <nav className="bg-snp-primary shadow-snp-lg border-b border-snp-secondary">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-snp-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">⚡</span>
              </div>
              <h1 className="text-2xl font-bold text-white">SNP Electrical</h1>
            </div>
            {userName && (
              <div className="hidden md:block px-4 py-2 bg-snp-gray rounded-lg">
                <span className="text-sm text-snp-light">
                  Welcome, <span className="font-semibold">{userName}</span> 
                  <span className="text-snp-accent ml-1">({userRole})</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-snp-secondary text-white shadow-snp'
                    : 'text-snp-light hover:bg-snp-gray hover:text-white hover:shadow-snp'
                }`}
              >
                <span className="mr-2 text-base">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
            {onLogout && (
              <button
                onClick={onLogout}
                className="ml-4 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-snp"
              >
                <span className="mr-2">🚪</span>
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
