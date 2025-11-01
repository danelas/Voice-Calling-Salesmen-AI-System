import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import axios from 'axios';

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [metric, setMetric] = useState('success_rate');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe, metric]);

  const fetchAnalyticsData = async () => {
    try {
      const response = await axios.get(`/api/analytics/overview?timeframe=${timeframe}&metric=${metric}`);
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const overview = analyticsData?.overview || {};
  const trends = analyticsData?.trends || [];
  const performance = analyticsData?.performance || {};

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600">Detailed insights into your sales performance</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="success_rate">Success Rate</option>
              <option value="call_volume">Call Volume</option>
              <option value="duration">Average Duration</option>
              <option value="engagement">Engagement Score</option>
            </select>
            
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {overview.successRate ? `${Math.round(overview.successRate * 100)}%` : '0%'}
                </dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+5.2%</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <PhoneIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Calls</dt>
                <dd className="text-2xl font-semibold text-gray-900">{overview.totalCalls || 0}</dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+12.3%</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Avg Duration</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {overview.averageDuration ? `${Math.round(overview.averageDuration / 60)}m` : '0m'}
                </dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-red-600">-2.1%</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowTrendingUpIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Conversion Rate</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {overview.conversionRate ? `${Math.round(overview.conversionRate * 100)}%` : '0%'}
                </dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+8.7%</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Performance Trends */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
          {trends && trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="successRate" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="engagementScore" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No trend data available
            </div>
          )}
        </div>

        {/* Call Outcomes Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Outcomes Distribution</h3>
          {performance.outcomes && performance.outcomes.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={performance.outcomes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {performance.outcomes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No outcome data available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Volume by Hour */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Volume by Hour</h3>
          {performance.hourlyDistribution && performance.hourlyDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performance.hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="calls" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No hourly data available
            </div>
          )}
        </div>

        {/* Top Performing Scripts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Insights</h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center">
                <ArrowTrendingUpIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">Best Performance</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Calls between 10-11 AM show 23% higher success rates
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">Engagement Tip</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Average conversation length of 3-4 minutes yields best results
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="text-sm font-medium text-yellow-800">Timing Insight</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Tuesday and Wednesday calls have 18% higher conversion rates
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center">
                <ArrowTrendingUpIcon className="h-5 w-5 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-purple-800">Script Performance</span>
              </div>
              <p className="text-sm text-purple-700 mt-1">
                Personalized opening lines improve engagement by 31%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
