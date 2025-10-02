import React, { useState, useEffect } from 'react';

interface DashboardStats {
  totalJobs: number;
  pendingJobs: number;
  completedJobs: number;
  totalCustomers: number;
  totalTechnicians: number;
  pendingReports: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    pendingJobs: 0,
    completedJobs: 0,
    totalCustomers: 0,
    totalTechnicians: 0,
    pendingReports: 0
  });

  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  useEffect(() => {
    // Fetch dashboard data
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch jobs
      const jobsResponse = await fetch('http://localhost:5000/api/jobs');
      const jobs = await jobsResponse.json();
      
      // Fetch customers
      const customersResponse = await fetch('http://localhost:5000/api/customers');
      const customers = await customersResponse.json();
      
      // Fetch technicians
      const techniciansResponse = await fetch('http://localhost:5000/api/technicians');
      const technicians = await techniciansResponse.json();
      
      // Fetch reports
      const reportsResponse = await fetch('http://localhost:5000/api/reports/monthly');
      const reports = await reportsResponse.json();

      setStats({
        totalJobs: jobs.length,
        pendingJobs: jobs.filter((job: any) => job.status === 'pending').length,
        completedJobs: jobs.filter((job: any) => job.status === 'completed').length,
        totalCustomers: customers.length,
        totalTechnicians: technicians.length,
        pendingReports: reports.length
      });

      setRecentJobs(jobs.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const statCards = [
    { title: 'Total Jobs', value: stats.totalJobs, color: 'bg-blue-600' },
    { title: 'Pending Jobs', value: stats.pendingJobs, color: 'bg-yellow-600' },
    { title: 'Completed Jobs', value: stats.completedJobs, color: 'bg-green-600' },
    { title: 'Customers', value: stats.totalCustomers, color: 'bg-purple-600' },
    { title: 'Technicians', value: stats.totalTechnicians, color: 'bg-indigo-600' },
    { title: 'Pending Reports', value: stats.pendingReports, color: 'bg-red-600' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <button
          onClick={fetchDashboardData}
          className="bg-darker-blue hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">{card.title}</p>
                <p className="text-3xl font-bold text-white">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.color} rounded-full flex items-center justify-center`}>
                <span className="text-white text-xl">📊</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="bg-gray-800 rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Recent Jobs</h2>
        </div>
        <div className="p-6">
          {recentJobs.length > 0 ? (
            <div className="space-y-4">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="text-white font-medium">{job.title}</h3>
                    <p className="text-gray-400 text-sm">{job.customer_name}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      job.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : job.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {job.status}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No jobs found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
