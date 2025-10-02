import React from 'react';

const MobileTest: React.FC = () => {
  const userAgent = navigator.userAgent;
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isMobileWidth = window.innerWidth < 768;
  const isMobile = isMobileWidth || isMobileUserAgent;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Mobile Detection Test</h1>
        
        <div className="space-y-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Device Information</h2>
            <p><strong>Screen Width:</strong> {window.innerWidth}px</p>
            <p><strong>User Agent:</strong> {userAgent}</p>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Detection Results</h2>
            <p className={isMobileWidth ? 'text-green-400' : 'text-red-400'}>
              Mobile Width: {isMobileWidth ? '✅ Yes' : '❌ No'} (&lt; 768px)
            </p>
            <p className={isMobileUserAgent ? 'text-green-400' : 'text-red-400'}>
              Mobile User Agent: {isMobileUserAgent ? '✅ Yes' : '❌ No'}
            </p>
            <p className={isMobile ? 'text-green-400' : 'text-red-400'}>
              <strong>Final Result: {isMobile ? '✅ Mobile' : '❌ Desktop'}</strong>
            </p>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Test URLs</h2>
            <div className="space-y-2">
              <a 
                href="/?role=technician" 
                className="block bg-blue-600 hover:bg-blue-700 text-white p-3 rounded text-center"
              >
                Technician (Auto-detect)
              </a>
              <a 
                href="/?role=technician&mobile=true" 
                className="block bg-green-600 hover:bg-green-700 text-white p-3 rounded text-center"
              >
                Technician (Force Mobile)
              </a>
              <a 
                href="/" 
                className="block bg-gray-600 hover:bg-gray-700 text-white p-3 rounded text-center"
              >
                Admin Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileTest;
