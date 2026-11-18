import axiosInstance from './axiosConfig';

export const onboardingFormsApi = {
  /**
   * 1. Fetch Forms Overview Checklist
   */
  async getFormsOverview(onboardingType, referenceId, panel = 'society') {
    const res = await axiosInstance.get(`/v1/${panel}/forms/overview/${onboardingType}/${referenceId}?_req=overview`);
    return res.data?.data || res.data;
  },

  /**
   * 2. Get Single Form Details
   */
  async getFormData(endpointSlug, referenceId, panel = 'society') {
    const res = await axiosInstance.get(`/v1/${panel}/forms/${endpointSlug}/${referenceId}?_req=get-${endpointSlug}`);
    return res.data?.data || res.data;
  },

  /**
   * 3. Update Form Details
   */
  async updateFormData(endpointSlug, referenceId, payload, panel = 'society') {
    const res = await axiosInstance.put(`/v1/${panel}/forms/${endpointSlug}/${referenceId}?_req=update-${endpointSlug}`, payload);
    return res.data?.data || res.data;
  },

  /**
   * 4. Fetch Watermarked PDF Preview Stream (In-Memory Blob)
   */
  async fetchPreviewPdfBlobUrl(endpointSlug, referenceId, panel = 'society') {
    const res = await axiosInstance.get(`/v1/${panel}/forms/${endpointSlug}/${referenceId}/preview`, {
      responseType: 'blob'
    });

    const file = new Blob([res.data], { type: 'application/pdf' });
    return window.URL.createObjectURL(file);
  },

  /**
   * 5. Download Final Signed PDF from S3
   */
  async downloadSignedPdf(endpointSlug, referenceId, filename, panel = 'society') {
    try {
      const res = await axiosInstance.get(`/v1/${panel}/forms/${endpointSlug}/${referenceId}/download`, {
        responseType: 'blob'
      });

      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `${filename}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const fallbackUrl =
        err?.request?.responseURL ||
        err?.response?.request?.responseURL ||
        err?.response?.headers?.location;

      if (fallbackUrl && (fallbackUrl.includes('aces3.ai') || fallbackUrl.includes('.pdf'))) {
        const link = document.createElement('a');
        link.href = fallbackUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('download', `${filename}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      throw err;
    }
  },

  /**
   * 6. Initialize VerifyA2Z E-Signature Session
   */
  async initializeEsign(endpointSlug, referenceId, payload = {}, panel = 'society') {
    const res = await axiosInstance.post(`/v1/${panel}/forms/${endpointSlug}/${referenceId}/esign/initialize`, payload);
    return res.data;
  },

  /**
   * 7. Check E-Signature Status
   */
  async checkEsignStatus(endpointSlug, referenceId, panel = 'society') {
    const res = await axiosInstance.get(`/v1/${panel}/forms/${endpointSlug}/${referenceId}/esign/status`);
    return res.data;
  }
};
