import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminApi, type StaffMe } from '../api/client';

interface StaffAuthContextType {
  staff: StaffMe | null;
  isLoading: boolean;
  loginAsDemoStaff: (mobile?: string) => Promise<void>;
  loginWithOtp: (mobile: string, code: string) => Promise<void>;
  requestOtp: (mobile: string) => Promise<string | undefined>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

export const StaffAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [staff, setStaff] = useState<StaffMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStaff = async () => {
    try {
      const res = await adminApi.getMe();
      if (res?.userId) {
        setStaff(res);
      } else {
        setStaff(null);
      }
    } catch {
      setStaff(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const loginAsDemoStaff = async (mobile = '09130000002') => {
    setIsLoading(true);
    try {
      const otpRes = await adminApi.requestOtp(mobile);
      const code = otpRes.devCode;
      if (!code) throw new Error('ورود آزمایشی فعال نیست.');
      const staffUser = await adminApi.verifyOtp(mobile, code);
      setStaff(staffUser);
    } catch (err) {
      console.error('Staff demo login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const requestOtp = async (mobile: string) => {
    const res = await adminApi.requestOtp(mobile);
    return res.devCode;
  };

  const loginWithOtp = async (mobile: string, code: string) => {
    setIsLoading(true);
    try {
      const staffUser = await adminApi.verifyOtp(mobile, code);
      setStaff(staffUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await adminApi.logout().catch(() => {});
    setStaff(null);
  };

  return (
    <StaffAuthContext.Provider
      value={{
        staff,
        isLoading,
        loginAsDemoStaff,
        loginWithOtp,
        requestOtp,
        logout,
        refresh: fetchStaff,
      }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
};

export const useStaffAuth = () => {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) throw new Error('useStaffAuth must be used within StaffAuthProvider');
  return ctx;
};
