export const isValidRazorpayAuthUrl = (url) => {
  if (typeof url !== 'string') return false;

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const isRazorpayDomain = hostname === 'rzp.io'
      || hostname === 'razorpay.com'
      || hostname.endsWith('.razorpay.com');

    return parsedUrl.protocol === 'https:' && isRazorpayDomain;
  } catch (error) {
    return false;
  }
};
