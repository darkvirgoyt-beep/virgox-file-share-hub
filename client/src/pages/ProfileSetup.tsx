import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function ProfileSetup() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [username, setUsername] = useState("");
  const createProfile = trpc.profiles.create.useMutation({
    onSuccess: async () => {
      await trpcUtils.profiles.me.invalidate();
      toast.success("Profile created");
      setLocation("/");
    },
    onError: error => toast.error(error.message || "Could not create your profile"),
  });
  const trpcUtils = trpc.useUtils();

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="profile-setup-title">
        <div className="login-brand"><img className="brand-avatar" src="/virgox-avatar.png" alt="VirgoX" /><span><strong>VirgoX</strong><small>File Share Hub</small></span></div>
        <div className="login-kicker">One last step</div>
        <h1 id="profile-setup-title">Set up your profile.</h1>
        <p className="login-copy">Choose the name people will see and a unique username for your file-sharing space.</p>
        <label className="block text-sm font-medium mb-2" htmlFor="display-name">Display name</label>
        <input id="display-name" className="w-full rounded-lg border bg-background px-3 py-2 mb-4" value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="name" />
        <label className="block text-sm font-medium mb-2" htmlFor="username">Username</label>
        <input id="username" className="w-full rounded-lg border bg-background px-3 py-2 mb-2" value={username} onChange={event => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="your_username" autoComplete="username" />
        <p className="text-xs text-muted-foreground mb-6">Use 3–32 letters, numbers, or underscores.</p>
        <Button className="w-full" disabled={createProfile.isPending || displayName.trim().length < 1 || username.length < 3} onClick={() => createProfile.mutate({ displayName: displayName.trim(), username })}>
          {createProfile.isPending ? "Saving…" : "Continue to VirgoX"}
        </Button>
      </section>
    </main>
  );
}
