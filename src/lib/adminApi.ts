// src/lib/adminApi.ts
// Admin API service for accessing user data and reports

export interface AdminUser {
  userId: string;
  email: string;
  name: string;
  subscriptionStatus: string;
  planName: string;
  planExpiry?: string;
  leaseExpiry?: string;
  lastLogin?: string;
  createdAt: string;
  rentReportsCount: number;
  lastRentReport?: string;
}

export interface RentReportSummary {
  month: string;
  year: number;
  totalUsers: number;
  reportedUsers: number;
  nonReportedUsers: number;
  reports: Array<{
    userId: string;
    userEmail: string;
    userName: string;
    paymentDate: string;
    rentAmount: number;
    status: "Reported" | "Late";
  }>;
}

export interface SubscriptionSummary {
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiringSubscriptions: number;
  planBreakdown: {
    silver: number;
    gold: number;
    bronze: number;
  };
  expiringSoon: AdminUser[];
}

export interface LeaseSummary {
  totalLeases: number;
  expiringLeases: number;
  expiredLeases: number;
  expiringSoon: AdminUser[];
}

class AdminApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl =
      import.meta.env.VITE_ADMIN_API_BASE_URL ||
      "https://pczfhqlzkb.execute-api.us-west-2.amazonaws.com/admin";
    this.token = localStorage.getItem("adminToken");
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    console.log(`🔗 AdminAPI: Making request to ${endpoint}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ AdminAPI: Successfully fetched ${endpoint}`, data);
      return data;
    } catch (error) {
      console.error(`❌ AdminAPI: Error fetching ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication - now uses Cognito tokens
  async verifyToken() {
    return this.makeRequest("/verify");
  }

  // Rent Reports
  async getRentReports(): Promise<RentReportSummary[]> {
    return this.makeRequest("/rent-reports");
  }

  async getRentReportsForMonth(
    year: number,
    month: number
  ): Promise<RentReportSummary> {
    return this.makeRequest(`/rent-reports/${year}/${month}`);
  }

  // Users
  async getAllUsers(): Promise<AdminUser[]> {
    return this.makeRequest("/users");
  }

  async getUserById(userId: string): Promise<AdminUser> {
    return this.makeRequest(`/users/${userId}`);
  }

  async searchUsers(query: string): Promise<AdminUser[]> {
    return this.makeRequest(`/users/search?q=${encodeURIComponent(query)}`);
  }

  // Subscriptions
  async getSubscriptionSummary(): Promise<SubscriptionSummary> {
    return this.makeRequest("/subscriptions/summary");
  }

  async getExpiringSubscriptions(days: number = 30): Promise<AdminUser[]> {
    return this.makeRequest(`/subscriptions/expiring?days=${days}`);
  }

  // Leases
  async getLeaseSummary(): Promise<LeaseSummary> {
    return this.makeRequest("/leases/summary");
  }

  async getExpiringLeases(days: number = 30): Promise<AdminUser[]> {
    return this.makeRequest(`/leases/expiring?days=${days}`);
  }

  // Analytics
  async getDashboardStats() {
    return this.makeRequest("/dashboard/stats");
  }

  async getUserGrowth(startDate: string, endDate: string) {
    return this.makeRequest(
      `/analytics/user-growth?start=${startDate}&end=${endDate}`
    );
  }

  async getRevenueStats(startDate: string, endDate: string) {
    return this.makeRequest(
      `/analytics/revenue?start=${startDate}&end=${endDate}`
    );
  }

  // Notifications
  async sendBulkNotification(
    userIds: string[],
    message: string,
    type: "email" | "sms" = "email"
  ) {
    return this.makeRequest("/notifications/bulk", {
      method: "POST",
      body: JSON.stringify({ userIds, message, type }),
    });
  }

  async sendLeaseExpiryReminder(userId: string) {
    return this.makeRequest(`/notifications/lease-expiry/${userId}`, {
      method: "POST",
    });
  }

  async sendSubscriptionExpiryReminder(userId: string) {
    return this.makeRequest(`/notifications/subscription-expiry/${userId}`, {
      method: "POST",
    });
  }

  // Logout
  logout() {
    this.token = null;
    localStorage.removeItem("adminToken");
  }
}

// Export singleton instance
export const adminApi = new AdminApiService();
export default adminApi;
