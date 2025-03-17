import React, { useState, useEffect } from 'react';
import { getUserNotifications, markNotificationAsRead } from '../lib/emailService';
import { Bell, X, Check, AlertCircle } from 'lucide-react';

const NotificationCenter = ({ userEmail }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Load notifications whenever the component mounts or userEmail changes
    if (userEmail) {
      loadNotifications();
    }

    // Set up an interval to periodically check for new notifications
    const intervalId = setInterval(() => {
      if (userEmail && isActive) {
        loadNotifications();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, [userEmail, isActive]);

  const loadNotifications = () => {
    const userNotifications = getUserNotifications(userEmail);
    setNotifications(userNotifications);

    // Count unread notifications
    const unread = userNotifications.filter(notification => !notification.read).length;
    setUnreadCount(unread);
  };

  const handleNotificationClick = (notificationId) => {
    const success = markNotificationAsRead(notificationId);
    if (success) {
      loadNotifications(); // Reload to update UI
    }
  };

  const handleMarkAllAsRead = () => {
    const unreadNotifications = notifications.filter(notification => !notification.read);
    let allSuccess = true;

    unreadNotifications.forEach(notification => {
      const success = markNotificationAsRead(notification.id);
      if (!success) {
        allSuccess = false;
      }
    });

    if (allSuccess && unreadNotifications.length > 0) {
      loadNotifications(); // Reload to update UI
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  const toggleActive = () => {
    setIsActive(!isActive);
    // If activating notifications, load them immediately
    if (!isActive) {
      loadNotifications();
    }
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        className="bg-transparent border-none cursor-pointer relative p-2 rounded-full flex items-center justify-center"
        onClick={togglePanel}
        onContextMenu={(e) => {
          e.preventDefault();
          toggleActive();
          return false;
        }}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell
          size={20}
          className={isActive ? "text-blue-600" : "text-gray-800"}
        />
        {unreadCount > 0 && isActive && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-panel absolute top-12 right-0 w-80 max-h-[400px] bg-white shadow-lg rounded-lg z-50 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-200 font-bold flex justify-between items-center">
            <span>Notifications {isActive ? '' : '(Disabled)'}</span>
            <div className="flex items-center space-x-2">
              {isActive && unreadCount > 0 && (
                <button
                  className="text-xs text-blue-600 hover:text-blue-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAllAsRead();
                  }}
                  title="Mark all as read"
                >
                  Read all
                </button>
              )}
              <button
                className={`p-1 rounded-full ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleActive();
                }}
                title={isActive ? "Disable notifications" : "Enable notifications"}
              >
                <Bell size={16} />
              </button>
              <button
                className="bg-transparent border-none cursor-pointer flex items-center justify-center p-1"
                onClick={closePanel}
                aria-label="Close notifications"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <ul className="overflow-y-auto p-0 m-0 list-none flex-grow max-h-[320px]">
            {!isActive ? (
              <li className="py-8 px-4 text-center text-gray-500">
                <p>Notifications are disabled</p>
                <button
                  className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActive();
                  }}
                >
                  Enable
                </button>
              </li>
            ) : notifications.length === 0 ? (
              <li className="py-8 px-4 text-center text-gray-500">
                <p>No notifications yet</p>
              </li>
            ) : (
              notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((notification) => (
                <li
                  key={notification.id}
                  className={`p-3 border-b border-gray-200 relative cursor-pointer transition-colors
                    ${notification.read ? '' : 'bg-blue-50'} 
                    ${notification.status === 'success' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}`}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <h4 className="m-0 mb-1 font-bold text-sm">
                    {notification.status === 'success' ? (
                      <Check size={16} className="mr-2 inline-flex align-middle" color="#2ed573" />
                    ) : (
                      <AlertCircle size={16} className="mr-2 inline-flex align-middle" color="#ff4757" />
                    )}
                    {notification.subject}
                  </h4>
                  <p className="m-0 text-sm text-gray-600 whitespace-pre-wrap">
                    {notification.text.split('\n\n')[0]}
                  </p>
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                    <span>{formatDate(notification.timestamp)}</span>
                    {!notification.read && <span className="text-blue-500">New</span>}
                  </div>
                </li>
              ))
            )}
          </ul>

          <div className="p-2 border-t border-gray-200 text-xs text-center text-gray-500">
            Notifications
          </div>
        </div>
      )}

      <style jsx>{`
        .notification-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background-color: #ff4757;
          color: white;
          font-size: 10px;
          font-weight: bold;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
};

export default NotificationCenter; 