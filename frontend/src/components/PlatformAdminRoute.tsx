import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

import { Navigate } from "react-router";

import {
  getCurrentUser,
} from "../api/api";

interface PlatformAdminRouteProps {
  children: ReactNode;
}

export default function PlatformAdminRoute({
  children,
}: PlatformAdminRouteProps) {
  const [isLoading, setIsLoading] =
    useState(true);

  const [isPlatformAdmin, setIsPlatformAdmin] =
    useState(false);

  useEffect(() => {
    async function verifyAdminAccess() {
      try {
        const user =
          await getCurrentUser();

        setIsPlatformAdmin(
          user.isPlatformAdmin,
        );
      } catch {
        setIsPlatformAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    void verifyAdminAccess();
  }, []);

  if (isLoading) {
    return (
      <p>
        Vérification des droits administrateur...
      </p>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
}