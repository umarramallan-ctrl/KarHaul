import { useEffect } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import { setAuthTokenGetter } from "@workspace/api-client-react";

type AuthUser = {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
};

export function useAuth() {
  const { isSignedIn, isLoaded, getToken, signOut } = useClerkAuth();
  const { user } = useUser();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  const authUser: AuthUser | null = user
    ? {
        id: user.id,
        username: user.username ?? undefined,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        profileImage: user.imageUrl,
      }
    : null;

  return {
    user: authUser,
    isLoading: !isLoaded,
    isAuthenticated: !!isSignedIn,
    token: null,
    setToken: (_token: string | null) => {},
    logout: () => { signOut(); },
  };
}
