import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  ArrowUpRight,
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  Crown,
  FileUp,
  Flame,
  FolderOpen,
  Grid2X2,
  Heart,
  Image as ImageIcon,
  Layers3,
  LockKeyhole,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
type Section = "home" | "reels" | "discover" | "groups";

type VideoItem = {
  id: number;
  title: string;
  creator: string;
  handle: string;
  avatar: string;
  image: string;
  category: string;
  duration: string;
  likes: string;
  comments: string;
  verified?: boolean;
  tag?: string;
  mediaUrl: string;
  thumbnailUrl?: string | null;
};

const navItems: { id: Section; label: string; icon: typeof Compass }[] = [
  { id: "home", label: "Home feed", icon: Grid2X2 },
  { id: "reels", label: "Reels", icon: Play },
  { id: "discover", label: "Discover", icon: Compass },
  { id: "groups", label: "Groups", icon: Users },
];

function Avatar({ src, size = "md", className = "" }: { src: string; size?: "sm" | "md" | "lg"; className?: string }) {
  return <img className={`avatar avatar-${size} ${className}`} src={src} alt="" />;
}

function VerifiedMark() {
  return <span className="verified-mark" aria-label="Verified creator"><Check size={10} strokeWidth={3} /></span>;
}

function VideoCard({ video, onOpen, onRequireAuth }: { video: VideoItem; onOpen: (video: VideoItem) => void; onRequireAuth: (intent: string, action: () => void) => void }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <article className="video-card">
      <button className="video-cover" onClick={() => onOpen(video)} aria-label={`Play ${video.title}`}>
        <video src={video.mediaUrl} poster={video.thumbnailUrl ?? undefined} muted preload="metadata" aria-hidden="true" />
        <span className="cover-fade" />
        {video.tag && <span className="content-chip">{video.tag}</span>}
        <span className="duration-chip"><Clock3 size={12} /> {video.duration}</span>
        <span className="play-button"><Play size={17} fill="currentColor" /></span>
      </button>
      <div className="video-info">
        <div className="video-heading">
          <Avatar src={video.avatar} size="sm" />
          <div className="video-copy">
            <h3>{video.title}</h3>
            <p>@{video.handle} <span className="dot-separator">·</span> {video.category}</p>
          </div>
          <button className="icon-button subtle"><MoreHorizontal size={18} /></button>
        </div>
        <div className="video-actions">
          <button className={`metric-button ${liked ? "active-like" : ""}`} onClick={() => onRequireAuth("like videos", () => setLiked(!liked))}><Heart size={16} fill={liked ? "currentColor" : "none"} /> {liked ? "18.5K" : video.likes}</button>
          <button className="metric-button" onClick={() => onRequireAuth("comment on videos", () => toast("Comment composer ready for the next interaction pass."))}><MessageCircle size={16} /> {video.comments}</button>
          <button className={`metric-button compact ${saved ? "active-save" : ""}`} onClick={() => onRequireAuth("save videos", () => setSaved(!saved))}><Bookmark size={16} fill={saved ? "currentColor" : "none"} /></button>
          <button className="metric-button compact" onClick={() => onRequireAuth("share videos", () => toast("Share link copied."))}><Send size={16} /></button>
        </div>
      </div>
    </article>
  );
}

function SectionHeader({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  return <div className="section-header"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action && <button className="text-button" onClick={onAction}>{action}<ArrowUpRight size={15} /></button>}</div>;
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();
  const profileQuery = trpc.profiles.me.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const feedQuery = trpc.feed.public.useQuery({ limit: 50 }, { retry: false, refetchInterval: 15000 });
  const profileMutation = trpc.profiles.update.useMutation({ onSuccess: () => { profileQuery.refetch(); toast.success("Profile saved."); setShowSettings(false); } });
  const fileMutation = trpc.files.upload.useMutation({ onSuccess: (file) => { toast.success(`Uploaded ${file.sizeBytes} bytes securely.`); setShowUpload(false); setSelectedFile(undefined); } });
  const videoMutation = trpc.videos.createDraft.useMutation({ onSuccess: async () => { await feedQuery.refetch(); toast.success("Video published to Reels."); setShowUpload(false); setSelectedFile(undefined); } });
  const [section, setSection] = useState<Section>("home");
  const [search, setSearch] = useState("");
  const [friendQuery, setFriendQuery] = useState("");
  const [showFriends, setShowFriends] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [chatFriend, setChatFriend] = useState<{ id: number; displayName: string; username?: string | null } | null>(null);
  const [messageText, setMessageText] = useState("");
  const [chatFile, setChatFile] = useState<File>();
  const [showUpload, setShowUpload] = useState(false);
  const [playing, setPlaying] = useState<VideoItem | null>(null);
  const [followed, setFollowed] = useState<string[]>([]);
  const [mobileNav, setMobileNav] = useState(false);
  const friendSearch = trpc.profiles.search.useQuery({ query: friendQuery.trim() }, { enabled: showFriends && isAuthenticated && friendQuery.trim().length >= 2, retry: false });
  const requestsQuery = trpc.social.requests.useQuery(undefined, { enabled: showFriends && isAuthenticated, retry: false });
  const friendsQuery = trpc.social.friends.useQuery(undefined, { enabled: showFriends && isAuthenticated, retry: false });
  const notificationsQuery = trpc.notifications.list.useQuery({ limit: 30, offset: 0 }, { enabled: isAuthenticated, refetchInterval: 5000, retry: false });
  const filesQuery = trpc.files.mine.useQuery({ limit: 50, offset: 0 }, { enabled: showFiles && isAuthenticated, retry: false });
  const markNotificationMutation = trpc.notifications.markRead.useMutation({ onSuccess: () => { void notificationsQuery.refetch(); } });
  const messagesQuery = trpc.social.messages.useQuery({ userId: chatFriend?.id ?? 0 }, { enabled: Boolean(chatFriend && isAuthenticated), refetchInterval: 5000 });
  const requestFriendMutation = trpc.social.request.useMutation({
    onSuccess: () => { void requestsQuery.refetch(); toast.success("Friend request sent."); },
    onError: (error) => toast.error(error.message || "Could not send this request."),
  });
  const respondMutation = trpc.social.respond.useMutation({
    onSuccess: () => { void requestsQuery.refetch(); void friendsQuery.refetch(); void notificationsQuery.refetch(); toast.success("Request updated."); },
    onError: (error) => toast.error(error.message || "Could not update this request."),
  });
  const sendMessageMutation = trpc.social.sendMessage.useMutation({
    onSuccess: () => { setMessageText(""); setChatFile(undefined); void messagesQuery.refetch(); },
    onError: (error) => toast.error(error.message || "Could not send the message."),
  });
  const chatFileMutation = trpc.files.upload.useMutation();
  const [showSettings, setShowSettings] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [settingsUsername, setSettingsUsername] = useState("");
  const [settingsBio, setSettingsBio] = useState("");
  const [settingsAvatar, setSettingsAvatar] = useState<string>();
  const [selectedFile, setSelectedFile] = useState<File>();

  useEffect(() => {
    if (!profileQuery.data) return;
    setSettingsName(profileQuery.data.displayName);
    setSettingsUsername(profileQuery.data.username);
    setSettingsBio(profileQuery.data.bio ?? "");
  }, [profileQuery.data]);

  const readDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });

  const submitUpload = async () => {
    if (!selectedFile) return toast.error("Choose a file first.");
    const mimeType = selectedFile.type || "application/octet-stream";
    const dataUrl = await readDataUrl(selectedFile);
    if (mimeType.startsWith("video/")) {
      const durationSeconds = await new Promise<number>((resolve) => {
        const probe = document.createElement("video");
        probe.preload = "metadata";
        probe.onloadedmetadata = () => { URL.revokeObjectURL(probe.src); resolve(Math.max(1, Math.round(probe.duration || 1))); };
        probe.onerror = () => resolve(1);
        probe.src = URL.createObjectURL(selectedFile);
      });
      const uploaded = await fileMutation.mutateAsync({ name: selectedFile.name, mimeType, dataUrl });
      videoMutation.mutate({ title: selectedFile.name.replace(/\.[^.]+$/, ""), storageKey: uploaded.key, durationSeconds, visibility: "public" });
      return;
    }
    fileMutation.mutate({ name: selectedFile.name, mimeType, dataUrl });
  };
  const submitChatMessage = async () => {
    if (!chatFriend || (!messageText.trim() && !chatFile)) return;
    const uploaded = chatFile ? await chatFileMutation.mutateAsync({ name: chatFile.name, mimeType: chatFile.type || "application/octet-stream", dataUrl: await readDataUrl(chatFile) }) : undefined;
    sendMessageMutation.mutate({ userId: chatFriend.id, body: messageText || undefined, fileId: uploaded?.id });
  };

  const realVideos: VideoItem[] = (feedQuery.data ?? []).map((video) => ({
    id: video.id,
    title: video.title,
    creator: video.creatorName ?? "VirgoX member",
    handle: video.creatorUsername ?? "member",
    avatar: video.creatorAvatarUrl ? `/manus-storage/${video.creatorAvatarUrl}` : "https://i.pravatar.cc/100?img=13",
    image: video.thumbnailUrl ?? video.mediaUrl,
    mediaUrl: video.mediaUrl,
    thumbnailUrl: video.thumbnailUrl,
    category: video.category ?? "Uploaded video",
    duration: `${Math.floor(video.durationSeconds / 60)}:${String(video.durationSeconds % 60).padStart(2, "0")}`,
    likes: String(video.likesCount),
    comments: String(video.commentsCount),
  }));
  const filteredVideos = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return realVideos;
    return realVideos.filter((video) => `${video.title} ${video.creator} ${video.handle} ${video.category}`.toLowerCase().includes(normalized));
  }, [realVideos, search]);

  const toggleFollow = (handle: string) => {
    requireAuth("follow creators", () => setFollowed((current) => current.includes(handle) ? current.filter((item) => item !== handle) : [...current, handle]));
  };

  const sectionTitle = section === "home" ? "Your daily signal" : section === "reels" ? "Reels, tuned to you" : section === "discover" ? "Find your next rabbit hole" : "Places to make something together";

  const requireAuth = (intent: string, action?: () => void) => {
    if (!isAuthenticated) {
      toast(`Sign in or create an account to ${intent}.`);
      startLogin();
      return;
    }
    action?.();
  };

  return (
    <div className="app-shell">
      <aside className={`side-rail ${mobileNav ? "mobile-open" : ""}`}>
        <div className="brand-lockup">
          <img className="brand-avatar" src="/virgox-avatar.png" alt="VirgoX" />
          <div><strong>VirgoX</strong><small>File Share Hub</small></div>
        </div>
        <button className="mobile-close icon-button" onClick={() => setMobileNav(false)}><X size={19} /></button>

        <div className="rail-label">Workspace</div>
        <nav className="primary-nav">
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${section === id ? "active" : ""}`} onClick={() => { setSection(id); setMobileNav(false); }}><Icon size={18} /><span>{label}</span>{id === "reels" && <span className="nav-ping" />}</button>)}
        </nav>

        <div className="rail-label rail-label-spaced">Your space</div>
        <nav className="secondary-nav">
          <button className="nav-item" onClick={() => requireAuth("find and add friends", () => setShowFriends(true))}><UserPlus size={18} /><span>Add friends</span></button>
          <button className="nav-item" onClick={() => requireAuth("view saved videos")}><Bookmark size={18} /><span>Saved</span></button>
          <button className="nav-item" onClick={() => requireAuth("view your files", () => setShowFiles(true))}><FolderOpen size={18} /><span>My files</span></button>
          <button className="nav-item" onClick={() => requireAuth("send messages", () => setShowFriends(true))}><MessageCircle size={18} /><span>Messages</span><span className="count-badge">3</span></button>
        </nav>

        <div className="rail-spacer" />
        <div className="storage-card">
          <div className="storage-top"><span><ShieldCheck size={15} /> Secure vault</span><span>{isAuthenticated ? "0%" : "—"}</span></div>
          <div className={`storage-bar ${!isAuthenticated ? "storage-bar-locked" : ""}`}><span /></div>
          <p>{isAuthenticated ? "0 GB of 10 GB used" : "Sign in to view your storage"}</p>
          <button onClick={() => requireAuth("open your secure space")}><Crown size={14} /> {isAuthenticated ? "Upgrade space" : "Sign in to unlock"}</button>
        </div>
        <div className="rail-footer">
          <button className={`user-row ${!isAuthenticated ? "user-row-guest" : ""}`} onClick={() => isAuthenticated ? setShowSettings(true) : startLogin()}>
            {isAuthenticated && profileQuery.data?.avatarUrl ? <img className="avatar avatar-sm" src={`/manus-storage/${profileQuery.data.avatarUrl}`} alt="" /> : isAuthenticated ? <Avatar src="https://i.pravatar.cc/100?img=13" size="sm" /> : <span className="guest-avatar"><UserPlus size={16} /></span>}
            <span><strong>{loading ? "Checking session…" : user?.name || "Guest visitor"}</strong><small>{loading ? "Please wait" : isAuthenticated ? `@${user?.name?.toLowerCase().replace(/\s+/g, "") || "virgoyt"}` : "Sign in to your account"}</small></span>
            {isAuthenticated ? <Settings2 size={16} /> : <ArrowUpRight size={16} />}
          </button>
          <p>Built with intent · VirgoYT</p>
        </div>
      </aside>

      {mobileNav && <button className="mobile-backdrop" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <main className="main-stage">
        <header className="topbar">
          <div className="mobile-title"><button className="icon-button" onClick={() => setMobileNav(true)}><Menu size={20} /></button><strong>VirgoX</strong></div>
          <div className="search-wrap"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search creators, videos, groups..." /><kbd>⌘ K</kbd></div>
          <div className="top-actions">
            <button className="icon-button notification-button" onClick={() => requireAuth("view notifications", () => setShowNotifications(true))}><Bell size={18} />{notificationsQuery.data?.some((notification) => !notification.readAt) && <i />}</button>
            <button className="create-button" onClick={() => requireAuth("create uploads and posts", () => setShowUpload(true))}><Plus size={17} /> Create</button>
            {isAuthenticated ? <button className="top-avatar" onClick={() => setShowSettings(true)} title="Open profile settings">{profileQuery.data?.avatarUrl ? <img className="avatar avatar-sm" src={`/manus-storage/${profileQuery.data.avatarUrl}`} alt="" /> : <Avatar src="https://i.pravatar.cc/100?img=13" size="sm" />}</button> : <button className="sign-in-button" onClick={() => startLogin()}>Sign in</button>}
          </div>
        </header>

        <div className="content-wrap">
          <div className="welcome-row">
            <div><p className="eyebrow"><span className="live-dot" /> Tuesday, September 08, 2026</p><h1>{sectionTitle}</h1><p className="lede">A considered space for the things you want to keep, share, and discover.</p></div>
            <div className="welcome-tools"><button className="filter-button" onClick={() => requireAuth("curate your personalized feed")}><Layers3 size={16} /> Curate feed <ChevronDown size={14} /></button><button className="round-create" onClick={() => requireAuth("create uploads and posts", () => setShowUpload(true))}><Upload size={17} /></button></div>
          </div>

          {section === "home" && <section className="content-section"><SectionHeader eyebrow="Published uploads" title="Your real feed" action="Open Reels" onAction={() => setSection("reels")} />{feedQuery.isLoading ? <div className="friend-empty"><strong>Loading uploaded videos…</strong></div> : filteredVideos.length ? <div className="video-grid">{filteredVideos.slice(0, 12).map((video) => <VideoCard key={video.id} video={video} onOpen={setPlaying} onRequireAuth={requireAuth} />)}</div> : <div className="friend-empty"><Video size={28} /><strong>No uploaded videos yet</strong><p>Upload a video with Create and it will appear here and in Reels.</p><button className="hero-button" onClick={() => requireAuth("upload a video", () => setShowUpload(true))}><Upload size={15} /> Upload a video</button></div>}</section>}

          {section === "reels" && <section className="content-section reels-section"><div className="reels-banner"><div><span className="eyebrow"><Play size={13} fill="currentColor" /> Uploaded videos only</span><h2>Reels from VirgoX uploads.</h2><p>No generated trends or placeholder videos. This feed is built from published uploads.</p></div>{filteredVideos[0] && <button className="hero-button" onClick={() => setPlaying(filteredVideos[0])}>Start watching <Play size={15} fill="currentColor" /></button>}</div><SectionHeader eyebrow="Latest uploads" title="Reels" action="Refresh" onAction={() => void feedQuery.refetch()} />{feedQuery.isLoading ? <div className="friend-empty"><strong>Loading uploaded videos…</strong></div> : filteredVideos.length ? <div className="video-grid video-grid-wide">{filteredVideos.map((video) => <VideoCard key={video.id} video={video} onOpen={setPlaying} onRequireAuth={requireAuth} />)}</div> : <div className="friend-empty"><Video size={28} /><strong>No content</strong><p>There are no published videos yet. Upload the first Reel to get started.</p><button className="hero-button" onClick={() => requireAuth("upload a video", () => setShowUpload(true))}><Upload size={15} /> Upload video</button></div>}</section>}
          {section === "discover" && <section className="content-section discover-section"><div className="discover-intro"><div><span className="eyebrow"><Compass size={13} /> Network discovery</span><h2>Discover real members.</h2><p>Search for people who have actually joined VirgoX and connect with them.</p></div><button className="hero-button" onClick={() => requireAuth("find members", () => setShowFriends(true))}><Users size={15} /> Find members</button></div><div className="friend-empty"><Users size={28} /><strong>No public recommendations yet</strong><p>VirgoX does not invent creators or trends. Use Add friends to search real accounts.</p><button className="hero-button" onClick={() => requireAuth("find members", () => setShowFriends(true))}><Search size={15} /> Search members</button></div></section>}

          {section === "groups" && <section className="content-section groups-section"><div className="groups-intro"><div><span className="eyebrow"><Users size={13} /> Shared spaces</span><h2>Groups are built from real members.</h2><p>No sample groups are shown. Group creation will appear here when enabled for your account.</p></div><button className="hero-button" onClick={() => requireAuth("create a group", () => toast("Group creation is not enabled yet for this account."))}><Plus size={15} /> Create a group</button></div><div className="friend-empty"><Users size={28} /><strong>No groups yet</strong><p>There are no published groups to display.</p></div></section>}

          <footer className="page-footer"><span><strong>VirgoX</strong> · a premium file-sharing social hub</span><span>Secure by default <ShieldCheck size={13} /> <i /> <a href="#privacy">Privacy</a> <a href="#about">About VirgoYT</a></span></footer>
        </div>
      </main>

      {playing && <div className="modal-backdrop" onClick={() => setPlaying(null)}><div className="video-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close icon-button" onClick={() => setPlaying(null)}><X size={19} /></button><div className="modal-media"><video src={playing.mediaUrl} poster={playing.thumbnailUrl ?? undefined} controls autoPlay playsInline /><div className="modal-progress"><span /></div></div><div className="modal-copy"><div><span className="eyebrow">{playing.category}</span><h2>{playing.title}</h2><p>By @{playing.handle} · {playing.likes} likes</p></div><button className="hero-button" onClick={() => { void navigator.clipboard?.writeText(window.location.href); toast("Link copied."); }}><Send size={15} /> Share</button></div></div></div>}

      {showFiles && <div className="modal-backdrop" onClick={() => setShowFiles(false)}><div className="friends-drawer notification-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow"><FolderOpen size={13} /> Your files</span><h2>Private storage.</h2><p className="drawer-subtitle">Files uploaded to your VirgoX account.</p></div><button className="icon-button" onClick={() => setShowFiles(false)}><X size={19} /></button></div><div className="friend-results">{filesQuery.isLoading ? <div className="friend-empty"><strong>Loading files…</strong></div> : filesQuery.data?.length ? filesQuery.data.map((file) => <div className="friend-result" key={file.id}><span className="friend-initial"><FileUp size={15} /></span><span><strong>{file.originalName}</strong><small>{file.mimeType} · {Math.round(file.sizeBytes / 1024)} KB · {file.scanStatus}</small></span></div>) : <div className="friend-empty"><FolderOpen size={22} /><strong>No uploaded files</strong><p>Use Create to upload a file or video.</p></div>}</div><button className="hero-button" onClick={() => { setShowFiles(false); setShowUpload(true); }}><Upload size={15} /> Upload a file</button></div></div>}
      {showNotifications && <div className="modal-backdrop" onClick={() => setShowNotifications(false)}><div className="friends-drawer notification-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow"><Bell size={13} /> Inbox</span><h2>Your notifications.</h2><p className="drawer-subtitle">Friend requests and messages appear here. Tap a request to open it.</p></div><button className="icon-button" onClick={() => setShowNotifications(false)}><X size={19} /></button></div><div className="friend-results">{notificationsQuery.isLoading ? <div className="friend-empty"><strong>Loading notifications…</strong></div> : notificationsQuery.data?.length ? notificationsQuery.data.map((notification) => <button className={`friend-result notification-row ${notification.readAt ? "is-read" : ""}`} key={notification.id} onClick={() => { markNotificationMutation.mutate({ notificationId: notification.id }); if (notification.type === "friend_request" || notification.type === "friend_request_accepted") { setShowNotifications(false); setShowFriends(true); void requestsQuery.refetch(); void friendsQuery.refetch(); } }}><span className="friend-initial">{notification.type === "friend_request" ? "FR" : notification.type === "friend_request_accepted" ? "OK" : "VX"}</span><span><strong>{notification.title}</strong><small>{notification.body || "Open to view details"}</small></span><ArrowUpRight size={15} /></button>) : <div className="friend-empty"><Bell size={22} /><strong>No notifications yet</strong><p>New friend requests will appear here.</p></div>}</div></div></div>}
      {showFriends && <div className="modal-backdrop" onClick={() => setShowFriends(false)}><div className="friends-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head"><div><span className="eyebrow"><UserPlus size={13} /> Your circle</span><h2>{chatFriend ? `Chat with ${chatFriend.displayName}` : "Build your circle."}</h2><p className="drawer-subtitle">{chatFriend ? "Private messages and file sharing for accepted friends." : "Requests must be accepted before chat and file sharing are unlocked."}</p></div><button className="icon-button" onClick={() => chatFriend ? setChatFriend(null) : setShowFriends(false)}><X size={19} /></button></div>
        {chatFriend ? <div className="friend-chat-panel"><div className="friend-chat-messages">{messagesQuery.isLoading ? <div className="friend-empty"><strong>Loading conversation…</strong></div> : messagesQuery.data?.length ? messagesQuery.data.map((message) => <div className={`friend-chat-message ${message.senderId === user?.id ? "mine" : "theirs"}`} key={message.id}><span>{message.body || ""}</span>{message.fileName && <small><FileUp size={12} /> {message.fileUrl ? <a href={message.fileUrl} target="_blank" rel="noreferrer">{message.fileName}</a> : message.fileName}</small>}</div>) : <div className="friend-empty"><MessageCircle size={22} /><strong>Start a private conversation</strong><p>Send a message or attach a file.</p></div>}</div><div className="friend-chat-compose"><input value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Write a message…" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitChatMessage(); } }} /><label className="icon-button" title="Attach a file"><FileUp size={17} /><input hidden type="file" onChange={(event) => setChatFile(event.target.files?.[0])} /></label><button className="hero-button" disabled={sendMessageMutation.isPending || chatFileMutation.isPending || (!messageText.trim() && !chatFile)} onClick={() => void submitChatMessage()}><Send size={15} /> Send</button></div>{chatFile && <p className="drawer-foot"><FileUp size={13} /> {chatFile.name} selected. It will be uploaded securely with your message.</p>}</div> : <><div className="friend-request-section"><span className="eyebrow">Incoming requests</span>{requestsQuery.data?.length ? requestsQuery.data.map((request) => <div className="friend-result" key={request.id}><span className="friend-initial">{(request.displayName ?? request.requesterName ?? "V").slice(0, 1).toUpperCase()}</span><span><strong>{request.displayName ?? request.requesterName}</strong><small>@{request.username ?? "member"}</small></span><button className="friend-add-button" onClick={() => respondMutation.mutate({ requestId: request.id, status: "accepted" })}><Check size={14} /> Accept</button><button className="friend-add-button" onClick={() => respondMutation.mutate({ requestId: request.id, status: "declined" })}>Decline</button></div>) : <p className="drawer-foot">No pending requests.</p>}</div><div className="friend-request-section"><span className="eyebrow">Your friends</span>{friendsQuery.data?.length ? friendsQuery.data.map((friend) => <div className="friend-result" key={friend.id}><span className="friend-initial">{friend.displayName?.slice(0, 1).toUpperCase() ?? "V"}</span><span><strong>{friend.displayName ?? friend.name ?? "VirgoX member"}</strong><small>@{friend.username ?? "member"}</small></span><button className="friend-add-button" onClick={() => setChatFriend({ id: friend.id, displayName: friend.displayName ?? friend.name ?? "VirgoX member", username: friend.username })}><MessageCircle size={14} /> Chat</button></div>) : <p className="drawer-foot">Accepted friends will appear here.</p>}</div><div className="friend-search-input"><Search size={16} /><input autoFocus value={friendQuery} onChange={(event) => setFriendQuery(event.target.value)} placeholder="Search name or username…" /><kbd>⌘ K</kbd></div><div className="friend-results">{friendQuery.trim().length < 2 ? <div className="friend-empty"><Users size={22} /><strong>Find real VirgoX members</strong><p>Enter at least two characters to search logged-in accounts.</p></div> : friendSearch.isLoading ? <div className="friend-empty"><strong>Searching members…</strong></div> : friendSearch.error ? <div className="friend-empty"><strong>Session expired</strong><p>Please sign in again to search members.</p></div> : friendSearch.data?.length ? friendSearch.data.map((friend) => <div className="friend-result" key={friend.id}><span className="friend-initial">{friend.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{friend.displayName}</strong><small>@{friend.username}</small></span><button className="friend-add-button" disabled={requestFriendMutation.isPending} onClick={() => requestFriendMutation.mutate({ userId: friend.id })}><UserPlus size={14} /> Request</button></div>) : <div className="friend-empty"><Users size={22} /><strong>No logged-in members found</strong><p>Try their name or username.</p></div>}</div></>}
      </div></div>}
      {showUpload && <div className="modal-backdrop" onClick={() => setShowUpload(false)}><div className="upload-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow"><Upload size={13} /> New upload</span><h2>Upload to your private vault.</h2></div><button className="icon-button" onClick={() => setShowUpload(false)}><X size={19} /></button></div><div className="drop-zone"><div className="drop-icon"><Upload size={24} /></div><strong>{selectedFile?.name ?? "Choose a file from your device"}</strong><p>Private storage · maximum 35 MB</p><input type="file" onChange={(event) => setSelectedFile(event.target.files?.[0])} /><button disabled={!selectedFile || fileMutation.isPending} onClick={submitUpload}><FileUp size={15} /> {fileMutation.isPending ? "Uploading…" : "Upload securely"}</button></div><p className="drawer-foot"><ShieldCheck size={13} /> Private by default</p></div></div>}
      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><div className="upload-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow"><Settings2 size={13} /> Account settings</span><h2>Edit your profile.</h2></div><button className="icon-button" onClick={() => setShowSettings(false)}><X size={19} /></button></div><label>Display name<input value={settingsName} onChange={(e) => setSettingsName(e.target.value)} /></label><label>Username<input value={settingsUsername} onChange={(e) => setSettingsUsername(e.target.value)} /></label><label>Bio<textarea value={settingsBio} onChange={(e) => setSettingsBio(e.target.value)} /></label><label>Profile photo<input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setSettingsAvatar(await readDataUrl(file)); }} /></label><button className="hero-button" disabled={profileMutation.isPending} onClick={() => profileMutation.mutate({ username: settingsUsername, displayName: settingsName, bio: settingsBio || null, avatarDataUrl: settingsAvatar })}>{profileMutation.isPending ? "Saving…" : "Save profile"}</button></div></div>}
    </div>
  );
}
