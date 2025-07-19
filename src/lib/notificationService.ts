// Notification Service for ServeNow
// Handles both desktop and mobile notifications with proper fallbacks

interface NotificationData {
  title: string;
  body: string;
  tag?: string;
  data?: any;
}

class NotificationService {
  private isSupported: boolean;
  private permission: NotificationPermission;
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = this.isSupported ? Notification.permission : 'denied';
  }

  // Initialize the notification service
  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('[NotificationService] Notifications not supported');
      return false;
    }

    try {
      // Register service worker for mobile support
      if ('serviceWorker' in navigator) {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[NotificationService] Service Worker registered:', this.registration);
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Failed to initialize:', error);
      return false;
    }
  }

  // Request notification permission (only call after user interaction)
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    try {
      this.permission = await Notification.requestPermission();
      console.log('[NotificationService] Permission result:', this.permission);
      return this.permission;
    } catch (error) {
      console.error('[NotificationService] Permission request failed:', error);
      return 'denied';
    }
  }

  // Get current permission status
  getPermission(): NotificationPermission {
    return this.permission;
  }

  // Check if notifications are supported and permitted
  canShowNotifications(): boolean {
    return this.isSupported && this.permission === 'granted';
  }

  // Show notification (works on both desktop and mobile)
  async showNotification(data: NotificationData): Promise<boolean> {
    if (!this.canShowNotifications()) {
      console.log('[NotificationService] Cannot show notifications - not supported or not permitted');
      return false;
    }

    try {
      // Try service worker notification first (better for mobile)
      if (this.registration) {
        await this.registration.showNotification(data.title, {
          body: data.body,
          icon: '/vite.svg',
          badge: '/vite.svg',
          tag: data.tag || 'servenow-notification',
          requireInteraction: false,
          silent: false,
          data: data.data || {}
        });
        console.log('[NotificationService] Service Worker notification shown');
        return true;
      }

      // Fallback to basic Notification API (desktop)
      if ('Notification' in window) {
        const notification = new Notification(data.title, {
          body: data.body,
          icon: '/vite.svg',
          tag: data.tag || 'servenow-notification'
        });

        // Auto-close after 10 seconds
        setTimeout(() => {
          notification.close();
        }, 10000);

        // Handle click
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        console.log('[NotificationService] Basic notification shown');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[NotificationService] Failed to show notification:', error);
      return false;
    }
  }

  // Show a test notification
  async showTestNotification(): Promise<boolean> {
    return this.showNotification({
      title: 'ServeNow Test',
      body: 'This is a test notification to verify the system is working!',
      tag: 'test-notification'
    });
  }

  // Show cook notification
  async showCookNotification(orderId: string, tableNumber: number): Promise<boolean> {
    return this.showNotification({
      title: 'ServeNow',
      body: `👨‍🍳 New dish assigned to prepare! (Order #${orderId}, Table ${tableNumber})`,
      tag: `cook-task-${orderId}-${tableNumber}`,
      data: { type: 'cook', orderId, tableNumber }
    });
  }

  // Show waiter notification
  async showWaiterNotification(orderId: string, tableNumber: number): Promise<boolean> {
    return this.showNotification({
      title: 'ServeNow',
      body: `🧑‍🍽️ New table to serve! (Order #${orderId}, Table ${tableNumber})`,
      tag: `waiter-task-${orderId}-${tableNumber}`,
      data: { type: 'waiter', orderId, tableNumber }
    });
  }

  // Check if running on mobile
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Get device capabilities
  getDeviceInfo() {
    return {
      isSupported: this.isSupported,
      permission: this.permission,
      isMobile: this.isMobile(),
      hasServiceWorker: 'serviceWorker' in navigator,
      hasPushManager: 'PushManager' in window
    };
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService; 