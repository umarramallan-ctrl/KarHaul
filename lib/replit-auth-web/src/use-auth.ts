import { useUser, useClerk } from "@clerk/clerk-react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

export function useAuth(): AuthState {
  const { user, isLoaded } = useUser();
  const { openSignIn, signOut } = useClerk();

  const authUser: AuthUser | null = user
    ? {
        id: user.id,
        username: user.username ?? undefined,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        profileImage: user.imageUrl,
      }
    : null;

  const login = () => {
    openSignIn();
  };

  const logout = () => {
    signOut();
  };

  return {
    user: authUser,
    isLoading: !isLoaded,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
