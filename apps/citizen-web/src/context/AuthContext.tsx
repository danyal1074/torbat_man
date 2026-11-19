import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
export interface User {
    id: string;
    mobile: string;
    displayName: string | null;
    createdAt: string;
}
interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    loginAsDemoCitizen: (mobileNumber?: string) => Promise<void>;
    loginWithOtp: (mobile: string, code: string) => Promise<void>;
    requestOtp: (mobile: string) => Promise<string | undefined>;
    logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const fetchMe = async () => {
        try {
            const res = await api.getMe();
            if (res?.id) {
                setUser(res);
            }
            else {
                setUser(null);
            }
        }
        catch {
            setUser(null);
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchMe();
    }, []);
    const loginAsDemoCitizen = async (mobileNumber = '09120000001') => {
        setIsLoading(true);
        try {
            const otpRes = await api.requestOtp(mobileNumber);
            const code = otpRes.devCode;
            if (!code)
                throw new Error('ورود آزمایشی در این محیط فعال نیست.');
            const verifyRes = await api.verifyOtp(mobileNumber, code);
            setUser(verifyRes.user);
        }
        catch (err) {
            console.error('Demo login error:', err);
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    };
    const requestOtp = async (mobile: string) => {
        const res = await api.requestOtp(mobile);
        return res.devCode;
    };
    const loginWithOtp = async (mobile: string, code: string) => {
        setIsLoading(true);
        try {
            const res = await api.verifyOtp(mobile, code);
            setUser(res.user);
        }
        finally {
            setIsLoading(false);
        }
    };
    const logout = async () => {
        await api.logout().catch(() => { });
        setUser(null);
    };
    return (<AuthContext.Provider value={{
            user,
            isLoading,
            loginAsDemoCitizen,
            loginWithOtp,
            requestOtp,
            logout,
        }}>
      {children}
    </AuthContext.Provider>);
};
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
};
