import axiosInstance from './axiosConfig';

export const societyCustomerService = {
  // 1. Paginated list of society customers & merchants with summary stats
  list: async (params) => {
    const response = await axiosInstance.get('/v1/society/customers', { params });
    return response.data;
  },

  // 2. Detailed member view (full loans, pigmy, EMI card, bank details)
  getById: async (id, params) => {
    const response = await axiosInstance.get(`/v1/society/customers/${id}`, { params });
    return response.data;
  },

  // 3. Active members dropdown selection list
  getDropdown: async () => {
    const response = await axiosInstance.get('/v1/society/customers/dropdown');
    return response.data;
  },

  // 4. Link Society Account to Customer / Member
  linkSocietyAccount: async (id, payload) => {
    const response = await axiosInstance.post(`/v1/society/customers/${id}/society-account`, payload);
    return response.data;
  },

  // 5. Initiate Loan Payment Order / Link (Society Panel Desk)
  initiateLoanPayment: async (customerId, loanId, payload) => {
    const response = await axiosInstance.post(`/v1/society/customers/${encodeURIComponent(customerId)}/loans/${encodeURIComponent(loanId)}/payment/initiate`, payload);
    return response.data;
  },

  // 6. Verify Customer Loan Payment & Route to Society Account
  verifyLoanPayment: async (customerId, loanId, payload) => {
    const response = await axiosInstance.post(`/v1/society/customers/${encodeURIComponent(customerId)}/loans/${encodeURIComponent(loanId)}/payment/verify`, payload);
    return response.data;
  },

  // 7. Initiate Customer Loan e-Mandate Registration
  initiateLoanMandate: async (customerId, loanId, payload) => {
    const response = await axiosInstance.post(`/v1/society/customers/${customerId}/loans/${loanId}/mandate/initiate`, payload);
    return response.data;
  },

  // 8. View Customer Loan Collections Ledger
  getLoanCollections: async (customerId, loanId, params) => {
    const response = await axiosInstance.get(`/v1/society/customers/${encodeURIComponent(customerId)}/loans/${encodeURIComponent(loanId)}/collections`, { params });
    return response.data;
  },
};
