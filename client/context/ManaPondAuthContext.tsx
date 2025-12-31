import React, { createContext, useContext, ReactNode } from "react";

interface User {
  id: string;
  sub?: string;
  email?: string;
  name?: string;
}

interface ManaPondAuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const ManaPondAuthContext = createContext<ManaPondAuthContextValue | undefined>(undefined);

export function ManaPondAuthProvider({ children }: { children: ReactNode }) {
  return (
    <ManaPondAuthContext.Provider
      value={{
        user: null,
        isLoading: false,
        signIn: async () => {},
        signOut: async () => {},
      }}
    >
      {children}
    </ManaPondAuthContext.Provider>
  );
}

export function useManaPondAuth(): ManaPondAuthContextValue {
  const context = useContext(ManaPondAuthContext);
  if (!context) {
    return {
      user: null,
      isLoading: false,
      signIn: async () => {},
      signOut: async () => {},
    };
  }
  return context;
}
