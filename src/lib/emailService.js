/**
 * Email service for sending report notifications
 * This implementation provides a fallback approach that works without Supabase Edge Functions
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
  if (!email) return false;
  
  try {
    const preferences = JSON.parse(localStorage.getItem('emailNotificationPreferences') || '{}');
    return preferences[email] === true;
  } catch (error) {
    console.error('Error getting notification preference:', error);
    return false;
  }
};

/**
 * Log email notifications while we wait for a real email service
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email content
 * @param {string} options.html - HTML email content
 * @param {string} options.reportName - Name of the generated report
 * @param {string} options.status - Status of the report generation (success/error)
 * @param {string} options.userName - Name of the user who generated the report
 * @returns {Promise<Object>} - Response from the email sending operation
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
    
    // While we wait for real email service, log the email content
    console.log('==========EMAIL NOTIFICATION==========');
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log('BODY:');
    console.log(text);
    console.log('====================================');
    
    // Store this in the browser's session storage for demo purposes
    try {
      const sentEmails = JSON.parse(sessionStorage.getItem('sentEmailNotifications') || '[]');
      sentEmails.push({
        to,
        subject,
        text,
        timestamp: new Date().toISOString(),
        reportName,
        status
      });
      sessionStorage.setItem('sentEmailNotifications', JSON.stringify(sentEmails));
    } catch (error) {
      console.warn('Could not store email in session storage:', error);
    }
    
    // In a real implementation, we would call an email API here
    // For now, we'll simulate a successful email send
    return { success: true, message: 'Email notification logged (no actual email sent)' };
  } catch (error) {
    console.error('Error logging email notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if email notifications are configured and available
 * @returns {Promise<boolean>} - Whether email sending is available
 */
export const isEmailServiceAvailable = async () => {
  // In this implementation, we'll always return true
  // In a real implementation, we would check if the email service is configured
  return true;
};
