import { ArrowRight, Check, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";

const benefits = ["Send secure files and private links", "Follow creators and personalize your feed", "Upload posts, photos, and 3-minute videos"];

export default function Login() {
  return (
    <main className="login-page">
      <div className="login-orbit orbit-one" />
      <div className="login-orbit orbit-two" />
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand"><img className="brand-avatar" src="/virgox-avatar.png" alt="VirgoX" /><span><strong>VirgoX</strong><small>File Share Hub</small></span></div>
        <div className="login-kicker"><Sparkles size={14} /> Your space, protected</div>
        <h1 id="login-title">Make room for your best signal.</h1>
        <p className="login-copy">Sign in with your Google account to send, share, follow, upload, and build inside VirgoX.</p>
        <Button className="google-login-button" onClick={startLogin}><span className="google-glyph">G</span> Continue with Google <ArrowRight size={17} /></Button>
        <p className="login-legal"><LockKeyhole size={13} /> Google OAuth · secure session · no Manus login</p>
        <div className="login-benefits">{benefits.map((benefit) => <div className="login-benefit" key={benefit}><span><Check size={14} /></span>{benefit}</div>)}</div>
        <div className="login-trust"><ShieldCheck size={18} /><div><strong>Private by default</strong><p>Your account actions stay behind authentication and protected server procedures.</p></div></div>
      </section>
      <footer className="login-footer">VirgoX File Share Hub <span>·</span> built with intent by VirgoYT</footer>
    </main>
  );
}
