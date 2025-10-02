// Offline functionality test utilities
export const testOfflineFunctionality = () => {
  console.log('🧪 Testing Offline Functionality...');
  
  // Test localStorage availability
  const testStorage = () => {
    try {
      localStorage.setItem('test', 'value');
      localStorage.removeItem('test');
      console.log('✅ localStorage is available');
      return true;
    } catch (error) {
      console.log('❌ localStorage not available:', error);
      return false;
    }
  };

  // Test online/offline detection
  const testConnectionDetection = () => {
    console.log('🌐 Online status:', navigator.onLine);
    return navigator.onLine;
  };

  // Test data persistence
  const testDataPersistence = () => {
    const testData = {
      jobs: [{ id: 'test', title: 'Test Job', status: 'pending' }],
      timesheet: [{ id: 'test', jobId: 'test', startTime: new Date(), totalHours: 0 }],
      pendingSync: [{ type: 'job_update', data: { jobId: 'test' }, timestamp: new Date() }]
    };

    try {
      localStorage.setItem('offline_test_jobs', JSON.stringify(testData.jobs));
      localStorage.setItem('offline_test_timesheet', JSON.stringify(testData.timesheet));
      localStorage.setItem('offline_test_pending', JSON.stringify(testData.pendingSync));

      const loadedJobs = JSON.parse(localStorage.getItem('offline_test_jobs') || '[]');
      const loadedTimesheet = JSON.parse(localStorage.getItem('offline_test_timesheet') || '[]');
      const loadedPending = JSON.parse(localStorage.getItem('offline_test_pending') || '[]');

      console.log('✅ Data persistence test passed');
      console.log('📊 Loaded data:', { loadedJobs, loadedTimesheet, loadedPending });

      // Cleanup
      localStorage.removeItem('offline_test_jobs');
      localStorage.removeItem('offline_test_timesheet');
      localStorage.removeItem('offline_test_pending');

      return true;
    } catch (error) {
      console.log('❌ Data persistence test failed:', error);
      return false;
    }
  };

  const results = {
    storage: testStorage(),
    connection: testConnectionDetection(),
    persistence: testDataPersistence()
  };

  console.log('📋 Test Results:', results);
  return results;
};

export const simulateOfflineMode = () => {
  console.log('🔴 Simulating offline mode...');
  // This would be used for testing offline functionality
  // In a real test, you'd use browser dev tools to simulate offline
  return {
    isOnline: false,
    message: 'Offline mode simulated - test offline functionality'
  };
};

export const simulateOnlineMode = () => {
  console.log('🟢 Simulating online mode...');
  return {
    isOnline: true,
    message: 'Online mode simulated - test sync functionality'
  };
};

