import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();

  // This query is the app's auth-state listener equivalent: it is always run
  // once on boot and the result is shared by every useAuth() consumer.
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // A signed-in user is not ready for the dashboard until their profile has
  // also been resolved. Missing profile documents are a normal first-login
  // state, not an exception.
  const profileQuery = trpc.profiles.me.useQuery(undefined, {
    enabled: Boolean(meQuery.data),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      utils.profiles.me.setData(undefined, undefined);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED") return;
      throw error;
    } finally {
      try {
        sessionStorage.removeItem("manus-cookie");
      } catch {
        // Storage can be unavailable in private browsing.
      }
      utils.auth.me.setData(undefined, null);
      utils.profiles.me.setData(undefined, undefined);
      await utils.auth.me.invalidate();
      await utils.profiles.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    try {
      localStorage.setItem("manus-runtime-user-info", JSON.stringify(meQuery.data ?? null));
    } catch {
      // localStorage is only a convenience cache and must not block rendering.
    }

    const loading = meQuery.isLoading || profileQuery.isLoading || logoutMutation.isPending;
    return {
      user: meQuery.data ?? null,
      profile: profileQuery.data ?? null,
      loading,
      // A missing/unavailable profile is a first-login/setup state, not an
      // authentication failure. Keep the session usable and show ProfileSetup.
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
      needsProfile: Boolean(meQuery.data) && !profileQuery.isLoading && !profileQuery.data,
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    profileQuery.data,
    profileQuery.error,
    profileQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated || meQuery.isLoading || profileQuery.isLoading || logoutMutation.isPending) return;
    if (state.user || typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;
    if (redirectPath) window.location.href = redirectPath;
    else startLogin();
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    profileQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: async () => {
      await meQuery.refetch();
      await profileQuery.refetch();
    },
    logout,
  };
}
