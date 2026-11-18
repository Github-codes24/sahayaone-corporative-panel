import axiosInstance from './axiosConfig';

export const othersReceiptService = {
  /**
   * Fetch dropdown options for section and dependent type lists
   * GET /v1/society/others-receipts/options (or /sections)
   */
  getOptions: async () => {
    try {
      const response = await axiosInstance.get('/v1/society/others-receipts/options').catch(() => 
        axiosInstance.get('/v1/society/others-receipts/sections')
      );
      return response.data;
    } catch (error) {
      // Return default dynamic section & type mapping if endpoint unavailable
      return {
        success: true,
        data: {
          sections: [
            {
              name: 'Account section',
              types: ['Saving account', 'Current account', 'FD account', 'Pigmy account', 'RD Account']
            },
            {
              name: 'Loan section',
              types: ['Gold loan', 'Bike loan', 'mortgage loan', 'FD against Loan', 'personal loan']
            }
          ]
        }
      };
    }
  },

  /**
   * Fetch locations for filtering
   * GET /v1/society/others-receipts/locations
   */
  getLocations: async () => {
    try {
      const response = await axiosInstance.get('/v1/society/others-receipts/locations').catch(() => 
        axiosInstance.get('/v1/society/credit-receipts/locations')
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Export Others Receipts as CSV
   * GET /v1/society/others-receipts/export?section=...&type=...&search=...&status=...&dateFrom=...&dateTo=...
   * @param {Object} params - Filter parameters
   */
  exportCsv: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/v1/society/others-receipts/export', {
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * List Others Receipts with pagination & filters
   * GET /v1/society/others-receipts?page=1&limit=10&section=...&type=...&search=...&status=...
   * @param {Object} params - Query parameters (page, limit, section, type, search, status, branchId, dateFrom, dateTo)
   */
  list: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/v1/society/others-receipts', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create Others Receipt (supports multipart image upload and new section & type fields)
   * POST /v1/society/others-receipts
   * @param {Object|FormData} data - Form data with receipt details (name, glHead, glHeadName, accountNumber, section, type, amount, date)
   */
  create: async (data) => {
    try {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const response = await axiosInstance.post('/v1/society/others-receipts', data, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get Single Others Receipt by ID
   * GET /v1/society/others-receipts/:id
   * @param {string|number} id - Receipt ID
   */
  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/v1/society/others-receipts/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update Others Receipt
   * PUT /v1/society/others-receipts/:id
   * @param {string|number} id - Receipt ID
   * @param {Object|FormData} data - Fields to update
   */
  update: async (id, data) => {
    try {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const response = await axiosInstance.put(`/v1/society/others-receipts/${id}`, data, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Approve Others Receipt
   * PUT /v1/society/others-receipts/:id/approve
   * @param {string|number} id - Receipt ID
   */
  approve: async (id) => {
    try {
      const response = await axiosInstance.put(`/v1/society/others-receipts/${id}/approve`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Reject Others Receipt with reason
   * PUT /v1/society/others-receipts/:id/reject
   * @param {string|number} id - Receipt ID
   * @param {string} rejectionReason - Reason for rejection
   */
  reject: async (id, rejectionReason) => {
    try {
      const response = await axiosInstance.put(`/v1/society/others-receipts/${id}/reject`, { rejectionReason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Soft Delete Others Receipt
   * DELETE /v1/society/others-receipts/:id
   * @param {string|number} id - Receipt ID
   */
  delete: async (id) => {
    try {
      const response = await axiosInstance.delete(`/v1/society/others-receipts/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default othersReceiptService;
