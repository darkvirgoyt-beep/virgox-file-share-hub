import { useEffect } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import ProfileSetup from "@/pages/ProfileSetup";
import { Button } from "@/components/ui/button";

function LoadingScreen() {
  return <main className="flex min-h-screen items-center justify-center bg-background"><div className="flex flex-col items-center gap-3 text-muted-foreground"><LoaderCircle className="animate-spin" size={28} /><p>Checking your secure session…</p></div></main>;
}

export default function AuthGate() {
  const [, setLocation] = useLocation();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.loading && auth.user && !auth.needsProfile && window.location.pathname === "/login") setLocation("/");
  }, [auth.loading, auth.user, auth.needsProfile, setLocation]);

  if (auth.loading) return <LoadingScreen />;

  if (auth.error) {
    return <main className="flex min-h-screen items-center justify-center bg-background p-6"><div className="flex max-w-md flex-col items-center gap-4 text-center"><AlertTriangle className="text-destructive" size={32} /><h1 className="text-xl font-semibold">We could not load your account</h1><p className="text-sm text-muted-foreground">Your login may have completed, but the account check failed. Try again without losing your session.</p><p className="max-w-full break-words text-xs text-muted-foreground">{auth.error.message}</p><Button onClick={() => auth.refresh()}>Try again</Button></div></main>;
  }

  if (!auth.user) return <Login />;
  if (auth.needsProfile) return <ProfileSetup />;
  return <Home />;
}
