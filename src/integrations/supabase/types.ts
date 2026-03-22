export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abuse_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      achievements: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          key: string
          name: string
          threshold: number
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string
          id?: string
          key: string
          name: string
          threshold?: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          key?: string
          name?: string
          threshold?: number
        }
        Relationships: []
      }
      aurix_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      battle_scores: {
        Row: {
          avg_rating: number
          battle_id: string
          engagement_score: number
          final_score: number
          id: string
          posts_count: number
          unique_raters: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_rating?: number
          battle_id: string
          engagement_score?: number
          final_score?: number
          id?: string
          posts_count?: number
          unique_raters?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_rating?: number
          battle_id?: string
          engagement_score?: number
          final_score?: number
          id?: string
          posts_count?: number
          unique_raters?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_scores_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_stats: {
        Row: {
          best_streak: number
          draws: number
          id: string
          losses: number
          total_battles: number
          total_earned: number
          total_lost: number
          updated_at: string
          user_id: string
          win_streak: number
          wins: number
        }
        Insert: {
          best_streak?: number
          draws?: number
          id?: string
          losses?: number
          total_battles?: number
          total_earned?: number
          total_lost?: number
          updated_at?: string
          user_id: string
          win_streak?: number
          wins?: number
        }
        Update: {
          best_streak?: number
          draws?: number
          id?: string
          losses?: number
          total_battles?: number
          total_earned?: number
          total_lost?: number
          updated_at?: string
          user_id?: string
          win_streak?: number
          wins?: number
        }
        Relationships: []
      }
      battles: {
        Row: {
          challenger_id: string
          created_at: string
          end_time: string | null
          id: string
          mode: Database["public"]["Enums"]["battle_mode"]
          opponent_id: string
          platform_fee: number
          stake: number
          start_time: string | null
          status: Database["public"]["Enums"]["battle_status"]
          target_score: number | null
          theme: string | null
          winner_id: string | null
        }
        Insert: {
          challenger_id: string
          created_at?: string
          end_time?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["battle_mode"]
          opponent_id: string
          platform_fee?: number
          stake: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["battle_status"]
          target_score?: number | null
          theme?: string | null
          winner_id?: string | null
        }
        Update: {
          challenger_id?: string
          created_at?: string
          end_time?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["battle_mode"]
          opponent_id?: string
          platform_fee?: number
          stake?: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["battle_status"]
          target_score?: number | null
          theme?: string | null
          winner_id?: string | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          answer: Json | null
          caller_id: string
          created_at: string
          ended_at: string | null
          id: string
          offer: Json | null
          receiver_id: string
          status: string
          type: string
        }
        Insert: {
          answer?: Json | null
          caller_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          offer?: Json | null
          receiver_id: string
          status?: string
          type?: string
        }
        Update: {
          answer?: Json | null
          caller_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          offer?: Json | null
          receiver_id?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      colleges: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_1?: string
          participant_2?: string
        }
        Relationships: []
      }
      friends: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      post_hashtags: {
        Row: {
          created_at: string
          hashtag: string
          id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          hashtag: string
          id?: string
          post_id: string
        }
        Update: {
          created_at?: string
          hashtag?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hashtags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      post_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          media_url: string
          position: number
          post_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type?: string
          media_url: string
          position?: number
          post_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string
          position?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          aurix_reward_claimed: boolean
          content: string
          created_at: string
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          aurix_reward_claimed?: boolean
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          aurix_reward_claimed?: boolean
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_year: string | null
          aurix_balance: number
          aurix_daily_earnings: number
          aurix_daily_losses: number
          aurix_lifetime_earned: number
          aurix_lifetime_lost: number
          avatar_url: string | null
          bio: string | null
          branch: string | null
          college_changed_at: string | null
          college_id: string | null
          created_at: string
          equipped_badge: string | null
          equipped_frame: string | null
          equipped_name_color: string | null
          equipped_theme: string | null
          gender: string | null
          highest_streak: number
          id: string
          interests: string[] | null
          last_login_date: string | null
          pronouns: string | null
          referral_code: string | null
          streak_count: number
          updated_at: string
          user_id: string
          username: string
          vibe_tags: string[] | null
        }
        Insert: {
          academic_year?: string | null
          aurix_balance?: number
          aurix_daily_earnings?: number
          aurix_daily_losses?: number
          aurix_lifetime_earned?: number
          aurix_lifetime_lost?: number
          avatar_url?: string | null
          bio?: string | null
          branch?: string | null
          college_changed_at?: string | null
          college_id?: string | null
          created_at?: string
          equipped_badge?: string | null
          equipped_frame?: string | null
          equipped_name_color?: string | null
          equipped_theme?: string | null
          gender?: string | null
          highest_streak?: number
          id?: string
          interests?: string[] | null
          last_login_date?: string | null
          pronouns?: string | null
          referral_code?: string | null
          streak_count?: number
          updated_at?: string
          user_id: string
          username: string
          vibe_tags?: string[] | null
        }
        Update: {
          academic_year?: string | null
          aurix_balance?: number
          aurix_daily_earnings?: number
          aurix_daily_losses?: number
          aurix_lifetime_earned?: number
          aurix_lifetime_lost?: number
          avatar_url?: string | null
          bio?: string | null
          branch?: string | null
          college_changed_at?: string | null
          college_id?: string | null
          created_at?: string
          equipped_badge?: string | null
          equipped_frame?: string | null
          equipped_name_color?: string | null
          equipped_theme?: string | null
          gender?: string | null
          highest_streak?: number
          id?: string
          interests?: string[] | null
          last_login_date?: string | null
          pronouns?: string | null
          referral_code?: string | null
          streak_count?: number
          updated_at?: string
          user_id?: string
          username?: string
          vibe_tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_equipped_badge_fkey"
            columns: ["equipped_badge"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_equipped_frame_fkey"
            columns: ["equipped_frame"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_equipped_name_color_fkey"
            columns: ["equipped_name_color"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_equipped_theme_fkey"
            columns: ["equipped_theme"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          post_id: string
          rater_id: string
          receiver_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          rater_id: string
          receiver_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          rater_id?: string
          receiver_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          revoked: boolean
          stage_1_completed: boolean
          stage_1_rewarded: boolean
          stage_2_completed: boolean
          stage_2_rewarded: boolean
          stage_3_completed: boolean
          stage_3_rewarded: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          revoked?: boolean
          stage_1_completed?: boolean
          stage_1_rewarded?: boolean
          stage_2_completed?: boolean
          stage_2_rewarded?: boolean
          stage_3_completed?: boolean
          stage_3_rewarded?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          revoked?: boolean
          stage_1_completed?: boolean
          stage_1_rewarded?: boolean
          stage_2_completed?: boolean
          stage_2_rewarded?: boolean
          stage_3_completed?: boolean
          stage_3_rewarded?: boolean
        }
        Relationships: []
      }
      reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string
          duration_days: number | null
          id: string
          is_permanent: boolean
          name: string
          preview_value: string
          price: number
          rarity: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          description: string
          duration_days?: number | null
          id?: string
          is_permanent?: boolean
          name: string
          preview_value: string
          price: number
          rarity?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string
          duration_days?: number | null
          id?: string
          is_permanent?: boolean
          name?: string
          preview_value?: string
          price?: number
          rarity?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cache"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      story_ratings: {
        Row: {
          created_at: string
          id: string
          rater_id: string
          receiver_id: string
          story_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          rater_id: string
          receiver_id: string
          story_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          rater_id?: string
          receiver_id?: string
          story_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "story_ratings_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount: number
          created_at: string
          fee: number
          id: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          fee?: number
          id?: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          fee?: number
          id?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_key: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_key_fkey"
            columns: ["achievement_key"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["key"]
          },
        ]
      }
      user_purchases: {
        Row: {
          expires_at: string | null
          id: string
          item_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          item_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          item_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leaderboard_cache: {
        Row: {
          aurix_balance: number | null
          avatar_url: string | null
          college_id: string | null
          rank: number | null
          streak_count: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_battle: { Args: { p_battle_id: string }; Returns: Json }
      check_achievements: { Args: never; Returns: Json }
      check_referral_milestones: { Args: never; Returns: Json }
      claim_daily_streak: { Args: never; Returns: Json }
      claim_post_reward: { Args: { p_post_id: string }; Returns: Json }
      claim_referral_reward: {
        Args: { p_referral_id: string; p_stage: number }
        Returns: Json
      }
      create_battle: {
        Args: {
          p_mode?: string
          p_opponent_id: string
          p_stake: number
          p_target_score?: number
          p_theme?: string
        }
        Returns: Json
      }
      decline_battle: { Args: { p_battle_id: string }; Returns: Json }
      equip_shop_item: { Args: { p_item_id: string }; Returns: Json }
      get_college_leaderboard: {
        Args: { p_college_id: string; p_limit?: number }
        Returns: {
          aurix_balance: number
          avatar_url: string
          rank: number
          streak_count: number
          username: string
        }[]
      }
      get_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          aurix_balance: number
          avatar_url: string
          college_id: string
          rank: number
          streak_count: number
          username: string
        }[]
      }
      get_or_create_conversation: {
        Args: { p_other_user_id: string }
        Returns: string
      }
      get_trending_posts: {
        Args: { p_limit?: number }
        Returns: {
          engagement_score: number
          post_id: string
        }[]
      }
      is_conversation_member: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      log_abuse: {
        Args: {
          p_action: string
          p_details?: Json
          p_severity?: string
          p_user_id: string
        }
        Returns: undefined
      }
      purchase_shop_item: { Args: { p_item_id: string }; Returns: Json }
      refresh_leaderboard_cache: { Args: never; Returns: undefined }
      register_referral: { Args: { p_referral_code: string }; Returns: Json }
      resolve_battle: { Args: { p_battle_id: string }; Returns: Json }
      submit_rating: {
        Args: { p_post_id: string; p_value: number }
        Returns: Json
      }
      submit_story_rating: {
        Args: { p_story_id: string; p_value: number }
        Returns: Json
      }
      transfer_aurix: {
        Args: { p_amount: number; p_receiver_username: string }
        Returns: Json
      }
      unequip_shop_item: { Args: { p_category: string }; Returns: Json }
    }
    Enums: {
      battle_mode: "classic" | "blitz" | "target" | "theme"
      battle_status:
        | "pending"
        | "active"
        | "completed"
        | "cancelled"
        | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      battle_mode: ["classic", "blitz", "target", "theme"],
      battle_status: ["pending", "active", "completed", "cancelled", "expired"],
    },
  },
} as const
