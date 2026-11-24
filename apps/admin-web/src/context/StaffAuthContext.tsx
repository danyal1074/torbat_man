import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminApi, type DemoStaffAccount, type StaffMe } from '../api/client';

interface StaffAuthContextType {
  staff: StaffMe | null;
  isLoading: boolean;
  publicDemo: boolean;
  demoAccounts: DemoStaffAccount[];
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
  const [publicDemo, setPublicDemo] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoStaffAccount[]>([]);

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
    let active = true;
    void adminApi.health().then(async ({ publicDemo }) => {
      if (!active || !publicDemo) return;
      setPublicDemo(true);
      const accounts = await adminApi.demoAccounts();
      if (active) setDemoAccounts(accounts.data.filter(account => account.kind === 'staff'));
    }).catch(() => {});
    void fetchStaff();
    return () => { active = false; };
  }, []);

  const loginAsDemoStaff = async (mobile = '09130000002') => {
    const mode = await adminApi.health();
    if (mode.publicDemo) { setStaff(await adminApi.demoLogin(mobile)); return; }
    const otpRes = await adminApi.requestOtp(mobile);
    if (!otpRes.devCode) throw new Error('ورود آزمایشی فعال نیست.');
    setStaff(await adminApi.verifyOtp(mobile, otpRes.devCode));
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
        publicDemo,
        demoAccounts,
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
