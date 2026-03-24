

# Plan: Create Aura App Presentation (.pptx)

A polished PowerPoint deck covering all features of the Aura platform, designed for a professional presentation.

---

## Slide Outline (~15 slides)

1. **Title Slide** — "Aura: The Competitive Social Status Platform" with tagline and dark cinematic styling
2. **Problem Statement** — Why Gen-Z needs a new social platform; status, prestige, and gamification gap
3. **What is Aura?** — Platform overview: competitive social economy where reputation = currency
4. **AURIX Currency System** — How AURIX works: earning via ratings (-10 to +10), streaks, posts, daily spins; losing via negative ratings; transfer with 5% fee
5. **The Feed** — Post creation (text, multi-media carousels), rating system, trending/friends/hashtag filters, real-time updates
6. **Stories** — 24hr ephemeral content with reactions and AURIX ratings
7. **Social Features** — Friend system, user search, profile customization (vibes, interests, identity), college communities
8. **Chat & Communication** — Real-time messaging, voice notes, WebRTC audio/video calls, message reactions, post sharing
9. **Daily Spin & Rewards** — Gamified reward wheel with streak bonuses, cooldown system, 3D animated UI
10. **1v1 Battles** — AURIX wagering system: Blitz/Classic/Target/Theme modes, escrow, anti-cheat scoring formula
11. **Shop & Cosmetics** — Profile frames, name colors, themes, badges purchasable with AURIX
12. **Leaderboard & Achievements** — Global and college-specific rankings, badge system, streak tracking
13. **Safety & Moderation** — Profanity filter, user blocking, reporting system, abuse logging, RLS security
14. **Tech Stack** — React + Vite + TypeScript + Tailwind, Supabase backend, PWA support, real-time subscriptions
15. **What's Next / Thank You** — Future roadmap ideas, closing CTA

## Design

- **Color palette**: Dark theme (#0a0a0f base) with purple-to-pink neon gradients matching the app's aesthetic
- **Typography**: Bold headers (Arial Black), clean body (Calibri)
- **Visual elements**: Icon callouts, stat cards, feature grids, comparison layouts
- **Style**: Premium, cinematic, matching Aura's dark UI identity

## Technical Approach

- Generate using `pptxgenjs` (create from scratch)
- 16:9 widescreen format
- Dark background slides throughout for consistency with app branding
- Visual QA via LibreOffice PDF conversion + image inspection
- Output to `/mnt/documents/Aura_Presentation.pptx`

