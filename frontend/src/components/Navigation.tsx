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
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'jobs', label: 'Jobs', icon: '🔧' },
    { id: 'customers', label: 'Clients', icon: '🏢' },
    { id: 'technicians', label: 'Technicians', icon: '👨‍🔧' },
    { id: 'parts', label: 'Parts', icon: '🧩' },
    { id: 'equipment', label: 'Equipment', icon: '⚙️' }
  ];

  return (
    <nav className="bg-dark-blue shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white">SNP Electrical</h1>
            {userName && (
              <div className="ml-4 text-sm text-gray-300">
                Welcome, {userName} ({userRole})
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-darker-blue text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
            {onLogout && (
              <button
                onClick={onLogout}
                className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                🚪 Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
