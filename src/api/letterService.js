import axiosInstance from './axiosConfig';

/**
 * Helper to perform letter generation requests
 * Supports both JSON response (metadata + S3 fileUrl) and direct binary PDF stream.
 * Automatically tries alternative endpoint fallbacks if primary path returns 404 or 405.
 */
const postLetterRequest = async (path, data, options = {}) => {
  const { format = 'json', fallbackPaths = [] } = options;
  const isJson = format === 'json';

  const config = {
    headers: {
      'Content-Type': 'application/json',
      Accept: isJson ? 'application/json' : 'application/pdf',
    },
    params: isJson ? { format: 'json' } : {},
    responseType: isJson ? 'json' : 'blob',
  };

  const allPaths = [path, ...(Array.isArray(fallbackPaths) ? fallbackPaths : [fallbackPaths])].filter(Boolean);

  let lastError;
  for (const endpoint of allPaths) {
    try {
      const response = await axiosInstance.post(endpoint, data, config);
      return response.data;
    } catch (err) {
      lastError = err;
      // If endpoint returned 404 Not Found or 405 Method Not Allowed, attempt next fallback route
      if (err.response?.status === 404 || err.response?.status === 405) {
        continue;
      }
      // If backend returned a JSON error inside a blob, parse it
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          err.response.data = json;
        } catch {
          // ignore parse error
        }
      }
      throw err;
    }
  }

  if (lastError?.response?.data instanceof Blob) {
    try {
      const text = await lastError.response.data.text();
      const json = JSON.parse(text);
      lastError.response.data = json;
    } catch {
      // ignore parse error
    }
  }
  throw lastError;
};

export const letterService = {
  // 1. Offer / Appointment Letter API
  // POST /api/v1/society/employees/hr/letters/offer (or /letters/offer)
  generateOfferLetter: async (data, options = {}) => {
    return await postLetterRequest('/v1/society/employees/hr/letters/offer', data, {
      ...options,
      fallbackPaths: ['/letters/offer', '/v1/society/letters/offer']
    });
  },

  // 2. Employment Confirmation Letter API
  // POST /api/v1/society/employees/hr/letters/confirmation (or /letters/confirmation)
  generateConfirmationLetter: async (data, options = {}) => {
    return await postLetterRequest('/v1/society/employees/hr/letters/confirmation', data, {
      ...options,
      fallbackPaths: ['/letters/confirmation', '/v1/society/letters/confirmation']
    });
  },

  // 3. Performance Appraisal Letter API
  // POST /api/v1/society/employees/hr/letters/performance (or /letters/performance)
  generatePerformanceLetter: async (data, options = {}) => {
    return await postLetterRequest('/v1/society/employees/hr/letters/performance', data, {
      ...options,
      fallbackPaths: ['/letters/performance', '/v1/society/letters/performance']
    });
  },

  // 4. Promotion Letter API
  // POST /api/v1/society/employees/hr/letters/promotion (or /letters/promotion)
  generatePromotionLetter: async (data, options = {}) => {
    return await postLetterRequest('/v1/society/employees/hr/letters/promotion', data, {
      ...options,
      fallbackPaths: ['/letters/promotion', '/v1/society/letters/promotion']
    });
  },

  // 5. Transfer Letter API
  // POST /api/v1/society/employees/hr/letters/transfer (or /letters/transfer)
  generateTransferLetter: async (data, options = {}) => {
    return await postLetterRequest('/v1/society/employees/hr/letters/transfer', data, {
      ...options,
      fallbackPaths: ['/letters/transfer', '/v1/society/letters/transfer']
    });
  },

  // 6. Salary Increment Letter API
  // POST /letters/salary-increment (or /api/v1/society/employees/hr/letters/salary-increment)
  // Body: { employeeId, incrementPercentage, fromMonth, ... }
  generateSalaryIncrement: async (data, options = {}) => {
    return await postLetterRequest('/letters/salary-increment', data, {
      ...options,
      fallbackPaths: [
        '/v1/society/employees/hr/letters/salary-increment',
        '/v1/society/letters/salary-increment'
      ]
    });
  },

  // 7. Monthly Salary Slip API
  // POST /api/v1/society/employees/hr/letters/salary-slip (or /letters/salary-slip)
  // Body: { employeeId, salaryDate, payDate, payPeriod, workingDays, presentDays, paidDays, lopDays, accountNumber, earnings: [...], deductions: [...], employerContributions: [...] }
  generateSalarySlip: async (data, options = {}) => {
    return await postLetterRequest('/v1/society/employees/hr/letters/salary-slip', data, {
      ...options,
      fallbackPaths: [
        '/letters/salary-slip',
        '/v1/society/letters/salary-slip'
      ]
    });
  },

  // 8. Termination Letter API
  // POST /letters/termination (or /api/v1/society/employees/hr/letters/termination)
  // Body: { employeeId, terminationDate, reason, noticePeriodDays, handoverTo }
  generateTerminationLetter: async (data, options = {}) => {
    return await postLetterRequest('/letters/termination', data, {
      ...options,
      fallbackPaths: [
        '/v1/society/employees/hr/letters/termination',
        '/v1/society/letters/termination'
      ]
    });
  },

  // 9. Employee Letter History Logs API
  // GET /api/v1/society/employees/hr/letters/history (or /api/v1/society/employees/hr/letter-history)
  getHistory: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/v1/society/employees/hr/letters/history', { params });
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        // Fallback to alternative endpoint path if first returns 404
        const fallbackRes = await axiosInstance.get('/v1/society/employees/hr/letter-history', { params });
        return fallbackRes.data;
      }
      throw err;
    }
  },

  // 10. Send / Resend MSG91 Email Notification for Employee Letters
  // POST /api/v1/society/employees/hr/letters/send-email (or /:logId/send-email)
  // Body: { logId, employeeId, documentTypeCode, customEmail, variables }
  sendLetterEmail: async (payload = {}, logId = null) => {
    const targetLogId = logId || payload.logId;
    const url = targetLogId && String(targetLogId).length === 24
      ? `/v1/society/employees/hr/letters/${targetLogId}/send-email`
      : '/v1/society/employees/hr/letters/send-email';
    const response = await axiosInstance.post(url, payload);
    return response.data;
  },

  // 14. Bank Official Signature & Signatory Management APIs
  // 14.2 Retrieve Bank Signature Settings
  // GET /api/v1/society/bank/signature (or /api/v1/society/employees/hr/bank/signature)
  getBankSignatureSettings: async () => {
    try {
      const response = await axiosInstance.get('/v1/society/bank/signature');
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        const fallbackRes = await axiosInstance.get('/v1/society/employees/hr/bank/signature');
        return fallbackRes.data;
      }
      throw err;
    }
  },

  // 14.1 Upload & Update Bank Signature Settings
  // POST /api/v1/society/bank/signature (or /api/v1/society/employees/hr/bank/signature)
  // Supports multipart/form-data (FormData) or application/json
  updateBankSignatureSettings: async (payload) => {
    const isFormData = payload instanceof FormData;
    const config = isFormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : { headers: { 'Content-Type': 'application/json' } };

    try {
      // Use POST method on /v1/society/bank/signature
      const response = await axiosInstance.post('/v1/society/bank/signature', payload, config);
      return response.data;
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 405) {
        try {
          const fallbackPost = await axiosInstance.post('/v1/society/employees/hr/bank/signature', payload, config);
          return fallbackPost.data;
        } catch (fbErr) {
          if (fbErr.response?.status === 405) {
            const fallbackPatch = await axiosInstance.patch('/v1/society/bank/signature', payload, config);
            return fallbackPatch.data;
          }
          throw fbErr;
        }
      }
      throw err;
    }
  },

  // Unified Dispatcher Method
  generate: async (payload, options = {}) => {
    const { letterType, ...data } = payload;
    const normType = (letterType || '').toLowerCase().trim();

    if (normType.includes('offer')) {
      return await letterService.generateOfferLetter(data, options);
    } else if (normType.includes('confirmation')) {
      return await letterService.generateConfirmationLetter(data, options);
    } else if (normType.includes('performance') || normType.includes('appraisal')) {
      return await letterService.generatePerformanceLetter(data, options);
    } else if (normType.includes('promotion')) {
      return await letterService.generatePromotionLetter(data, options);
    } else if (normType.includes('transfer')) {
      return await letterService.generateTransferLetter(data, options);
    } else if (normType.includes('increment')) {
      return await letterService.generateSalaryIncrement(data, options);
    } else if (normType.includes('slip') || normType.includes('salary slip')) {
      return await letterService.generateSalarySlip(data, options);
    } else if (normType.includes('termination')) {
      return await letterService.generateTerminationLetter(data, options);
    } else {
      throw new Error(`Unsupported letter type: ${letterType}`);
    }
  },
};

export const DOCUMENT_TYPE_CODES = {
  'Offer Letter': 'OFFER_LETTER',
  'Confirmation Letter': 'CONFIRMATION_LETTER',
  'Performance Letter': 'PERFORMANCE_LETTER',
  'Performance Appraisal': 'PERFORMANCE_LETTER',
  'Promotion Letter': 'PROMOTION_LETTER',
  'Transfer Letter': 'TRANSFER_LETTER',
  'Salary Slip': 'SALARY_SLIP',
  'Salary Increment': 'INCREMENT_LETTER',
  'Termination Letter': 'TERMINATION_LETTER',
};

export default letterService;
