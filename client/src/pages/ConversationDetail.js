import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  PhoneIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  ChatBubbleRightIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import axios from 'axios';

const ConversationDetail = () => {
  const { id } = useParams();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState(null);

  useEffect(() => {
    fetchCallDetail();
  }, [id]);

  const fetchCallDetail = async () => {
    try {
      const response = await axios.get(`/api/calls/${id}`);
      setCall(response.data.call);
    } catch (error) {
      console.error('Error fetching call detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return <FaceSmileIcon className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <FaceFrownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'border-l-green-500 bg-green-50';
      case 'negative':
        return 'border-l-red-500 bg-red-50';
      case 'neutral':
        return 'border-l-gray-500 bg-gray-50';
      default:
        return 'border-l-gray-300 bg-white';
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

  const playAudio = (audioFile) => {
    if (playingAudio === audioFile) {
      setPlayingAudio(null);
      // Stop audio logic here
    } else {
      setPlayingAudio(audioFile);
      // Play audio logic here
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Call not found</h3>
          <p className="text-gray-500 mb-4">The requested conversation could not be found.</p>
          <Link
            to="/conversations"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Conversations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/conversations"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Conversations
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Conversation with {call.lead?.firstName} {call.lead?.lastName}
            </h1>
            <p className="text-gray-600 mt-1">
              {format(new Date(call.createdAt), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
            </p>
          </div>
          
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getOutcomeColor(call.outcome)}`}>
            {call.outcome?.replace('_', ' ') || 'Unknown'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Conversation */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation Timeline</h2>
              
              {/* Call Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <ClockIcon className="h-5 w-5 text-gray-500 mr-1" />
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">Duration</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <ChatBubbleLeftIcon className="h-5 w-5 text-gray-500 mr-1" />
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {call.interactions?.length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Interactions</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <div className="h-5 w-5 rounded-full bg-blue-500 mr-1"></div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {call.engagementScore ? `${Math.round(call.engagementScore * 100)}%` : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">Engagement</div>
                </div>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="p-6">
              {call.interactions && call.interactions.length > 0 ? (
                <div className="space-y-4">
                  {call.interactions.map((interaction, index) => (
                    <div
                      key={index}
                      className={`flex ${interaction.speaker === 'AI' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-3xl ${interaction.speaker === 'AI' ? 'mr-12' : 'ml-12'}`}>
                        <div className={`p-4 rounded-lg border-l-4 ${getSentimentColor(interaction.sentiment)}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {interaction.speaker === 'AI' ? (
                                <ChatBubbleLeftIcon className="h-4 w-4 text-blue-600" />
                              ) : (
                                <ChatBubbleRightIcon className="h-4 w-4 text-green-600" />
                              )}
                              <span className="text-sm font-medium text-gray-900">
                                {interaction.speaker === 'AI' ? 'AI Assistant' : 'Customer'}
                              </span>
                              {interaction.sentiment && getSentimentIcon(interaction.sentiment)}
                            </div>
                            
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              {interaction.interactionType && (
                                <span className="px-2 py-1 bg-gray-100 rounded">
                                  {interaction.interactionType.replace('_', ' ')}
                                </span>
                              )}
                              <span>
                                {format(new Date(interaction.timestamp), 'h:mm:ss a')}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-gray-800 leading-relaxed">
                            {interaction.message}
                          </p>
                          
                          {/* Audio Player (if available) */}
                          {interaction.audioFile && (
                            <div className="mt-3 flex items-center space-x-2">
                              <button
                                onClick={() => playAudio(interaction.audioFile)}
                                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                              >
                                {playingAudio === interaction.audioFile ? (
                                  <PauseIcon className="h-4 w-4" />
                                ) : (
                                  <PlayIcon className="h-4 w-4" />
                                )}
                                <span>Play Audio</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ChatBubbleLeftIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No conversation details available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Lead Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Information</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <UserIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {call.lead?.firstName} {call.lead?.lastName}
                  </div>
                  <div className="text-sm text-gray-500">{call.lead?.email}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
                <div className="text-sm text-gray-900">{call.lead?.phone}</div>
              </div>
              
              {call.lead?.company && (
                <div className="flex items-center space-x-3">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{call.lead?.company}</div>
                    {call.lead?.industry && (
                      <div className="text-sm text-gray-500">{call.lead?.industry}</div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <div className="text-sm text-gray-900">
                  Status: <span className="font-medium">{call.lead?.status || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Call Analytics */}
          {call.analytics && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Analytics</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Engagement Score</span>
                    <span className="font-medium text-gray-900">
                      {call.analytics.engagementScore ? `${Math.round(call.analytics.engagementScore * 100)}%` : 'N/A'}
                    </span>
                  </div>
                  {call.analytics.engagementScore && (
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${call.analytics.engagementScore * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                
                {call.analytics.conversionProbability && (
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Conversion Probability</span>
                      <span className="font-medium text-gray-900">
                        {Math.round(call.analytics.conversionProbability * 100)}%
                      </span>
                    </div>
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${call.analytics.conversionProbability * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {call.analytics.sentimentDistribution && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Sentiment Distribution</div>
                    <div className="space-y-1">
                      {Object.entries(call.analytics.sentimentDistribution).map(([sentiment, percentage]) => (
                        <div key={sentiment} className="flex justify-between text-sm">
                          <span className="capitalize">{sentiment}</span>
                          <span>{Math.round(percentage * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Follow-up Actions */}
          {call.followUpDate && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow-up</h3>
              <div className="flex items-center space-x-3">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Scheduled Follow-up</div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(call.followUpDate), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationDetail;
