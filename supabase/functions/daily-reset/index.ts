import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Reset daily earnings/losses for all profiles
    const { error: resetError } = await supabase
      .from("profiles")
      .update({ aurix_daily_earnings: 0, aurix_daily_losses: 0 })
      .neq("aurix_daily_earnings", 0)
      .or("aurix_daily_losses.neq.0");

    if (resetError) {
      console.error("Daily reset error:", resetError);
      return new Response(
        JSON.stringify({ success: false, error: resetError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up old notifications (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("notifications")
      .delete()
      .lt("created_at", thirtyDaysAgo)
      .eq("read", true);

    // Clean up expired stories (already expired > 48h ago)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("stories")
      .delete()
      .lt("expires_at", twoDaysAgo);

    // Refresh leaderboard materialized view
    await supabase.rpc("refresh_leaderboard_cache");

    console.log("Daily reset completed successfully");
    return new Response(
      JSON.stringify({ success: true, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Daily reset error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
