

# Plan: 4 Major Feature Additions

## Overview
Adding push notifications (service workers), achievement badges, a comment system, and infinite scroll to the Aura app. These features span database changes, new components, and modifications to existing ones.

---

## Feature 1: Push Notifications (Service Worker)

### What it does
When users receive a notification (friend request, rating, message) while the app is closed or in the background, they'll get a real push notification on their device.

### How it works
- Create a backend function that sends push notifications via the Web Push API
- Add a `push_subscriptions` table to store each user's push subscription
- Register the service worker subscription when users grant permission
- Trigger push from database triggers or the existing notification flow

### Technical details

**Database migration:**
- New `push_subscriptions` table: `id`, `user_id`, `endpoint`, `p256dh`, `auth`, `created_at`
- RLS: users can manage their own subscriptions

**Backend function (`send-push-notification`):**
- Receives notification payload, looks up user's push subscriptions, sends via web-push protocol
- Called from a database webhook or trigger on the `notifications` table

**Frontend changes:**
- Update `useNotifications` hook to subscribe the browser on permission grant, save subscription to `push_subscriptions`
- Update the service worker (via `vite-plugin-pwa`) to handle `push` and `notificationclick` events

**Secrets needed:**
- `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` (generated, no external service needed)

---

## Feature 2: Achievement Badges

### What it does
Users earn badges for milestones (first post, 7-day streak, 100 ratings given, etc.) displayed on their profile.

### Achievements list
| Badge | Condition |
|-------|-----------|
| First Post | Created 1 post |
| Social Butterfly | 10 friends |
| Streak Week | 7-day streak |
| Streak Month | 30-day streak |
| Century Rater | 100 ratings given |
| AURIX Rich | 1000 AURIX balance |
| Storyteller | 10 stories created |
| Generous | 10 transfers sent |

### Technical details

**Database migration:**
- New `achievements` table: `id`, `key` (unique slug), `name`, `description`, `icon` (emoji), `threshold`
- New `user_achievements` table: `id`, `user_id`, `achievement_key`, `unlocked_at`
- Unique constraint on `(user_id, achievement_key)`
- RLS: users can view all achievements; user_achievements viewable by all authenticated users
- Seed the `achievements` table with initial badge definitions
- Database function `check_achievements(p_user_id)` that checks all milestone conditions and inserts any newly earned badges, returning newly unlocked ones

**Frontend changes:**
- New `BadgeDisplay` component showing earned badges as emoji icons with tooltips
- Add badges section to `UserProfile.tsx` page
- Call `check_achievements` after key actions (posting, rating, streak claim) and show toast for new badges

---

## Feature 3: Comment System

### What it does
Users can comment on posts, creating threaded discussions below each post. Comments show author, timestamp, and content.

### Technical details

**Database migration:**
- New `comments` table: `id`, `post_id`, `user_id`, `content` (max 300 chars), `created_at`
- RLS: authenticated users can read all comments; users can insert with own `user_id`; users can delete their own comments
- Enable realtime on `comments` table
- Foreign key-style reference via `post_id` to posts (no actual FK to avoid cascade issues)

**Frontend changes:**
- New `CommentSection` component:
  - Expandable section at the bottom of each `PostCard`
  - Shows comment count, click to expand
  - Lists comments with avatar, username, timestamp, content
  - Input field to add a comment
  - Delete button for own comments
- Update `PostCard` to include `CommentSection` below the rating area
- Update `PostFeed` to optionally fetch comment counts per post (a count query or add a `comment_count` to post queries)

**Notification trigger:**
- New database trigger `notify_on_comment` that notifies the post owner when someone comments

---

## Feature 4: Infinite Scroll / Pagination

### What it does
Instead of loading 50 posts and stopping, the feed loads posts in pages of 20 as the user scrolls down, with a loading indicator at the bottom.

### Technical details

**Frontend changes to `PostFeed.tsx`:**
- Change from loading 50 posts to cursor-based pagination (using `created_at` as cursor)
- Load 20 posts per page
- Add `IntersectionObserver` sentinel element at the bottom of the feed
- When sentinel is visible, fetch next page and append
- Track `hasMore` state to stop fetching when no more posts
- Update filter logic to work with accumulated posts array
- Show a small spinner at the bottom while loading more

**No database changes needed** -- just changing the query to use `.lt('created_at', lastPostDate)` for pagination.

---

## Implementation Order

1. **Database migration** -- Create all new tables (`push_subscriptions`, `achievements`, `user_achievements`, `comments`) and seed data + functions + triggers in a single migration
2. **Infinite scroll** -- Modify `PostFeed.tsx` (no new components, quickest win)
3. **Comment system** -- New `CommentSection` component, update `PostCard`
4. **Achievement badges** -- New components, update `UserProfile`, hook into existing actions
5. **Push notifications** -- Edge function, service worker customization, subscription management

---

## Files to Create
- `src/components/feed/CommentSection.tsx`
- `src/components/badges/BadgeDisplay.tsx`
- `src/hooks/useAchievements.ts`
- `src/hooks/usePushNotifications.ts`
- `supabase/functions/send-push-notification/index.ts`

## Files to Modify
- `src/components/feed/PostFeed.tsx` (infinite scroll)
- `src/components/feed/PostCard.tsx` (add comment section)
- `src/pages/UserProfile.tsx` (add badges)
- `src/hooks/useNotifications.ts` (push subscription)
- `vite.config.ts` (custom service worker for push events)

