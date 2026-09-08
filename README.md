# VirgoX File Share Hub

**VirgoX File Share Hub** is a premium social file-sharing platform by **VirgoYT**. It combines protected file transfers with creator profiles, short videos, groups, discovery, and a calm, editorial browsing experience.

## Product direction

VirgoX is designed as a creator-first network rather than a generic dashboard. The current interface uses a graphite foundation, electric violet accents, mint action states, editorial typography, cinematic media cards, and responsive layouts for desktop and mobile.

The first experience includes:

- Home feed with editorial discovery, trending signals, circle stories, and recommended short videos.
- Reels surface with a full-screen viewing entry point, recommendation cards, engagement controls, and video detail modal.
- Discovery surface with suggested creators, follower counts, follow state, trending tags, and creator call-to-action.
- Groups surface with public/private space concepts, group cards, secure-sharing notes, and creation entry point.
- Upload drawer for short videos, photos/posts, and secure file shares.
- Branded navigation, storage meter, creator identity, authentication entry, responsive mobile navigation, and premium interaction states.

## Secure domain foundation

The database schema is ready for the next implementation layers:

| Domain | Tables / capabilities |
| --- | --- |
| Identity | Manus-authenticated `users`, public `profiles`, follows, blocks |
| Groups | Public/private groups, owner/moderator/member roles, join status |
| Video | Three-minute duration guard, visibility, processing status, thumbnails, tags, hashtags, counters |
| Social | Likes, saves, shares, views, watch seconds, completion signal, comments, posts |
| Files | Owner/group scope, private-by-default visibility, storage key metadata, scan status |
| Trust & safety | Reports, moderation status, search history, block pairs |

All user-visible data access should remain behind server-side ownership, visibility, and role checks. Only storage keys—not file bytes—belong in the database.

## Security posture

The architecture follows the supplied five-check security guide:

1. Secrets remain in environment variables; never commit `.env` files or OAuth client secrets.
2. API responses use selected public fields rather than returning auth identifiers, tokens, or internal records.
3. Video creation validates title lengths and enforces a maximum duration of 180 seconds server-side.
4. Reporting is authenticated and validated with bounded target types, IDs, and reason lengths.
5. Uploaded media is intended to use the preconfigured secure storage layer, with private-by-default metadata and a scan status before publishing.

Before production launch, run secret scanning, personal-data flow review, dependency/build audit, authenticated route testing, upload abuse testing, rate limiting, security headers, restricted CORS, and an independent human security review. Any credential previously included in local files or Git history must be rotated immediately.

## Development

```bash
pnpm install
pnpm dev
pnpm check
pnpm test
pnpm build
```

The application is a Vite + React + TypeScript + Tailwind + Express + tRPC + Drizzle stack with Manus OAuth, MySQL/TiDB, and secure object storage support.

## Brand credit

**VirgoX File Share Hub · built with intent by VirgoYT**
