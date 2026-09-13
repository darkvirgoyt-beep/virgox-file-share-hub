import { useEffect } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import Home from "@/pages/Home";
import Messages from "@/pages/Messages";
import Friends from "@/pages/Friends";
import Notifications from "@/pages/Notifications";
import Files from "@/pages/Files";
import Login from "@/pages/Login";
import { Button } from "@/components/ui/button";

function LoadingScreen() {
  return <main className="flex min-h-screen items-center justify-center bg-background"><div className="flex flex-col items-center gap-3 text-muted-foreground"><LoaderCircle className="animate-spin" size={28} /><p>Checking your secure session…</p></div></main>;
}

export default function AuthGate() {
  const [, setLocation] = useLocation();
  const auth = useAuth();

  useEffect(() => {
    if (auth.error) console.error("[AuthGate] Account initialization failed", auth.error);
  }, [auth.error]);

  useEffect(() => {
    if (!auth.loading && auth.user && window.location.pathname === "/login") setLocation("/");
  }, [auth.loading, auth.user, setLocation]);

  if (auth.loading) return <LoadingScreen />;

  if (auth.error) return <main className="flex min-h-screen items-center justify-center bg-background p-6"><div className="flex max-w-md flex-col items-center gap-4 text-center"><AlertTriangle className="text-destructive" size={32} /><h1 className="text-xl font-semibold">We could not load your account</h1><p className="text-sm text-muted-foreground">Your session is safe, but account data is temporarily unavailable. Try again in a moment.</p><Button onClick={() => auth.refresh()}>Try again</Button></div></main>;

  if (!auth.user) return <Login />;
  const path = window.location.pathname;
  if (path === "/messages") return <Messages />;
  if (path === "/friends") return <Friends />;
  if (path === "/notifications") return <Notifications />;
  if (path === "/files") return <Files />;
  return <Home />;
}
