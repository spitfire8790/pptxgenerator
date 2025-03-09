import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';

const UserStatusList = ({ users }) => {
  // Filter out duplicate users and sort by status
  const uniqueUsers = users.reduce((acc, current) => {
    const x = acc.find(item => item.email === current.email);
    if (!x) {
      return acc.concat([current]);
    } else {
      // Update existing user's status if needed
      if (x.status !== current.status) {
        x.status = current.status;
      }
      return acc;
    }
  }, []);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1 text-gray-500">
        <Users size={16} />
        <span className="text-sm">{uniqueUsers.length} active</span>
      </div>
      <div className="flex gap-2">
        <AnimatePresence>
          {uniqueUsers.map((user) => (
            <motion.div
              key={user.email}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full"
            >
              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                  user.status === 'online' ? 'bg-green-400' :
                  user.status === 'generating' ? 'bg-yellow-400' :
                  'bg-gray-400'
                }`} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  {user.name || user.email}
                </span>
                <span className="text-xs text-gray-500">
                  {user.status === 'online' ? 'Online' :
                   user.status === 'generating' ? 'Generating Report' :
                   'Offline'}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default UserStatusList; 