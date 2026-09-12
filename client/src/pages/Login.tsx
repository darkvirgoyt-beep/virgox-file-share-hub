import { ArrowRight, Check, FileUp, LockKeyhole, Play, ShieldCheck, Sparkles, Users } from "lucide-react";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";

const benefits = ["Send secure files and private links", "Follow creators and personalize your feed", "Upload posts, photos, and 3-minute videos"];

export default function Login() {
  return (
    <main className="login-page">
      <div className="login-orbit orbit-one" />
      <div className="login-orbit orbit-two" />
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-showcase">
          <div className="showcase-grid" />
          <div className="showcase-orbit orbit-showcase-one" />
          <div className="showcase-orbit orbit-showcase-two" />
          <div className="login-brand"><img className="brand-avatar" src="/virgox-avatar.png" alt="VirgoX" /><span><strong>VirgoX</strong><small>File Share Hub</small></span></div>
          <div className="login-kicker"><Sparkles size={14} /> Your space, protected</div>
          <h1 id="login-title">Make room for your <em>best signal.</em></h1>
          <p className="login-copy">A calmer place to share big files, find your people, and keep the moments that matter close.</p>
          <div className="showcase-chips"><span><ShieldCheck size={14} /> Private by default</span><span><FileUp size={14} /> Upload without friction</span></div>
          <div className="showcase-preview"><div className="preview-top"><span className="preview-live"><i /> Live workspace</span><span>03 / 24</span></div><div className="preview-title">Your next signal<br /><strong>starts here.</strong></div><div className="preview-bottom"><span><Users size={14} /> 2.4k creators</span><span><Play size={13} fill="currentColor" /> 12.8k moments</span></div></div>
        </div>
        <div className="login-form-panel">
          <div className="form-intro"><span className="form-eyebrow">Welcome back</span><h2>Enter your space.</h2><p>One secure sign-in unlocks your files, circles, and creative flow.</p></div>
          <Button className="google-login-button" onClick={startLogin}><span className="google-glyph">G</span> Continue with Google <ArrowRight size={17} /></Button>
          <p className="login-legal"><LockKeyhole size={13} /> Google OAuth · secure session</p>
          <div className="login-benefits">{benefits.map((benefit) => <div className="login-benefit" key={benefit}><span><Check size={14} /></span>{benefit}</div>)}</div>
          <div className="login-trust"><ShieldCheck size={18} /><div><strong>Built for trust</strong><p>Your account actions stay behind authentication and protected server procedures.</p></div></div>
        </div>
      </section>
      <footer className="login-footer">VirgoX File Share Hub <span>·</span> built with intent by VirgoYT</footer>
    </main>
  );
}
