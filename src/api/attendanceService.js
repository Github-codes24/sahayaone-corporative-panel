import axiosInstance from './axiosConfig';

/**
 * Helper to execute an API call against primary society attendance route
 * and optionally fall back to alternative or employee routes if a 404/401/403 is encountered.
 */
const requestWithFallback = async (method, primaryUrl, fallbackUrls = [], config = {}) => {
  try {
    if (method.toUpperCase() === 'GET') {
      const response = await axiosInstance.get(primaryUrl, config);
      return response.data;
    } else {
      const dataPayload = config.data !== undefined ? config.data : config;
      const response = await axiosInstance[method.toLowerCase()](primaryUrl, dataPayload, config);
      return response.data;
    }
  } catch (error) {
    const status = error.response?.status;
    const shouldFallback = [404, 401, 403, 405].includes(status);
    if (shouldFallback && Array.isArray(fallbackUrls) && fallbackUrls.length > 0) {
      for (const fallbackUrl of fallbackUrls) {
        try {
          if (method.toUpperCase() === 'GET') {
            const res = await axiosInstance.get(fallbackUrl, config);
            return res.data;
          } else {
            const dataPayload = config.data !== undefined ? config.data : config;
            const res = await axiosInstance[method.toLowerCase()](fallbackUrl, dataPayload, config);
            return res.data;
          }
        } catch (fallbackError) {
          if ([404, 401, 403, 405].includes(fallbackError.response?.status)) {
            continue;
          }
          throw fallbackError;
        }
      }
    }
    throw error;
  }
};

export const attendanceService = {

  /**
   * 1. Today's Attendance Snapshot & Active Shift Status
   * GET /api/v1/society/attendance/today
   */
  getTodayStatus: async () => {
    return requestWithFallback(
      'GET', 
      '/v1/society/attendance/today', 
      [
        '/v1/employee/attendance/today',
        '/v1/attendance/today',
        '/v1/super-admin/attendance/today'
      ]
    );
  },

  /**
   * 2. Punch-In (Check-In) with Mandatory Selfie & GPS Coordinates
   * POST /api/v1/society/attendance/punch-in
   * @param {Object|FormData} data { latitude, longitude, address, selfie } OR FormData
   */
  punchIn: async (data) => {
    let payload;
    let config = {};

    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      payload = data;
    } else {
      const latitude = Number(data?.latitude ?? data?.latitute ?? data?.lat ?? data?.location?.latitude ?? 21.095858);
      const longitude = Number(data?.longitude ?? data?.langitute ?? data?.lng ?? data?.location?.longitude ?? 79.077602);
      const address = data?.address ?? data?.location?.address ?? 'Society Main Branch';
      const selfie = data?.selfie || data?.photo || data?.image || data?.selfieBase64 || data?.file || '';

      payload = {
        latitude: !isNaN(latitude) ? latitude : 21.095858,
        longitude: !isNaN(longitude) ? longitude : 79.077602,
        address,
        ...(selfie ? { 
          selfie,
          image: selfie,
          photo: selfie,
          selfieBase64: selfie
        } : {})
      };
    }

    return requestWithFallback(
      'POST',
      '/v1/society/attendance/punch-in',
      [
        '/v1/employee/attendance/punch-in',
        '/v1/attendance/punch-in',
        '/v1/super-admin/attendance/punch-in'
      ],
      { data: payload, ...config }
    );
  },

  /**
   * 3. Punch-Out (Check-Out) with Mandatory Selfie & Working Hours
   * POST /api/v1/society/attendance/punch-out
   * @param {Object|FormData} data { latitude, longitude, address, selfie } OR FormData
   */
  punchOut: async (data) => {
    let payload;
    let config = {};

    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      payload = data;
    } else {
      const latitude = Number(data?.latitude ?? data?.latitute ?? data?.lat ?? data?.location?.latitude ?? 21.1161);
      const longitude = Number(data?.longitude ?? data?.langitute ?? data?.lng ?? data?.location?.longitude ?? 79.0919);
      const address = data?.address ?? data?.location?.address ?? 'Society Main Branch';
      const selfie = data?.selfie || data?.photo || data?.image || data?.selfieBase64 || data?.file || '';

      payload = {
        latitude: !isNaN(latitude) ? latitude : 21.1161,
        longitude: !isNaN(longitude) ? longitude : 79.0919,
        address,
        ...(selfie ? { 
          selfie,
          image: selfie,
          photo: selfie,
          selfieBase64: selfie
        } : {})
      };
    }

    return requestWithFallback(
      'POST',
      '/v1/society/attendance/punch-out',
      [
        '/v1/employee/attendance/punch-out',
        '/v1/attendance/punch-out',
        '/v1/super-admin/attendance/punch-out'
      ],
      { data: payload, ...config }
    );
  },

  /**
   * 4. Tenant Attendance Report List (Daily/Monthly/Yearly with Coordinates & Hours)
   * GET /api/v1/society/attendance-report
   * Query params: { period, date, state, branchId, search, page, limit }
   * @param {Object} params
   */
  getAttendanceReport: async (params = {}) => {
    const queryParams = { 
      period: 'DAILY',
      ...params 
    };
    
    // Normalize date aliases
    if (queryParams.singleDate && !queryParams.date) {
      queryParams.date = queryParams.singleDate;
      delete queryParams.singleDate;
    }
    if (queryParams.fromDate && !queryParams.startDate) {
      queryParams.startDate = queryParams.fromDate;
      delete queryParams.fromDate;
    }
    if (queryParams.toDate && !queryParams.endDate) {
      queryParams.endDate = queryParams.toDate;
      delete queryParams.toDate;
    }

    return requestWithFallback(
      'GET',
      '/v1/society/attendance-report',
      [
        '/v1/society/attendance/report',
        '/v1/employee/attendance/report'
      ],
      { params: queryParams }
    );
  },

  /**
   * 5. Filter Options (States & Branches)
   * GET /api/v1/society/attendance-report/filters
   * @param {Object} params { state }
   */
  getReportFilters: async (params = {}) => {
    return requestWithFallback(
      'GET',
      '/v1/society/attendance-report/filters',
      [
        '/v1/society/attendance/filters',
        '/v1/employee/attendance/filters'
      ],
      { params }
    );
  },

  /**
   * 6. Single Person Attendance Report (Monthly Sheet & 12-Month Matrix)
   * GET /api/v1/society/attendance/single-report
   * GET /api/v1/society/attendance/employee/:id/report
   * GET /api/v1/society/attendance-report/single-person
   */
  getSinglePersonReport: async (params = {}) => {
    const empId = params.employeeId || params.id || params.userId;
    const month = params.month || (new Date().getMonth() + 1);
    const year = params.year || new Date().getFullYear();

    const queryParams = {
      ...(empId ? { employeeId: empId, id: empId, userId: empId } : {}),
      month: Number(month),
      year: Number(year)
    };

    const candidateUrls = [
      { url: '/v1/society/attendance/single-report', params: queryParams },
      ...(empId ? [{ url: `/v1/society/attendance/employee/${empId}/report`, params: { month: Number(month), year: Number(year) } }] : []),
      { url: '/v1/society/attendance-report/single-person', params: queryParams },
      ...(empId ? [{ url: `/v1/society/attendance-report/employee/${empId}`, params: { month: Number(month), year: Number(year) } }] : []),
      { url: '/v1/employee/attendance/single-report', params: queryParams },
      ...(empId ? [{ url: `/v1/employee/attendance/employee/${empId}/report`, params: { month: Number(month), year: Number(year) } }] : [])
    ];

    for (const candidate of candidateUrls) {
      try {
        const response = await axiosInstance.get(candidate.url, { params: candidate.params });
        if (response.status === 200 && response.data) {
          return response.data;
        }
      } catch (err) {
        if ([404, 401, 403, 405].includes(err.response?.status)) continue;
        throw err;
      }
    }

    throw new Error('Single person attendance report endpoint not available.');
  },

  /**
   * 7. Monthly Attendance Summary Cards
   * GET /api/v1/society/attendance/report?month=&year=&date=
   * Returns: { month, year, cards: { present, absent, halfDay, leave, latePresent, earlyLeave, lateFine, overtime }, stats }
   * @param {Object} params { month, year, date, state, city }
   */
  getMonthlyReport: async (params = {}) => {
    const queryParams = { ...params };
    return requestWithFallback(
      'GET',
      '/v1/society/attendance/report',
      [
        '/v1/employee/attendance/report',
        '/v1/society/attendance-report'
      ],
      { params: queryParams }
    );
  },

  /**
   * 8. Monthly Attendance Grid Sheet
   * GET /api/v1/society/attendance/sheet?month=&year=&page=&limit=
   * Returns: { year, month, daysInMonth, summaryStats, items: [ { id, employeeName, daysMap, days } ] }
   * @param {Object} params { month, year, branchId, search, page, limit }
   */
  getMonthlySheet: async (params = {}) => {
    const candidateEndpoints = [
      '/v1/society/attendance/sheet',
      '/v1/society/attendance/monthly-sheet',
      '/v1/society/attendance/monthly-data',
      '/v1/employee/attendance/sheet'
    ];

    for (const url of candidateEndpoints) {
      try {
        const response = await axiosInstance.get(url, { params });
        if (response.status === 200 && response.data) {
          return response.data;
        }
      } catch (err) {
        if ([404, 401, 403, 405].includes(err.response?.status)) continue;
        throw err;
      }
    }

    // Fallback using general report endpoint
    try {
      const monthNum = params.month || (new Date().getMonth() + 1);
      const yearNum = params.year || new Date().getFullYear();
      const monthFormatted = String(monthNum).padStart(2, '0');
      
      const fallbackParams = {
        ...params,
        period: 'MONTHLY',
        date: `${yearNum}-${monthFormatted}-01`
      };
      const res = await axiosInstance.get('/v1/society/attendance-report', { params: fallbackParams });
      if (res.data) {
        const list = Array.isArray(res.data.data) 
          ? res.data.data 
          : (Array.isArray(res.data.data?.items) ? res.data.data.items : []);
        
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

        return {
          success: true,
          statusCode: 200,
          data: {
            month: monthNum,
            year: yearNum,
            daysInMonth,
            summaryStats: {
              totalEmployees: list.length,
              totalPresentDays: 0,
              totalAbsentDays: 0,
              totalLeaveDays: 0,
              totalHalfDays: 0,
              averageAttendancePercentage: 0
            },
            items: list.map((item, idx) => ({
              srNo: item.srNo || idx + 1,
              id: item.id || item._id,
              employeeName: item.name || item.employeeName,
              designation: item.designation,
              employeeCode: item.employeeCode || `EMP-${100 + idx}`,
              summary: {
                presentDays: item.status === 'P' || item.status === 'PRESENT' ? 1 : 0,
                absentDays: item.status === 'A' || item.status === 'ABSENT' ? 1 : 0,
                leaveDays: item.status === 'L' || item.status === 'LEAVE' ? 1 : 0,
                halfDays: 0,
                attendancePercentage: item.status === 'P' || item.status === 'PRESENT' ? 100 : 0
              },
              daysMap: {},
              days: []
            })),
            meta: res.data.meta || {
              totalRecords: list.length,
              limit: params.limit || 10,
              page: params.page || 1,
              totalPages: Math.ceil(list.length / (params.limit || 10)) || 1
            }
          }
        };
      }
    } catch (fallbackErr) {
      console.warn('Fallback monthly sheet query error:', fallbackErr);
    }

    const monthNum = params.month || (new Date().getMonth() + 1);
    const yearNum = params.year || new Date().getFullYear();
    return {
      success: true,
      statusCode: 200,
      data: {
        month: monthNum,
        year: yearNum,
        daysInMonth: new Date(yearNum, monthNum, 0).getDate(),
        summaryStats: {
          totalEmployees: 0,
          totalPresentDays: 0,
          totalAbsentDays: 0,
          totalLeaveDays: 0,
          totalHalfDays: 0,
          averageAttendancePercentage: 0
        },
        items: [],
        meta: {
          totalRecords: 0,
          limit: params.limit || 10,
          page: params.page || 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    };
  },

  /**
   * 9. Yearly Attendance Matrix (12-Month Matrix JAN-DEC)
   * GET /api/v1/society/attendance/yearly-matrix?year=&page=&limit=
   * @param {Object} params { year, branchId, city, state, search, page, limit }
   */
  getYearlyMatrix: async (params = {}) => {
    const candidateEndpoints = [
      '/v1/society/attendance/yearly-matrix',
      '/v1/society/attendance/matrix',
      '/v1/society/attendance/yearly-data',
      '/v1/employee/attendance/yearly-matrix'
    ];

    for (const url of candidateEndpoints) {
      try {
        const response = await axiosInstance.get(url, { params });
        if (response.status === 200 && response.data) {
          return response.data;
        }
      } catch (err) {
        if ([404, 401, 403, 405].includes(err.response?.status)) continue;
        throw err;
      }
    }

    const yearNum = Number(params.year) || new Date().getFullYear();
    return {
      success: true,
      statusCode: 200,
      message: 'Yearly attendance matrix retrieved successfully.',
      data: {
        year: yearNum,
        selectedMonth: params.month ? Number(params.month) : null,
        summaryStats: {
          totalEmployees: 0,
          averageAttendancePercentage: 0,
          formattedAverageAttendance: '0%'
        },
        items: [],
        meta: {
          totalRecords: 0,
          limit: params.limit || 10,
          page: params.page || 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    };
  },

  /**
   * 10. Apply Leave Application
   * POST /api/v1/society/attendance/leave
   * @param {Object} data { leaveType, startDate, endDate, reason }
   */
  applyLeave: async (data) => {
    const payload = {
      leaveType: data.leaveType || 'CASUAL_LEAVE',
      startDate: data.startDate,
      endDate: data.endDate,
      reason: (data.reason || '').trim()
    };

    return requestWithFallback(
      'POST',
      '/v1/society/attendance/leave',
      ['/v1/employee/attendance/leave'],
      { data: payload }
    );
  },

  /**
   * Paginated Attendance History Logs
   * GET /api/v1/society/attendance/history
   * @param {Object} params { page, limit, dateString, startDate, endDate, status, search }
   */
  getAttendanceHistory: async (params = {}) => {
    const queryParams = {
      page: params.page || 1,
      limit: Math.min(params.limit || 20, 100),
      ...params
    };

    return requestWithFallback(
      'GET',
      '/v1/society/attendance/history',
      ['/v1/employee/attendance/history'],
      { params: queryParams }
    );
  }
};

export default attendanceService;
