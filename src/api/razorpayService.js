import axiosInstance from './axiosConfig';

export const razorpayService = {
  getConnectionStatus: async () => {
    const response = await axiosInstance.get('/v1/society/profile/razorpay/status');
    return response.data;
  },

  getConnectUrl: async () => {
    const response = await axiosInstance.get('/v1/society/profile/razorpay/connect');
    return response.data;
  },
};

export default razorpayService;
