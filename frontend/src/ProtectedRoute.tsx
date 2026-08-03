import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

import {
  Navigate,
} from "react-router";

import {
  getCurrentUser,
} from "./api/api";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const [isLoading, setIsLoading] =
    useState(true);

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  useEffect(() => {
    async function verifySession() {
      try {
        await getCurrentUser();

        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    void verifySession();
  }, []);

  if (isLoading) {
    return <p>Vérification de la session...</p>;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}