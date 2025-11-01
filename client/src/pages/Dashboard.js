import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PhoneIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import axios from 'axios';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d');

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`/api/dashboard?timeframe=${timeframe}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = dashboardData?.overview || {};
  const charts = dashboardData?.charts || {};
  const recentActivity = dashboardData?.recentActivity || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome to your Voice Sales AI dashboard</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <PhoneIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Calls</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.totalCalls || 0}</dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+12%</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Active Leads</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.activeLeads || 0}</dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+8%</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats.successRate ? `${Math.round(stats.successRate * 100)}%` : '0%'}
                </dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+5%</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Avg Duration</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats.averageDuration ? `${Math.round(stats.averageDuration / 60)}m` : '0m'}
                </dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+15s</span>
              <span className="text-gray-500 ml-1">from last period</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Call Outcomes Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Outcomes</h3>
          {charts.outcomes && charts.outcomes.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={charts.outcomes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {charts.outcomes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Daily Trends Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Call Volume</h3>
          {charts.dailyTrends && charts.dailyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts.dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="calls" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Conversations</h3>
              <Link
                to="/conversations"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all
              </Link>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((call) => (
                <Link
                  key={call.id}
                  to={`/conversations/${call.id}`}
                  className="block p-6 hover:bg-gray-50 transition-colors duration-150"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <ChatBubbleLeftRightIcon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {call.lead?.firstName} {call.lead?.lastName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {call.lead?.company} • {call.outcome?.replace('_', ' ') || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-sm text-gray-500">
                      {format(new Date(call.createdAt), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                No recent conversations
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          
          <div className="space-y-3">
            <Link
              to="/leads"
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-150"
            >
              <UserGroupIcon className="h-4 w-4 mr-2" />
              Manage Leads
            </Link>
            
            <Link
              to="/conversations"
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-150"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
              View Conversations
            </Link>
            
            <Link
              to="/analytics"
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-150"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              View Analytics
            </Link>
          </div>

          {/* System Status */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">System Status</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">API Status</span>
                <span className="flex items-center text-green-600">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Database</span>
                <span className="flex items-center text-green-600">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">AI Services</span>
                <span className="flex items-center text-green-600">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
