import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, FileUp, MessageCircle, Search, Send, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Friend = {
  id: number;
  name: string | null;
  displayName: string | null;
  username?: string | null;
};

function initials(friend: Friend) {
  return (friend.displayName ?? friend.name ?? friend.username ?? "V").slice(0, 1).toUpperCase();
}

export default function Messages() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [query, setQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [chatFile, setChatFile] = useState<File>();
  const friendsQuery = trpc.social.friends.useQuery(undefined, { enabled: isAuthenticated, retry: false, refetchInterval: 5000 });
  const friendSearch = trpc.profiles.search.useQuery({ query: query.trim() }, { enabled: isAuthenticated && query.trim().length >= 2, retry: false });
  const messagesQuery = trpc.social.messages.useQuery({ userId: selectedFriend?.id ?? 0 }, { enabled: Boolean(selectedFriend && isAuthenticated), refetchInterval: 5000, retry: false });
  const statusQuery = trpc.social.status.useQuery({ userId: selectedFriend?.id ?? 0 }, { enabled: Boolean(selectedFriend && isAuthenticated), refetchInterval: 2000, retry: false });
  const heartbeatMutation = trpc.social.heartbeat.useMutation();
  const typingMutation = trpc.social.typing.useMutation();
  const chatFileMutation = trpc.files.upload.useMutation();
  const requestFriendMutation = trpc.social.request.useMutation({
    onSuccess: () => toast.success("Friend request sent."),
    onError: (error) => toast.error(error.message || "Could not send the friend request."),
  });
  const sendMessageMutation = trpc.social.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText("");
      setChatFile(undefined);
      void messagesQuery.refetch();
    },
    onError: (error) => toast.error(error.message || "Could not send the message."),
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    void heartbeatMutation.mutateAsync().catch(() => undefined);
    const interval = window.setInterval(() => void heartbeatMutation.mutateAsync().catch(() => undefined), 20_000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedFriend || !messageText.trim()) return;
    typingMutation.mutate({ userId: selectedFriend.id, typing: true });
    const timeout = window.setTimeout(() => typingMutation.mutate({ userId: selectedFriend.id, typing: false }), 3_500);
    return () => window.clearTimeout(timeout);
  }, [messageText, selectedFriend?.id]);

  const readDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });

  const submitMessage = async () => {
    if (!selectedFriend || (!messageText.trim() && !chatFile)) return;
    const uploaded = chatFile
      ? await chatFileMutation.mutateAsync({ name: chatFile.name, mimeType: chatFile.type || "application/octet-stream", dataUrl: await readDataUrl(chatFile) })
      : undefined;
    sendMessageMutation.mutate({ userId: selectedFriend.id, body: messageText.trim() || undefined, fileId: uploaded?.id });
  };

  const friends = (friendsQuery.data ?? []) as Friend[];
  const displayName = (friend: Friend) => friend.displayName ?? friend.name ?? friend.username ?? "VirgoX member";

  return (
    <main className="messages-page">
      <header className="messages-header">
        <button className="messages-back" onClick={() => setLocation("/")} aria-label="Back to home"><ArrowLeft size={19} /></button>
        <div className="messages-brand"><MessageCircle size={20} /><div><strong>Messages</strong><small>Private conversations</small></div></div>
        <button className="messages-new" onClick={() => { setSelectedFriend(null); setQuery(""); }}><UserPlus size={16} /> New chat</button>
      </header>
      <div className="messages-layout">
        <aside className={`conversation-list ${selectedFriend ? "conversation-list-hidden-mobile" : ""}`}>
          <div className="conversation-title"><div><span className="eyebrow"><MessageCircle size={13} /> Inbox</span><h1>Your chats</h1></div><span>{friends.length}</span></div>
          <label className="messages-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people" /></label>
          {friendsQuery.isLoading && <div className="messages-empty"><strong>Loading chats…</strong></div>}
          {!friendsQuery.isLoading && friends.length > 0 && <div className="conversation-items">{friends.map((friend) => <button className={`conversation-item ${selectedFriend?.id === friend.id ? "selected" : ""}`} key={friend.id} onClick={() => setSelectedFriend(friend)}><span className="conversation-avatar">{initials(friend)}</span><span><strong>{displayName(friend)}</strong><small>@{friend.username ?? "member"}</small></span><MessageCircle size={15} /></button>)}</div>}
          {!friendsQuery.isLoading && friends.length === 0 && <div className="messages-empty"><Users size={28} /><strong>No friends yet</strong><p>Find someone to start a private conversation.</p></div>}
          {(friends.length === 0 || query.trim().length >= 2) && <div className="message-search-results">{query.trim().length < 2 ? <p className="messages-hint">Search by name or username to add your first friend.</p> : friendSearch.isLoading ? <p className="messages-hint">Searching members…</p> : friendSearch.data?.length ? friendSearch.data.map((friend) => <div className="message-search-result" key={friend.id}><span className="conversation-avatar">{initials(friend as Friend)}</span><span><strong>{friend.displayName}</strong><small>@{friend.username}</small></span><button disabled={requestFriendMutation.isPending} onClick={() => requestFriendMutation.mutate({ userId: friend.id })}><UserPlus size={14} /></button></div>) : <p className="messages-hint">No members found.</p>}</div>}
        </aside>
        <section className={`conversation-panel ${!selectedFriend ? "conversation-panel-empty" : ""}`}>
          {!selectedFriend ? <div className="messages-welcome"><MessageCircle size={42} /><h2>Choose a conversation</h2><p>Select a friend from your chats to continue messaging.</p><button onClick={() => setLocation("/")}><ArrowLeft size={15} /> Back to home</button></div> : <>
            <div className="conversation-header"><button className="mobile-chat-back" onClick={() => setSelectedFriend(null)} aria-label="Back to chats"><ArrowLeft size={18} /></button><span className="conversation-avatar">{initials(selectedFriend)}</span><div><strong>{displayName(selectedFriend)}</strong><small className={statusQuery.data?.online ? "presence-online" : "presence-offline"}>{statusQuery.data?.online ? "Online now" : "Offline"} · accepted friend</small></div></div>
            <div className="message-history">{statusQuery.data?.typing && <div className="typing-indicator"><span /><span /><span /> {displayName(selectedFriend)} is typing</div>}{messagesQuery.isLoading ? <div className="messages-empty"><strong>Loading conversation…</strong></div> : messagesQuery.error ? <div className="messages-empty"><strong>Could not load this conversation</strong><p>We couldn’t reach this chat right now. Your messages are safe.</p><button onClick={() => void messagesQuery.refetch()}>Try again</button></div> : messagesQuery.data?.length ? messagesQuery.data.map((message) => <div className={`chat-bubble ${message.senderId === user?.id ? "mine" : "theirs"}`} key={message.id}><span>{message.body || ""}</span>{message.fileName && <small><FileUp size={13} /> {message.fileUrl ? <a href={message.fileUrl} target="_blank" rel="noreferrer">{message.fileName}</a> : message.fileName}</small>}{message.senderId === user?.id && <small className="message-receipt">{message.readAt ? "Seen" : message.deliveredAt ? "Delivered" : "Sent"}</small>}</div>) : <div className="messages-empty"><MessageCircle size={28} /><strong>Start the conversation</strong><p>Say hello to {displayName(selectedFriend)}.</p></div>}</div>
            <div className="message-composer"><label className="message-attach" title="Attach a file"><FileUp size={18} /><input hidden type="file" onChange={(event) => setChatFile(event.target.files?.[0])} /></label><input value={messageText} onChange={(event) => setMessageText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitMessage(); } }} placeholder={`Message ${displayName(selectedFriend)}…`} /><button disabled={sendMessageMutation.isPending || chatFileMutation.isPending || (!messageText.trim() && !chatFile)} onClick={() => void submitMessage()}><Send size={16} /> Send</button></div>{chatFile && <p className="selected-file">{chatFile.name} attached</p>}
          </>}
        </section>
      </div>
    </main>
  );
}
