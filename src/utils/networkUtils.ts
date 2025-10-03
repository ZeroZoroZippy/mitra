// Network connectivity utilities for better offline handling
import React from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isFirebaseConnected: boolean;
  lastConnectedAt?: Date;
}

class NetworkMonitor {
  private listeners: Array<(status: NetworkStatus) => void> = [];
  private currentStatus: NetworkStatus = {
    isOnline: navigator.onLine,
    isFirebaseConnected: false,
  };

  constructor() {
    this.setupEventListeners();
    this.checkFirebaseConnection();
  }

  private setupEventListeners() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline() {
    console.log('Network connection restored');
    this.updateStatus({ isOnline: true });
    this.checkFirebaseConnection();
  }

  private handleOffline() {
    console.log('Network connection lost');
    this.updateStatus({
      isOnline: false,
      isFirebaseConnected: false
    });
  }

  private async checkFirebaseConnection() {
    try {
      // Dynamic import to avoid circular dependencies
      const { isFirebaseConnected } = await import('./firebaseConfig');
      const connected = await isFirebaseConnected();

      this.updateStatus({
        isFirebaseConnected: connected,
        lastConnectedAt: connected ? new Date() : this.currentStatus.lastConnectedAt
      });
    } catch (error) {
      console.warn('Firebase connection check failed:', error);
      this.updateStatus({ isFirebaseConnected: false });
    }
  }

  private updateStatus(updates: Partial<NetworkStatus>) {
    this.currentStatus = { ...this.currentStatus, ...updates };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentStatus);
      } catch (error) {
        console.error('Network status listener error:', error);
      }
    });
  }

  public subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);

    // Immediately notify with current status
    listener(this.currentStatus);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  public async retryFirebaseConnection(): Promise<boolean> {
    if (!this.currentStatus.isOnline) {
      console.log('Cannot retry Firebase connection - device is offline');
      return false;
    }

    console.log('Attempting to reconnect to Firebase...');
    try {
      const { handleFirebaseOnline } = await import('./firebaseConfig');
      await handleFirebaseOnline();
      await this.checkFirebaseConnection();
      return this.currentStatus.isFirebaseConnected;
    } catch (error) {
      console.error('Firebase reconnection failed:', error);
      return false;
    }
  }

  public destroy() {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    this.listeners = [];
  }
}

// Singleton instance
export const networkMonitor = new NetworkMonitor();

// React hook for network status
export const useNetworkStatus = () => {
  const [status, setStatus] = React.useState<NetworkStatus>(networkMonitor.getStatus());

  React.useEffect(() => {
    const unsubscribe = networkMonitor.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return status;
};

// Utility functions for common network checks
export const isOffline = (): boolean => {
  return !networkMonitor.getStatus().isOnline;
};

export const isFirebaseOffline = (): boolean => {
  return !networkMonitor.getStatus().isFirebaseConnected;
};

export const waitForConnection = (timeout: number = 10000): Promise<boolean> => {
  return new Promise((resolve) => {
    const status = networkMonitor.getStatus();

    if (status.isOnline && status.isFirebaseConnected) {
      resolve(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, timeout);

    const unsubscribe = networkMonitor.subscribe((newStatus) => {
      if (newStatus.isOnline && newStatus.isFirebaseConnected) {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(true);
      }
    });
  });
};

// Error retry utility with exponential backoff
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry if we're offline
      if (isOffline()) {
        throw new Error('Device is offline. Please check your internet connection.');
      }

      // Don't retry on certain Firebase errors
      if (error.code === 'auth/popup-closed-by-user' ||
          error.code === 'auth/cancelled-popup-request') {
        throw error;
      }

      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};