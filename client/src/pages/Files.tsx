import { ArrowLeft, FileUp, FolderOpen, Upload } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Files() {
  const [, setLocation] = useLocation();
  const files = trpc.files.mine.useQuery({ limit: 100, offset: 0 }, { retry: false });
  return <main className="full-page-shell"><header className="full-page-header"><button className="messages-back" onClick={() => setLocation("/")} aria-label="Back to dashboard"><ArrowLeft size={20} /></button><div><span className="eyebrow"><FolderOpen size={13} /> Your space</span><h1>My files</h1><p>Your private files and original-quality uploads.</p></div><button className="hero-button" onClick={() => setLocation("/?upload=1")}><Upload size={15} /> Upload a file</button></header><section className="full-page-content"><div className="full-page-card">{files.isLoading ? <p className="messages-hint">Loading files…</p> : files.data?.length ? files.data.map((file) => <div className="full-page-row" key={file.id}><span className="full-page-icon"><FileUp size={16} /></span><span><strong>{file.originalName}</strong><small>{file.mimeType} · {Math.round(file.sizeBytes / 1024)} KB · {file.scanStatus}</small></span></div>) : <div className="full-page-empty"><FolderOpen size={30} /><strong>No uploaded files</strong><p>Upload a file to keep it in your private vault.</p></div>}</div></section></main>;
}
