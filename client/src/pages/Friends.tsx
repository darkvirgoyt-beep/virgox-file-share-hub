import * as React from "react";
import { ArrowLeft, Search, UserPlus, Users } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Friends() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = React.useState("");
  const requests = trpc.social.requests.useQuery(undefined, { retry: false });
  const friends = trpc.social.friends.useQuery(undefined, { retry: false });
  const recommendations = trpc.profiles.recommended.useQuery(undefined, { retry: false });
  const results = trpc.profiles.search.useQuery({ query: search.trim() }, { enabled: search.trim().length >= 2, retry: false });
  const request = trpc.social.request.useMutation({ onSuccess: () => toast.success("Friend request sent."), onError: (error) => toast.error(error.message) });
  const respond = trpc.social.respond.useMutation({ onSuccess: () => { void requests.refetch(); void friends.refetch(); } });
  return <main className="full-page-shell"><header className="full-page-header"><button className="messages-back" onClick={() => setLocation("/")} aria-label="Back to dashboard"><ArrowLeft size={20} /></button><div><span className="eyebrow"><Users size={13} /> Your circle</span><h1>Friends & requests</h1><p>Find people, accept requests, and start a chat.</p></div></header><section className="full-page-content friends-page-grid"><div className="full-page-card"><span className="eyebrow">Incoming requests</span>{requests.data?.length ? requests.data.map((item) => <div className="full-page-row" key={item.id}><span className="full-page-icon"><UserPlus size={16} /></span><span><strong>{item.displayName ?? item.requesterName}</strong><small>@{item.username ?? "member"}</small></span><button className="friend-add-button" onClick={() => respond.mutate({ requestId: item.id, status: "accepted" })}>Accept</button></div>) : <p className="messages-hint">No pending requests.</p>}</div><div className="full-page-card"><span className="eyebrow"><Search size={13} /> Find people</span><label className="discovery-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search related names or words…" /></label><div className="full-page-list">{search.trim().length >= 2 ? results.data?.map((person) => <div className="full-page-row" key={person.id}><span><strong>{person.displayName}</strong><small>@{person.username}</small></span><button className="friend-add-button" onClick={() => request.mutate({ userId: person.id })}>Add</button></div>) : recommendations.data?.map((person) => <div className="full-page-row" key={person.id}><span><strong>{person.displayName ?? person.name}</strong><small>@{person.username ?? "member"}</small></span><button className="friend-add-button" onClick={() => request.mutate({ userId: person.id })}>Add</button></div>)}</div></div></section></main>;
}
