import axiosInstance from './axiosConfig';

/**
 * Society Panel Pigmy Deposit Management V2 API Service
 * Connects to Advita-Backend REST endpoints under /v1/society/pigmy-customers (and alias /v1/society/pigmy)
 * (proxied via /api to devapi.sahayaone.com)
 */
export const pigmyService = {
  /**
   * 1. List Pigmy Customers
   * GET /api/v1/society/pigmy-customers or /api/v1/society/pigmy
   * Supports: page, limit, search, customerType, savingsAccountOption, approvalStatus, status, branchId, fromDate, toDate, sortBy, sortOrder
   * @param {Object} params
   */
  list: async (params = {}) => {
    const query = { ...params };

    // Normalize approvalStatus if caller sends 'PENDING'
    if (query.approvalStatus === 'PENDING') {
      query.approvalStatus = 'PENDING_BRANCH_APPROVAL';
    }

    // Normalize date filters to fromDate and toDate as per API spec
    if (query.startDate && !query.fromDate) {
      query.fromDate = query.startDate;
    }
    if (query.endDate && !query.toDate) {
      query.toDate = query.endDate;
    }

    try {
      const response = await axiosInstance.get('/v1/society/pigmy-customers', { params: query });
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        const fallbackRes = await axiosInstance.get('/v1/society/pigmy', { params: query });
        return fallbackRes.data;
      }
      throw err;
    }
  },

  /**
   * 2. Get Pigmy Customer Details
   * GET /api/v1/society/pigmy-customers/:id or /api/v1/society/pigmy/:id
   * @param {string} id - Pigmy customer ObjectId, Code, Account Number, or Phone Number
   */
  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/v1/society/pigmy-customers/${id}`);
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        const fallbackRes = await axiosInstance.get(`/v1/society/pigmy/${id}`);
        return fallbackRes.data;
      }
      throw err;
    }
  },

  /**
   * 2b. Create Pigmy Customer (Standard/Fallback)
   * POST /api/v1/society/pigmy-customers
   * @param {Object|FormData} formData
   */
  create: async (formData) => {
    const isFormData = typeof FormData !== 'undefined' && formData instanceof FormData;
    const response = await axiosInstance.post('/v1/society/pigmy-customers', formData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  /**
   * API 4: Fetch Active SIP Schemes
   * GET /api/v1/employee/pigmy-customers/schemes
   */
  fetchActiveSchemes: async () => {
    const response = await axiosInstance.get('/v1/employee/pigmy-customers/schemes');
    return response.data;
  },

  /**
   * API 5: Submit Pigmy Customer Onboarding (Multipart Form-Data)
   * POST /api/v1/employee/pigmy-customers/onboard
   */
  onboardPigmyCustomer: async (formData) => {
    const isFormData = typeof FormData !== 'undefined' && formData instanceof FormData;
    const response = await axiosInstance.post('/v1/employee/pigmy-customers/onboard', formData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  /**
   * Create a Razorpay order for a Pigmy collection.
   * POST /api/v1/society/pigmy/:id/payment/initiate
   */
  initiateCollection: async (id, payload) => {
    const response = await axiosInstance.post(`/v1/society/pigmy/${encodeURIComponent(id)}/payment/initiate`, payload);
    return response.data;
  },

  /**
   * Verify a Razorpay Pigmy collection payment.
   * POST /api/v1/society/pigmy/:id/payment/verify
   */
  verifyCollectionPayment: async (id, payload) => {
    const response = await axiosInstance.post(`/v1/society/pigmy/${encodeURIComponent(id)}/payment/verify`, payload);
    return response.data;
  },

  /**
   * Initiate a Pigmy e-NACH / UPI Autopay mandate.
   * POST /api/v1/society/pigmy/:id/mandate/initiate
   */
  initiateMandate: async (id, payload) => {
    const response = await axiosInstance.post(`/v1/society/pigmy/${encodeURIComponent(id)}/mandate/initiate`, payload);
    return response.data;
  },

  /**
   * Get a Pigmy customer's collection ledger.
   * GET /api/v1/society/pigmy/:id/collections
   */
  getCollections: async (id, params = {}) => {
    const response = await axiosInstance.get(`/v1/society/pigmy/${encodeURIComponent(id)}/collections`, { params });
    return response.data;
  },

  /**
   * 3. Add / Link Society Bank Account Details
   * POST /api/v1/society/pigmy-customers/:id/society-account
   * or fallback to POST /api/v1/society/pigmy-customers/society-account
   * @param {string} id - Pigmy Customer ID
   * @param {Object} data - { societyAccountNumber, ifscCode, accountHolderName, bankBranchName, pincode, pigmyCustomerId }
   */
  addSocietyAccount: async (id, data = {}) => {
    const payload = {
      ...data,
      pigmyCustomerId: id || data.pigmyCustomerId
    };

    if (id) {
      try {
        const response = await axiosInstance.post(`/v1/society/pigmy-customers/${id}/society-account`, payload);
        return response.data;
      } catch (err) {
        if (err.response?.status === 404) {
          const fallbackRes = await axiosInstance.post('/v1/society/pigmy-customers/society-account', payload);
          return fallbackRes.data;
        }
        throw err;
      }
    } else {
      const response = await axiosInstance.post('/v1/society/pigmy-customers/society-account', payload);
      return response.data;
    }
  },

  /**
   * 4. Branch Manager / QC Employee Approval (With Account Check)
   * POST /api/v1/society/pigmy-customers/:id/approve or /api/v1/society/pigmy/:id/approve
   * Mandatory rule: Customer must have societyAccountNumber present
   * @param {string} id - Pigmy Customer ID
   * @param {Object} data - { remarks?: string }
   */
  approve: async (id, data = {}) => {
    try {
      const response = await axiosInstance.post(`/v1/society/pigmy-customers/${id}/approve`, data);
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        const fallbackRes = await axiosInstance.post(`/v1/society/pigmy/${id}/approve`, data);
        return fallbackRes.data;
      }
      throw err;
    }
  },

  /**
   * 5. Branch Manager / QC Employee Rejection
   * POST /api/v1/society/pigmy-customers/:id/reject or /api/v1/society/pigmy/:id/reject
   * Mandatory rule: Rejection reason is required
   * @param {string} id - Pigmy Customer ID
   * @param {Object} data - { reason: string }
   */
  reject: async (id, data) => {
    try {
      const response = await axiosInstance.post(`/v1/society/pigmy-customers/${id}/reject`, data);
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        const fallbackRes = await axiosInstance.post(`/v1/society/pigmy/${id}/reject`, data);
        return fallbackRes.data;
      }
      throw err;
    }
  }
};

export default pigmyService;
