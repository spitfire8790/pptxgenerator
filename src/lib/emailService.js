/**
 * Email service for sending report notifications
 * This implementation provides a localStorage-based notification system
 */

import supabase from './supabase';

/**
 * Store user notification preferences in local storage
 * @param {string} email - User's email
 * @param {boolean} enabled - Whether notifications are enabled
 */
export const saveNotificationPreference = (email, enabled) => {
  if (!email) return;
  
  try {
    const preferences = JSON.parse(localStorage.getItem('emailNotificationPreferences') || '{}');
    preferences[email] = enabled;
    localStorage.setItem('emailNotificationPreferences', JSON.stringify(preferences));
    console.log(`Saved notification preference for ${email}: ${enabled}`);
  } catch (error) {
    console.error('Error saving notification preference:', error);
  }
};

/**
 * Get user notification preference from local storage
 * @param {string} email - User's email
 * @returns {boolean} - Whether notifications are enabled for this user
 */
export const getNotificationPreference = (email) => {
  if (!email) return true; // Default to true even if no email
  
  try {
    const preferences = JSON.parse(localStorage.getItem('emailNotificationPreferences') || '{}');
    // Check if the email has a specific preference set
    if (email in preferences) {
      // Return the stored preference
      return preferences[email] === true;
    }
    // Default to true for new users
    return true;
  } catch (error) {
    console.error('Error getting notification preference:', error);
    return true; // Default to true on error
  }
};

/**
 * Save notification to localStorage instead of sending email
 * @param {Object} options - Notification options
 * @param {string} options.to - Recipient email address
 * @param {string} options.reportName - Name of the generated report
 * @param {string} options.status - Status of the report generation (success/error)
 * @param {string} options.userName - Name of the user who generated the report
 * @returns {Promise<Object>} - Response from the notification operation
 */
export const sendReportNotificationEmail = async (options) => {
  try {
    const { to, reportName, status, userName } = options;
    
    // Default values if not provided
    const subject = options.subject || 
      `Report Generation ${status === 'success' ? 'Complete' : 'Failed'}: ${reportName}`;
    
    const text = options.text || 
      `Hello ${userName},\n\n` +
      `Your report "${reportName}" has ${status === 'success' ? 'been generated successfully' : 'failed to generate'}.\n` +
      `${status === 'success' ? 'You can download it from the application.' : 'Please try again or contact support if the issue persists.'}\n\n` +
      `Generated at: ${new Date().toLocaleString()}\n\n` +
      `Thank you for using our Report Generator!`;
    
    // Log the notification content
    console.log('==========NOTIFICATION SAVED==========');
    console.log(`FOR USER: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log('BODY:');
    console.log(text);
    console.log('=====================================');
    
    // Store notifications in localStorage for persistence between sessions
    try {
      const notifications = JSON.parse(localStorage.getItem('userNotifications') || '[]');
      notifications.push({
        id: Date.now().toString(), // Unique ID for the notification
        to,
        subject,
        text,
        timestamp: new Date().toISOString(),
        reportName,
        status,
        read: false // Track read status
      });
      localStorage.setItem('userNotifications', JSON.stringify(notifications));
    } catch (error) {
      console.warn('Could not store notification in localStorage:', error);
    }
    
    return { 
      success: true, 
      message: 'Notification saved (will be displayed when user returns to the application)'
    };
  } catch (error) {
    console.error('Error saving notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all notifications for a user
 * @param {string} email - User's email
 * @returns {Array} - Array of notifications
 */
export const getUserNotifications = (email) => {
  if (!email) return [];
  
  try {
    const notifications = JSON.parse(localStorage.getItem('userNotifications') || '[]');
    return notifications.filter(notification => notification.to === email);
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - ID of the notification to mark as read
 * @returns {boolean} - Whether the operation was successful
 */
export const markNotificationAsRead = (notificationId) => {
  try {
    const notifications = JSON.parse(localStorage.getItem('userNotifications') || '[]');
    const updatedNotifications = notifications.map(notification => {
      if (notification.id === notificationId) {
        return { ...notification, read: true };
      }
      return notification;
    });
    localStorage.setItem('userNotifications', JSON.stringify(updatedNotifications));
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Check if notification system is available
 * @returns {Promise<boolean>} - Whether notifications are available
 */
export const isEmailServiceAvailable = async () => {
  // Always return true since we're using localStorage
  return true;
};
