

## Plan: Add Post Likes

### Overview
Add a simple like (heart) button to each post. Users can toggle like on/off. Each post shows its like count.

### 1. Database Migration

Create `post_likes` table:

```sql
CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can add likes" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove likes" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
```

### 2. New Component: `src/components/feed/PostLikeButton.tsx`

- Heart icon button with like count
- Tapping toggles: INSERT if not liked, DELETE if already liked
- Optimistic UI: immediately toggle state, revert on error
- Animated heart scale + fill on like (Framer Motion spring)
- Props: `postId`, `initialLiked`, `initialCount`, `onToggle`

### 3. Modify `PostFeed.tsx`

- After fetching posts, batch-fetch like counts and user's likes for current post IDs:
  - `SELECT post_id, count(*) FROM post_likes WHERE post_id IN (...) GROUP BY post_id`
  - `SELECT post_id FROM post_likes WHERE user_id = current_user AND post_id IN (...)`
- Pass `likeCount` and `userLiked` as props to each `PostCard`

### 4. Modify `PostCard.tsx`

- Add `likeCount` and `userLiked` props to `PostCardProps`
- Render `<PostLikeButton>` between the content and the rating section

### Files
- **New migration** — `post_likes` table + RLS + realtime
- **New**: `src/components/feed/PostLikeButton.tsx`
- **Modified**: `src/components/feed/PostFeed.tsx` — fetch likes data, pass as props
- **Modified**: `src/components/feed/PostCard.tsx` — add like button, accept new props

