import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter } from "@workspace/api-client-react";

type AuthUser = {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  token: null,
  setToken: () => {},
  logout: () => {},
});

const TOKEN_KEY = "autohaul_session_token";
const USER_KEY = "autohaul_user";

setAuthTokenGetter(async () => {
  return AsyncStorage.getItem(TOKEN_KEY);
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        if (storedToken) {
          setTokenState(storedToken);
          if (storedUser) setUser(JSON.parse(storedUser));
        }
      } catch (e) {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setToken = async (t: string | null) => {
    setTokenState(t);
    if (t) {
      await AsyncStorage.setItem(TOKEN_KEY, t);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!token,
        token,
        setToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
