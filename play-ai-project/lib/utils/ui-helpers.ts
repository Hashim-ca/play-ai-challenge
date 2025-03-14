/**
 * UI helper functions for common tasks
 */

/**
 * Creates an accessible announcement for screen readers
 * 
 * @param message - The message to announce
 * @param duration - How long to keep the element in the DOM (ms)
 * @param ariaLive - ARIA live setting (polite or assertive)
 */
export function announceToScreenReader(
  message: string, 
  duration = 3000, 
  ariaLive: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', ariaLive);
  announcement.classList.add('sr-only');
  announcement.textContent = message;
  document.body.appendChild(announcement);
  
  // Remove announcement after it's been read
  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, duration);
}

/**
 * Shows a toast notification
 * 
 * @param message - The message to show
 * @param type - The type of notification (success, error, info)
 * @param duration - How long to show the notification (ms)
 */
export function showNotification(
  message: string, 
  type: 'success' | 'error' | 'info' = 'info',
  duration = 3000
) {
  // Create the notification element
  const notification = document.createElement('div');
  
  // Set appropriate styling based on type
  const baseClasses = 'fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom';
  
  switch (type) {
    case 'success':
      notification.className = `${baseClasses} bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100`;
      break;
    case 'error':
      notification.className = `${baseClasses} bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100`;
      break;
    case 'info':
    default:
      notification.className = `${baseClasses} bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100`;
      break;
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Announce to screen readers as well
  announceToScreenReader(message);
  
  // Remove notification after the specified duration
  setTimeout(() => {
    if (document.body.contains(notification)) {
      // Add fade-out animation
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s ease-out';
      
      // Remove after animation finishes
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 500);
    }
  }, duration);
}

/**
 * Formats byte size to human readable string
 */
export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Truncates string to a maximum length
 */
export function truncateString(str: string, maxLength: number) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}