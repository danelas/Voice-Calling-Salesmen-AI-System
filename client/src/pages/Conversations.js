import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PhoneIcon, 
  ClockIcon, 
  UserIcon,
  ChatBubbleLeftRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import axios from 'axios';

const Conversations = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      const response = await axios.get('/api/calls');
      setCalls(response.data.calls || []);
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOutcomeColor = (outcome) => {
    const colors = {
      'INTERESTED': 'bg-green-100 text-green-800',
      'NOT_INTERESTED': 'bg-red-100 text-red-800',
      'CALLBACK_REQUESTED': 'bg-yellow-100 text-yellow-800',
      'MEETING_SCHEDULED': 'bg-blue-100 text-blue-800',
      'SALE_MADE': 'bg-purple-100 text-purple-800',
      'VOICEMAIL': 'bg-gray-100 text-gray-800',
      'NO_ANSWER': 'bg-gray-100 text-gray-800',
      'WRONG_NUMBER': 'bg-red-100 text-red-800'
    };
    return colors[outcome] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      'COMPLETED': 'text-green-600',
      'IN_PROGRESS': 'text-blue-600',
      'SCHEDULED': 'text-yellow-600',
      'FAILED': 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
  };

  const filteredCalls = calls.filter(call => {
    const matchesFilter = filter === 'all' || call.outcome === filter;
    const matchesSearch = !searchTerm || 
      call.lead?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.lead?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.lead?.company?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const sortedCalls = [...filteredCalls].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'duration':
        return (b.duration || 0) - (a.duration || 0);
      case 'outcome':
        return (a.outcome || '').localeCompare(b.outcome || '');
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Conversations</h1>
        <p className="text-gray-600">View and analyze all your AI sales conversations</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter by Outcome */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Outcomes</option>
              <option value="INTERESTED">Interested</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="CALLBACK_REQUESTED">Callback Requested</option>
              <option value="MEETING_SCHEDULED">Meeting Scheduled</option>
              <option value="SALE_MADE">Sale Made</option>
              <option value="VOICEMAIL">Voicemail</option>
              <option value="NO_ANSWER">No Answer</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="recent">Most Recent</option>
              <option value="duration">Longest Duration</option>
              <option value="outcome">By Outcome</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {sortedCalls.length === 0 ? (
          <div className="text-center py-12">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
            <p className="text-gray-500">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Start making calls to see conversations here'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedCalls.map((call) => (
              <Link
                key={call.id}
                to={`/conversations/${call.id}`}
                className="block hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {call.lead?.firstName} {call.lead?.lastName}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOutcomeColor(call.outcome)}`}>
                            {call.outcome?.replace('_', ' ') || 'Unknown'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <span>{call.lead?.company}</span>
                          <span>•</span>
                          <span>{call.lead?.phone}</span>
                          <span>•</span>
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1">
                      <div className={`flex items-center text-sm font-medium ${getStatusColor(call.status)}`}>
                        <PhoneIcon className="h-4 w-4 mr-1" />
                        {call.status}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(call.createdAt), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>

                  {/* Conversation Preview */}
                  {call.transcript && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {call.transcript.substring(0, 200)}...
                      </p>
                    </div>
                  )}

                  {/* Interaction Count */}
                  {call.interactions && call.interactions.length > 0 && (
                    <div className="mt-3 flex items-center text-sm text-gray-500">
                      <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                      {call.interactions.length} interactions
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversations;
