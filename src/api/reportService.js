import axiosInstance from "./axiosConfig";

class ReportService {
  /**
   * Get Report Catalog
   * Returns a metadata list of all available reports, categories, and supported filters.
   */
  async getCatalog(category = "") {
    try {
      const params = category ? { category } : {};
      const response = await axiosInstance.get("/v1/society/reports/catalog", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Generate / View Report Data
   * Fetches paginated report items, KPI summary cards, and metadata.
   */
  async getReportData(reportType, params = {}) {
    try {
      const response = await axiosInstance.get(`/v1/society/reports/${reportType}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Overall Consolidated Reports Graph Analytics
   * High-level executive graphs and multi-series analytics across all modules.
   */
  async getOverallAnalytics(params = {}) {
    try {
      const response = await axiosInstance.get("/v1/society/reports/overall-graph", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Individual Report Graph Analytics
   * Granular, report-specific time-series charts and distributions.
   */
  async getReportAnalytics(reportType, params = {}) {
    try {
      const response = await axiosInstance.get(`/v1/society/reports/${reportType}/graph`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Export Report (CSV / PDF)
   * Streams a downloadable file.
   */
  async exportReport(reportType, formatOrParams = "csv", optionalParams = {}) {
    try {
      let format = "csv";
      let params = {};

      if (typeof formatOrParams === "string") {
        format = formatOrParams;
        params = optionalParams || {};
      } else if (typeof formatOrParams === "object" && formatOrParams !== null) {
        params = formatOrParams;
        format = params.format || "csv";
      }

      // Need responseType: 'blob' to handle binary file downloads
      const response = await axiosInstance.get(`/v1/society/reports/${reportType}/export`, {
        params: { ...params, format },
        responseType: "blob",
      });

      // Handle the blob download in the browser
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      
      // Extract filename from headers if possible, or fallback
      let fileName = `report-${String(reportType).toLowerCase()}-${new Date().toISOString().split('T')[0]}.${format}`;
      const disposition = response.headers ? response.headers['content-disposition'] : null;
      if (disposition && disposition.includes('filename=')) {
        const matches = /filename="?([^"]+)"?/.exec(disposition);
        if (matches != null && matches[1]) {
          fileName = matches[1];
        }
      }

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error("Export failed:", error);
      throw error;
    }
  }
}

export const reportService = new ReportService();
