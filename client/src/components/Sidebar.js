import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Conversations', href: '/conversations', icon: ChatBubbleLeftRightIcon },
    { name: 'Leads', href: '/leads', icon: UserGroupIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
  ];

  const isActive = (href) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col w-64 bg-gray-900">
      <div className="flex items-center justify-center h-16 px-4 bg-gray-800">
        <div className="flex items-center space-x-2">
          <PhoneIcon className="h-8 w-8 text-blue-500" />
          <span className="text-white text-lg font-semibold">Voice Sales AI</span>
        </div>
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                isActive(item.href)
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Icon
                className={`mr-3 h-6 w-6 flex-shrink-0 ${
                  isActive(item.href) ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="flex-shrink-0 p-4 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          Voice Sales AI v1.0.0
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
