import { useState, useCallback } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>({
    id: 'user-1',
    name: 'Demo User',
    email: 'demo@personalai.app',
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setUser({
        id: 'user-1',
        name: 'Demo User',
        email: 'demo@personalai.app',
      });
      setIsLoading(false);
    }, 1000);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
