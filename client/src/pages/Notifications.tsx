import { ArrowLeft, Bell, FileUp, UserPlus } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Notifications() {
  const [, setLocation] = useLocation();
  const query = trpc.notifications.list.useQuery({ limit: 50, offset: 0 }, { refetchInterval: 5000, retry: false });
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => void query.refetch() });
  return <main className="full-page-shell"><header className="full-page-header"><button className="messages-back" onClick={() => setLocation("/")} aria-label="Back to dashboard"><ArrowLeft size={20} /></button><div><span className="eyebrow"><Bell size={13} /> Inbox</span><h1>Notifications</h1><p>Friend requests and received files only.</p></div></header><section className="full-page-content"><div className="full-page-card">{query.isLoading ? <p className="messages-hint">Loading notifications…</p> : query.data?.length ? query.data.map((item) => <button className={`full-page-row ${item.readAt ? "is-read" : ""}`} key={item.id} onClick={() => markRead.mutate({ notificationId: item.id })}><span className="full-page-icon">{item.type === "file_received" ? <FileUp size={16} /> : <UserPlus size={16} />}</span><span><strong>{item.title}</strong><small>{item.body ?? "Open to view details"}</small></span><small>{item.readAt ? "Read" : "New"}</small></button>) : <div className="full-page-empty"><Bell size={30} /><strong>No notifications yet</strong><p>Friend requests and received files will appear here.</p></div>}</div></section></main>;
}
