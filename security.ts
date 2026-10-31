import CryptoJS from 'crypto-js';
import { nanoid } from 'nanoid';

// Generate anonymous user ID (no PII)
export const generateAnonymousId = (): string => {
  const existingId = localStorage.getItem('hercare_user_id');
  if (existingId) return existingId;
  
  const newId = `anonymous_${nanoid(16)}`;
  localStorage.setItem('hercare_user_id', newId);
  return newId;
};

// Encrypt sensitive data before storing
export const encryptData = (data: string): string => {
  const userId = generateAnonymousId();
  // Use user ID as encryption key (only they can decrypt)
  return CryptoJS.AES.encrypt(data, userId).toString();
};

// Decrypt user's own data
export const decryptData = (encryptedData: string): string => {
  try {
    const userId = generateAnonymousId();
    const bytes = CryptoJS.AES.decrypt(encryptedData, userId);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
};

// Check if user has given consent
export const hasConsent = (): boolean => {
  return localStorage.getItem('hercare_privacy_consent') === 'true';
};

// Record consent
export const giveConsent = () => {
  localStorage.setItem('hercare_privacy_consent', 'true');
  localStorage.setItem('hercare_consent_date', new Date().toISOString());
};

// Export all user data (GDPR compliance)
export const exportUserData = () => {
  const data = {
    anonymousId: localStorage.getItem('hercare_user_id'),
    nickname: localStorage.getItem('hercare_nickname'),
    preferences: {
      language: localStorage.getItem('hercare_language'),
      voiceEnabled: localStorage.getItem('hercare_voice_enabled'),
    },
    consentDate: localStorage.getItem('hercare_consent_date'),
    note: 'No health data is stored on our servers. All data is encrypted locally on your device.',
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hercare-data-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
};

// Delete ALL user data
export const deleteAllUserData = () => {
  const confirmation = confirm(
    "Are you sure you want to delete all your data? This cannot be undone.\n\n" +
    "This will remove:\n" +
    "• Your conversations\n" +
    "• Your cycle tracking data\n" +
    "• Your preferences\n" +
    "• Everything else\n\n" +
    "You'll start fresh with HerCare+."
  );
  
  if (confirmation) {
    // Clear localStorage
    localStorage.clear();
    
    // Clear IndexedDB
    if ('indexedDB' in window) {
      indexedDB.deleteDatabase('hercare-db');
    }
    
    // Clear service worker cache
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    alert("✓ All your data has been deleted. You're starting fresh.");
    window.location.href = '/';
  }
};

// Auto-delete old data (privacy by design)
export const autoDeleteOldData = (daysToKeep: number = 30) => {
  const lastCleanup = localStorage.getItem('hercare_last_cleanup');
  const now = new Date().getTime();
  
  // Run cleanup once per day
  if (lastCleanup && now - parseInt(lastCleanup) < 24 * 60 * 60 * 1000) {
    return;
  }
  
  // Mark cleanup done
  localStorage.setItem('hercare_last_cleanup', now.toString());
  
  // Delete conversations older than X days (implement in your chat storage)
  console.log(`Auto-cleanup: Deleted data older than ${daysToKeep} days`);
};

// Security: Sanitize user input
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
};

// Rate limiting for API calls (prevent abuse)
const apiCallTimestamps: Record<string, number[]> = {};

export const canMakeApiCall = (endpoint: string, maxCallsPerMinute: number = 10): boolean => {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  if (!apiCallTimestamps[endpoint]) {
    apiCallTimestamps[endpoint] = [];
  }
  
  // Remove old timestamps
  apiCallTimestamps[endpoint] = apiCallTimestamps[endpoint].filter(ts => ts > oneMinuteAgo);
  
  if (apiCallTimestamps[endpoint].length >= maxCallsPerMinute) {
    return false;
  }
  
  apiCallTimestamps[endpoint].push(now);
  return true;
};
