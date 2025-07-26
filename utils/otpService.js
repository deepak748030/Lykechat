import axios from 'axios';
import FormData from 'form-data';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

// Cache for OTP storage (expires in 1 minute)
const otpCache = new NodeCache({ stdTTL: 60 });

export const sendOtpViaSMS = async (phone, otp) => {
  try {
    const form = new FormData();
    form.append('otp', otp);
    form.append('type', 'SMS');
    form.append('numberOrMail', phone);

    const res = await axios.post(
      'https://api.codemindstudio.in/api/start_verification',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Api-Key': process.env.OTP_API_KEY,
          'Api-Salt': process.env.OTP_API_SALT
        }
      }
    );

    // Store OTP in cache for 1 minute
    otpCache.set(phone, otp);
    
    return res.data; // { message, status }
  } catch (err) {
    console.error('OTP sending error:', err);
    return { message: 'OTP sending failed', status: false };
  }
};

export const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const verifyOtp = (phone, otp) => {
  const cachedOtp = otpCache.get(phone);
  if (cachedOtp && cachedOtp === otp) {
    otpCache.del(phone); // Remove OTP after successful verification
    return true;
  }
  return false;
};

export const getIndianTime = () => {
  return new Date().toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};