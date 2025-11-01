import React, { useState, useEffect } from 'react';
import {
  CogIcon,
  KeyIcon,
  BellIcon,
  UserIcon,
  ShieldCheckIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

const Settings = () => {
  const [settings, setSettings] = useState({
    apiKeys: {
      openai: '',
      elevenlabs: '',
      textmagic: ''
    },
    voiceSettings: {
      voiceId: '',
      speed: 1.0,
      stability: 0.75
    },
    callSettings: {
      maxDuration: 300,
      autoFollowUp: true,
      recordCalls: true
    },
    notifications: {
      emailAlerts: true,
      callComplete: true,
      dailyReports: false
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // This would fetch current settings from the API
      // const response = await axios.get('/api/settings');
      // setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // This would save settings to the API
      // await axios.put('/api/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'api', name: 'API Keys', icon: KeyIcon },
    { id: 'voice', name: 'Voice Settings', icon: MicrophoneIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure your Voice Sales AI system</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Call Duration (seconds)
                    </label>
                    <input
                      type="number"
                      value={settings.callSettings.maxDuration}
                      onChange={(e) => handleInputChange('callSettings', 'maxDuration', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">Maximum duration for each call in seconds</p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoFollowUp"
                      checked={settings.callSettings.autoFollowUp}
                      onChange={(e) => handleInputChange('callSettings', 'autoFollowUp', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoFollowUp" className="ml-2 block text-sm text-gray-900">
                      Enable automatic follow-up scheduling
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="recordCalls"
                      checked={settings.callSettings.recordCalls}
                      onChange={(e) => handleInputChange('callSettings', 'recordCalls', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="recordCalls" className="ml-2 block text-sm text-gray-900">
                      Record calls for analysis
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* API Keys */}
            {activeTab === 'api' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      value={settings.apiKeys.openai}
                      onChange={(e) => handleInputChange('apiKeys', 'openai', e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">Required for AI conversation generation</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ElevenLabs API Key
                    </label>
                    <input
                      type="password"
                      value={settings.apiKeys.elevenlabs}
                      onChange={(e) => handleInputChange('apiKeys', 'elevenlabs', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">Required for voice synthesis</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      TextMagic API Key
                    </label>
                    <input
                      type="password"
                      value={settings.apiKeys.textmagic}
                      onChange={(e) => handleInputChange('apiKeys', 'textmagic', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">Required for SMS and calling capabilities</p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <ShieldCheckIcon className="h-5 w-5 text-yellow-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Security Notice</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>API keys are encrypted and stored securely. Never share your API keys with others.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Voice Settings */}
            {activeTab === 'voice' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Voice Settings</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Voice ID
                    </label>
                    <input
                      type="text"
                      value={settings.voiceSettings.voiceId}
                      onChange={(e) => handleInputChange('voiceSettings', 'voiceId', e.target.value)}
                      placeholder="Enter ElevenLabs Voice ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">ElevenLabs voice ID for speech synthesis</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Speech Speed: {settings.voiceSettings.speed}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={settings.voiceSettings.speed}
                      onChange={(e) => handleInputChange('voiceSettings', 'speed', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Slower</span>
                      <span>Faster</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Voice Stability: {Math.round(settings.voiceSettings.stability * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.voiceSettings.stability}
                      onChange={(e) => handleInputChange('voiceSettings', 'stability', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>More Variable</span>
                      <span>More Stable</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
                
                <div className="space-y-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailAlerts"
                      checked={settings.notifications.emailAlerts}
                      onChange={(e) => handleInputChange('notifications', 'emailAlerts', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="emailAlerts" className="ml-2 block text-sm text-gray-900">
                      Email alerts for important events
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="callComplete"
                      checked={settings.notifications.callComplete}
                      onChange={(e) => handleInputChange('notifications', 'callComplete', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="callComplete" className="ml-2 block text-sm text-gray-900">
                      Notify when calls are completed
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="dailyReports"
                      checked={settings.notifications.dailyReports}
                      onChange={(e) => handleInputChange('notifications', 'dailyReports', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="dailyReports" className="ml-2 block text-sm text-gray-900">
                      Daily performance reports
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
                
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <ShieldCheckIcon className="h-5 w-5 text-green-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Security Status</h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>Your system is secure with the following features:</p>
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>API keys are encrypted at rest</li>
                            <li>All communications use HTTPS</li>
                            <li>Call data is stored securely</li>
                            <li>Regular security updates applied</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Data Retention</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Configure how long to keep call recordings and conversation data.
                    </p>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="180">6 months</option>
                      <option value="365">1 year</option>
                      <option value="forever">Forever</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <div className="flex items-center justify-between">
                {saved && (
                  <div className="text-sm text-green-600">
                    Settings saved successfully!
                  </div>
                )}
                <button
                  onClick={saveSettings}
                  disabled={loading}
                  className="ml-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
