

## Plan: 4 Major Feed Features

This plan adds four new features to the feed: Trending tab, Media Carousel posts, Post Sharing (to chat), and Hashtags.

---

### 1. Database Changes (Migration)

**New table: `post_media`** -- supports multiple media per post
- `id` (uuid, PK)
- `post_id` (uuid, references posts)
- `media_url` (text)
- `media_type` (text, default 'image') -- image/video
- `position` (integer, default 0) -- ordering
- `created_at` (timestamptz)
- RLS: SELECT for authenticated, INSERT for own posts

**New table: `post_hashtags`** -- stores hashtag-to-post mappings
- `id` (uuid, PK)
- `post_id` (uuid)
- `hashtag` (text) -- lowercase, no `#` prefix
- `created_at` (timestamptz)
- RLS: SELECT for all authenticated, INSERT via post owner

**New database function: `get_trending_posts`** -- returns post IDs ranked by engagement in last 24h
- Counts sparks (post_likes), ratings, and comments per post from the last 24 hours
- Returns post IDs ordered by total engagement score
- Parameters: `p_limit` (integer, default 20)

**Enable realtime** on `post_media` table.

---

### 2. Trending/Hot Feed Tab

**Files modified:**
- `src/components/feed/PostFeed.tsx`

**Changes:**
- Add `"trending"` to the `FeedFilter` type (becomes `"all" | "friends" | "mine" | "trending"`)
- Add a Flame icon tab labeled "Trending" to the filter bar
- When `filter === "trending"`, call the `get_trending_posts` RPC instead of the regular chronological query
- Fetch those post IDs, then load full post data with profiles for display
- Trending posts show a small rank badge (gold #1, silver #2, bronze #3)

---

### 3. Media Carousel Posts

**Files modified:**
- `src/components/feed/CreatePostForm.tsx` -- allow selecting multiple files
- `src/components/feed/PostCard.tsx` -- render carousel when multiple media exist
- `src/components/feed/PostFeed.tsx` -- fetch `post_media` alongside posts

**How it works:**
- In `CreatePostForm`, change from single file to an array of up to 5 files
- On submit, upload all files to `post-images` bucket, then insert rows into `post_media`
- The existing single `image_url` on `posts` remains for backward compatibility (first image)
- `PostCard` checks if a post has multiple media items; if so, renders an Embla carousel (already installed) with dots indicator and swipe support
- Single-image posts continue to render as before (no carousel chrome)

---

### 4. Post Sharing (to Chat)

**Files modified:**
- `src/components/feed/PostCard.tsx` -- add Share button
- New file: `src/components/feed/SharePostDialog.tsx` -- dialog to pick a friend to share with

**How it works:**
- A `Share` icon button appears next to the Spark button on each post
- Clicking it opens a dialog listing the user's friends (fetched from `friends` table where status = accepted)
- Selecting a friend calls `get_or_create_conversation` RPC, then sends a message with a special format: `__shared_post:<post_id>` 
- The chat message renderer (`ChatBubble.tsx`) detects the `__shared_post:` prefix and renders an embedded post preview card instead of plain text
- This follows the same pattern already used for `__call:` system messages

---

### 5. Hashtags and Topics

**Files modified:**
- `src/components/feed/CreatePostForm.tsx` -- auto-extract hashtags on submit
- `src/components/feed/PostCard.tsx` -- render hashtags as clickable links
- `src/components/feed/PostFeed.tsx` -- add hashtag filter state and query
- New file: `src/components/feed/HashtagRenderer.tsx` -- renders post content with clickable #tags

**How it works:**
- On post creation, extract all `#word` patterns from content, insert into `post_hashtags`
- `HashtagRenderer` component parses post content, wrapping `#tags` in clickable styled spans
- Clicking a hashtag sets a `hashtagFilter` state in `PostFeed`, which queries `post_hashtags` to find matching post IDs, then filters the feed
- An active hashtag filter shows as a dismissible chip above the feed
- Hashtags are stored lowercase for case-insensitive matching

---

### Technical Summary

| Feature | New Tables | New Files | Modified Files |
|---------|-----------|-----------|---------------|
| Trending | - | - | PostFeed.tsx |
| Media Carousel | post_media | - | CreatePostForm.tsx, PostCard.tsx, PostFeed.tsx |
| Post Sharing | - | SharePostDialog.tsx | PostCard.tsx, ChatBubble.tsx |
| Hashtags | post_hashtags | HashtagRenderer.tsx | CreatePostForm.tsx, PostCard.tsx, PostFeed.tsx |

**Database migration** creates `post_media`, `post_hashtags` tables with RLS, and the `get_trending_posts` function -- all in a single migration.

