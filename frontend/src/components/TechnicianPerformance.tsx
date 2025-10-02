import React, { useState, useEffect } from 'react';

interface PerformanceMetrics {
  totalJobs: number;
  completedJobs: number;
  averageJobTime: number;
  totalHours: number;
  efficiency: number;
  customerRating: number;
  onTimeCompletion: number;
  photoCount: number;
  recentActivity: Array<{
    date: string;
    jobs: number;
    hours: number;
  }>;
}

interface TechnicianPerformanceProps {
  technicianId: string;
  timesheet: Array<{
    id: string;
    jobId: string;
    jobTitle: string;
    startTime: Date;
    endTime?: Date;
    totalHours: number;
    status: 'active' | 'completed';
  }>;
  jobs: Array<{
    id: string;
    title: string;
    status: string;
    scheduled_date: any;
    photos?: Array<any>;
  }>;
}

const TechnicianPerformance: React.FC<TechnicianPerformanceProps> = ({ 
  technicianId, 
  timesheet, 
  jobs 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');

  useEffect(() => {
    calculateMetrics();
  }, [timesheet, jobs, timeRange]);

  const calculateMetrics = () => {
    const now = new Date();
    const startDate = getStartDate(now, timeRange);
    
    const filteredJobs = jobs.filter(job => 
      new Date(job.scheduled_date) >= startDate
    );
    
    const filteredTimesheet = timesheet.filter(entry => 
      entry.startTime >= startDate
    );

    const completedJobs = filteredJobs.filter(job => job.status === 'completed');
    const totalHours = filteredTimesheet.reduce((sum, entry) => sum + entry.totalHours, 0);
    const averageJobTime = completedJobs.length > 0 ? totalHours / completedJobs.length : 0;
    
    // Calculate efficiency (jobs per hour)
    const efficiency = totalHours > 0 ? completedJobs.length / totalHours : 0;
    
    // Calculate on-time completion (mock data for demo)
    const onTimeCompletion = Math.random() * 20 + 80; // 80-100%
    
    // Calculate customer rating (mock data for demo)
    const customerRating = Math.random() * 1 + 4; // 4-5 stars
    
    // Calculate recent activity
    const recentActivity = getRecentActivity(filteredTimesheet, 7);
    
    const photoCount = filteredJobs.reduce((count, job) => 
      count + (job.photos?.length || 0), 0
    );

    setMetrics({
      totalJobs: filteredJobs.length,
      completedJobs: completedJobs.length,
      averageJobTime,
      totalHours,
      efficiency,
      customerRating,
      onTimeCompletion,
      photoCount,
      recentActivity
    });
  };

  const getStartDate = (now: Date, range: 'week' | 'month' | 'quarter'): Date => {
    const start = new Date(now);
    switch (range) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
    }
    return start;
  };

  const getRecentActivity = (timesheet: any[], days: number) => {
    const activity = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayTimesheet = timesheet.filter(entry => 
        entry.startTime.toDateString() === date.toDateString()
      );
      
      activity.push({
        date: date.toLocaleDateString(),
        jobs: dayTimesheet.length,
        hours: dayTimesheet.reduce((sum, entry) => sum + entry.totalHours, 0)
      });
    }
    return activity;
  };

  if (!metrics) return <div className="text-center text-gray-400">Loading metrics...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Performance Dashboard</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="bg-gray-700 text-white px-3 py-2 rounded-md border border-gray-600"
        >
          <option value="week">Last 7 Days</option>
          <option value="month">Last Month</option>
          <option value="quarter">Last Quarter</option>
        </select>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{metrics.totalJobs}</div>
          <div className="text-gray-400 text-sm">Total Jobs</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{metrics.completedJobs}</div>
          <div className="text-gray-400 text-sm">Completed</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{metrics.totalHours.toFixed(1)}h</div>
          <div className="text-gray-400 text-sm">Total Hours</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">{metrics.efficiency.toFixed(1)}</div>
          <div className="text-gray-400 text-sm">Jobs/Hour</div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-2">Average Job Time</h3>
          <div className="text-3xl font-bold text-blue-400">{metrics.averageJobTime.toFixed(1)}h</div>
          <div className="text-gray-400 text-sm">per job</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-2">On-Time Completion</h3>
          <div className="text-3xl font-bold text-green-400">{metrics.onTimeCompletion.toFixed(0)}%</div>
          <div className="text-gray-400 text-sm">jobs completed on time</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-2">Customer Rating</h3>
          <div className="text-3xl font-bold text-yellow-400">{metrics.customerRating.toFixed(1)}⭐</div>
          <div className="text-gray-400 text-sm">average rating</div>
        </div>
      </div>

      {/* Recent Activity Chart */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {metrics.recentActivity.map((day, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-gray-300">{day.date}</span>
              <div className="flex items-center gap-4">
                <span className="text-blue-400">{day.jobs} jobs</span>
                <span className="text-green-400">{day.hours.toFixed(1)}h</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photo Documentation */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-white font-semibold mb-4">Documentation</h3>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold text-purple-400">{metrics.photoCount}</div>
          <div>
            <div className="text-white">Photos Uploaded</div>
            <div className="text-gray-400 text-sm">This period</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicianPerformance;

