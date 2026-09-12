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
};

const videos: VideoItem[] = [
  {
    id: 1,
    title: "The quiet architecture of a midnight city",
    creator: "Maya Lin",
    handle: "mayalin",
    avatar: "https://i.pravatar.cc/100?img=47",
    image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=88",
    category: "Visual diaries",
    duration: "0:42",
    likes: "18.4K",
    comments: "284",
    verified: true,
    tag: "For you",
  },
  {
    id: 2,
    title: "A soft reset for your creative process",
    creator: "Arlo Studio",
    handle: "arlostudio",
    avatar: "https://i.pravatar.cc/100?img=12",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=88",
    category: "Design process",
    duration: "1:08",
    likes: "9.8K",
    comments: "119",
    verified: true,
    tag: "Trending",
  },
  {
    id: 3,
    title: "Field notes from the edge of the map",
    creator: "Noah Kael",
    handle: "noahkael",
    avatar: "https://i.pravatar.cc/100?img=11",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=88",
    category: "Travel / film",
    duration: "2:14",
    likes: "24.1K",
    comments: "403",
    tag: "New today",
  },
  {
    id: 4,
    title: "Analog light studies, episode 04",
    creator: "Sora Kim",
    handle: "sorakim",
    avatar: "https://i.pravatar.cc/100?img=32",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=88",
    category: "Art & making",
    duration: "0:54",
    likes: "6.7K",
    comments: "87",
    verified: true,
  },
  {
    id: 5,
    title: "What a good morning sounds like",
    creator: "Lena Vale",
    handle: "lenavale",
    avatar: "https://i.pravatar.cc/100?img=5",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=88",
    category: "Slow living",
    duration: "1:26",
    likes: "12.2K",
    comments: "152",
  },
  {
    id: 6,
    title: "A practical guide to beautiful motion",
    creator: "Kofi Mensah",
    handle: "kofimakes",
    avatar: "https://i.pravatar.cc/100?img=68",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=88",
    category: "Creative tech",
    duration: "2:58",
    likes: "31.8K",
    comments: "512",
    verified: true,
    tag: "Staff pick",
  },
];

const creators = [
  { name: "Maya Lin", handle: "mayalin", followers: "82.4K", avatar: "https://i.pravatar.cc/100?img=47", accent: "violet", verified: true },
  { name: "Kofi Mensah", handle: "kofimakes", followers: "54.1K", avatar: "https://i.pravatar.cc/100?img=68", accent: "mint", verified: true },
  { name: "Noah Kael", handle: "noahkael", followers: "39.7K", avatar: "https://i.pravatar.cc/100?img=11", accent: "amber" },
  { name: "Sora Kim", handle: "sorakim", followers: "27.2K", avatar: "https://i.pravatar.cc/100?img=32", accent: "coral", verified: true },
];

const groups = [
  { name: "The Film Room", members: "12.8K members", category: "Visual storytelling", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=84", color: "violet" },
  { name: "Indie Builders", members: "8.4K members", category: "Product & code", image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=84", color: "mint" },
  { name: "Slow Club", members: "5.1K members", category: "Lifestyle & rituals", image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=84", color: "coral" },
];

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
        <img src={video.image} alt="" />
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
  const profileMutation = trpc.profiles.update.useMutation({ onSuccess: () => { profileQuery.refetch(); toast.success("Profile saved."); setShowSettings(false); } });
  const fileMutation = trpc.files.upload.useMutation({ onSuccess: (file) => { toast.success(`Uploaded ${file.sizeBytes} bytes securely.`); setShowUpload(false); setSelectedFile(undefined); } });
  const [section, setSection] = useState<Section>("home");
  const [search, setSearch] = useState("");
  const [friendQuery, setFriendQuery] = useState("");
  const [showFriends, setShowFriends] = useState(false);
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
    fileMutation.mutate({ name: selectedFile.name, mimeType: selectedFile.type || "application/octet-stream", dataUrl: await readDataUrl(selectedFile) });
  };
  const submitChatMessage = async () => {
    if (!chatFriend || (!messageText.trim() && !chatFile)) return;
    const uploaded = chatFile ? await chatFileMutation.mutateAsync({ name: chatFile.name, mimeType: chatFile.type || "application/octet-stream", dataUrl: await readDataUrl(chatFile) }) : undefined;
    sendMessageMutation.mutate({ userId: chatFriend.id, body: messageText || undefined, fileId: uploaded?.id });
  };

  const filteredVideos = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return videos;
    return videos.filter((video) => `${video.title} ${video.creator} ${video.handle} ${video.category}`.toLowerCase().includes(normalized));
  }, [search]);

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
          <button className="nav-item" onClick={() => requireAuth("send and manage files")}><FolderOpen size={18} /><span>My files</span></button>
          <button className="nav-item" onClick={() => requireAuth("send messages")}><MessageCircle size={18} /><span>Messages</span><span className="count-badge">3</span></button>
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

          {section === "home" && <>
            <section className="hero-grid">
              <div className="hero-card">
                <div className="hero-image"><img src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1800&q=90" alt="A sunlit creative studio" /><span className="hero-overlay" /></div>
                <div className="hero-content"><div className="hero-kicker"><Sparkles size={14} /> Vx / editorial pick</div><h2>Make space for<br /><em>good signal.</em></h2><p>The best ideas move slowly. Find people, files, and stories worth your attention.</p><button className="hero-button" onClick={() => setSection("discover")}>Explore the network <ArrowUpRight size={16} /></button></div>
                <div className="hero-index"><strong>01</strong><span>/ 04</span></div>
              </div>
              <div className="pulse-card"><div className="pulse-head"><span><span className="pulse-icon"><Flame size={14} /></span> What's moving</span><button onClick={() => setSection("discover")}>View all</button></div><div className="pulse-list"><div><span className="pulse-number">01</span><span className="pulse-copy"><strong>Soft architecture</strong><small>14.2K people are watching</small></span><span className="pulse-up">+28%</span></div><div><span className="pulse-number">02</span><span className="pulse-copy"><strong>Making in public</strong><small>8.9K people are watching</small></span><span className="pulse-up">+19%</span></div><div><span className="pulse-number">03</span><span className="pulse-copy"><strong>Analog mornings</strong><small>6.4K people are watching</small></span><span className="pulse-up">+11%</span></div></div><div className="pulse-footer"><TrendingUp size={15} /><span>Trending in your circles</span></div></div>
            </section>

            <section className="story-strip"><div className="story-label"><span className="eyebrow">Your circles</span><p>Fresh from people you follow</p></div>{creators.map((creator, index) => <button className="story-avatar" key={creator.handle} onClick={() => toast(`Opening @${creator.handle}'s profile.`)}><span className={`story-ring ${creator.accent}`}><Avatar src={creator.avatar} size="lg" /></span><small>{index === 0 ? "Your story" : creator.name.split(" ")[0]}</small>{index === 0 && <span className="story-plus"><Plus size={11} /></span>}</button>)}</section>

            <section className="content-section"><SectionHeader eyebrow="Picked for you" title="A better kind of scroll" action="See all" onAction={() => setSection("reels")} /><div className="video-grid">{filteredVideos.slice(0, 4).map((video) => <VideoCard key={video.id} video={video} onOpen={setPlaying} onRequireAuth={requireAuth} />)}</div></section>
          </>}

          {section === "reels" && <section className="content-section reels-section"><div className="reels-banner"><div><span className="eyebrow"><Play size={13} fill="currentColor" /> Full-screen mode</span><h2>Reels, tuned to your rhythm.</h2><p>Short films from the creators and corners of VirgoX you keep coming back to.</p></div><button className="hero-button" onClick={() => setPlaying(videos[0])}>Start watching <Play size={15} fill="currentColor" /></button></div><SectionHeader eyebrow="Your next watch" title="Because you liked visual diaries" action="Refresh" onAction={() => requireAuth("refresh personalized recommendations")} /><div className="video-grid video-grid-wide">{filteredVideos.map((video) => <VideoCard key={video.id} video={video} onOpen={setPlaying} onRequireAuth={requireAuth} />)}</div></section>}

          {section === "discover" && <section className="content-section discover-section"><div className="discover-intro"><div><span className="eyebrow"><Compass size={13} /> Network discovery</span><h2>Follow the spark.</h2><p>New accounts, emerging voices, and timely ideas worth making room for.</p></div><div className="discover-stat"><strong>2,480</strong><span>new creators this week</span></div></div><div className="creator-layout"><div><SectionHeader eyebrow="Suggested accounts" title="People to know" action="Refresh" onAction={() => toast("Suggestions refreshed.")} /><div className="creator-grid">{creators.map((creator) => <div className="creator-card" key={creator.handle}><div className={`creator-cover ${creator.accent}`} /><Avatar src={creator.avatar} size="lg" className="creator-avatar" /><div className="creator-card-body"><div className="creator-name"><strong>{creator.name}</strong>{creator.verified && <VerifiedMark />}</div><p>@{creator.handle}</p><span>{creator.followers} followers</span><button className={`follow-button ${followed.includes(creator.handle) ? "following" : ""}`} onClick={() => toggleFollow(creator.handle)}>{followed.includes(creator.handle) ? <><Check size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}</button></div></div>)}</div></div><aside className="discover-side"><div className="side-panel"><div className="side-panel-head"><span>Trending tags</span><MoreHorizontal size={16} /></div>{["#slowdesign", "#buildinpublic", "#visualdiary", "#filmmakers", "#softsystems"].map((tag, index) => <button className="tag-row" key={tag} onClick={() => setSearch(tag.slice(1))}><span>0{index + 1}</span><strong>{tag}</strong><small>{["18.2K", "12.9K", "9.3K", "7.8K", "5.2K"][index]} posts</small></button>)}</div><div className="mini-callout"><Zap size={17} /><strong>Make your mark</strong><p>Your next post could be the signal someone was waiting for.</p><button onClick={() => setShowUpload(true)}>Share something <ArrowUpRight size={14} /></button></div></aside></div></section>}

          {section === "groups" && <section className="content-section groups-section"><div className="groups-intro"><div><span className="eyebrow"><Users size={13} /> Shared spaces</span><h2>Find your people.</h2><p>Private rooms, public conversations, and files that stay exactly where they belong.</p></div><button className="hero-button" onClick={() => requireAuth("create a group", () => toast("Group creation is ready for the next phase."))}><Plus size={15} /> Create a group</button></div><div className="group-grid">{groups.map((group) => <button className="group-card" key={group.name} onClick={() => toast(`Opening ${group.name}.`)}><div className="group-image"><img src={group.image} alt="" /><span className={`group-lock ${group.color}`}><LockKeyhole size={13} /></span></div><div className="group-body"><span className="eyebrow">{group.category}</span><h3>{group.name}</h3><p>{group.members}</p><span className="group-link">Enter group <ArrowUpRight size={15} /></span></div></button>)}</div><div className="group-lower"><div className="group-note"><div className="note-icon"><ShieldCheck size={19} /></div><div><strong>Built for trust</strong><p>Every group has clear roles, private file access, and moderation tools from day one.</p></div><ArrowUpRight size={17} /></div><div className="group-note mint-note"><div className="note-icon"><FileUp size={19} /></div><div><strong>Share without friction</strong><p>Drop large files, photos, and videos into a room without losing control.</p></div><ArrowUpRight size={17} /></div></div></section>}

          <footer className="page-footer"><span><strong>VirgoX</strong> · a premium file-sharing social hub</span><span>Secure by default <ShieldCheck size={13} /> <i /> <a href="#privacy">Privacy</a> <a href="#about">About VirgoYT</a></span></footer>
        </div>
      </main>

      {playing && <div className="modal-backdrop" onClick={() => setPlaying(null)}><div className="video-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close icon-button" onClick={() => setPlaying(null)}><X size={19} /></button><div className="modal-media"><img src={playing.image} alt="" /><span className="modal-play"><Play size={28} fill="currentColor" /></span><div className="modal-progress"><span /></div></div><div className="modal-copy"><div><span className="eyebrow">{playing.category}</span><h2>{playing.title}</h2><p>By @{playing.handle} · {playing.likes} likes</p></div><button className="hero-button" onClick={() => toast("Share link copied.")}><Send size={15} /> Share</button></div></div></div>}

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
