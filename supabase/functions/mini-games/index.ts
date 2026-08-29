import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LEVEL_TITLES: Record<number, string> = {
  1: "Новичок",
  2: "Ученик",
  3: "Знаток",
  4: "Искатель",
  5: "Опытный",
  6: "Мастер",
  7: "Эксперт",
  8: "Вершитель",
  9: "Хранитель знаний",
  10: "Легенда",
};

const MAX_LEVEL = 10;

function xpForLevel(level: number): number {
  return level * 100;
}

function recalcLevel(xp: number): { level: number; title: string } {
  let level = 1;
  let remaining = xp;
  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level);
    if (remaining >= needed) {
      remaining -= needed;
      level++;
    } else {
      break;
    }
  }
  return { level, title: LEVEL_TITLES[level] || LEVEL_TITLES[MAX_LEVEL] };
}

function currentLevelXP(xp: number): { level: number; currentXp: number; neededXp: number; title: string } {
  const { level, title } = recalcLevel(xp);
  let spent = 0;
  for (let l = 1; l < level; l++) {
    spent += xpForLevel(l);
  }
  const currentXp = xp - spent;
  const neededXp = level >= MAX_LEVEL ? currentXp : xpForLevel(level);
  return { level, currentXp, neededXp, title };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const url = new URL(req.url);
    const method = req.method;

    // GET /mini-games?userId=xxx — get or create profile + progress
    if (method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get or create profile
      let { data: profile, error: profErr } = await supabase
        .from("mini_game_profile")
        .select("user_id, level, xp, coins, title, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (profErr) {
        return new Response(JSON.stringify({ error: profErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!profile) {
        const { data: newProfile, error: insertErr } = await supabase
          .from("mini_game_profile")
          .insert({ user_id: userId, level: 1, xp: 0, coins: 0, title: "Новичок" })
          .select("user_id, level, xp, coins, title, updated_at")
          .single();
        if (insertErr) {
          return new Response(JSON.stringify({ error: insertErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        profile = newProfile;
      }

      // Get progress
      const { data: progress, error: progErr } = await supabase
        .from("mini_game_progress")
        .select("game_number, completed, best_score, played_at")
        .eq("user_id", userId)
        .order("game_number", { ascending: true });

      if (progErr) {
        return new Response(JSON.stringify({ error: progErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { level, currentXp, neededXp, title } = currentLevelXP(profile.xp);

      return new Response(JSON.stringify({
        profile: {
          user_id: profile.user_id,
          level,
          xp: profile.xp,
          currentXp,
          neededXp,
          coins: profile.coins,
          title,
        },
        progress: progress || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /mini-games — add XP and/or coins, auto-recalculate level
    if (method === "POST") {
      const body = await req.json();
      const { userId, addXp, addCoins } = body as {
        userId: string;
        addXp?: number;
        addCoins?: number;
      };

      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get or create profile
      let { data: profile, error: profErr } = await supabase
        .from("mini_game_profile")
        .select("user_id, level, xp, coins, title")
        .eq("user_id", userId)
        .maybeSingle();

      if (profErr) {
        return new Response(JSON.stringify({ error: profErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!profile) {
        const { data: newProfile, error: insertErr } = await supabase
          .from("mini_game_profile")
          .insert({ user_id: userId, level: 1, xp: 0, coins: 0, title: "Новичок" })
          .select("user_id, level, xp, coins, title")
          .single();
        if (insertErr) {
          return new Response(JSON.stringify({ error: insertErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        profile = newProfile;
      }

      const newXp = profile.xp + (addXp || 0);
      const newCoins = profile.coins + (addCoins || 0);
      const { level, title } = recalcLevel(newXp);

      const { data: updated, error: updateErr } = await supabase
        .from("mini_game_profile")
        .update({ xp: newXp, coins: newCoins, level, title, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select("user_id, level, xp, coins, title, updated_at")
        .single();

      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { currentXp, neededXp } = currentLevelXP(updated.xp);

      return new Response(JSON.stringify({
        profile: {
          user_id: updated.user_id,
          level: updated.level,
          xp: updated.xp,
          currentXp,
          neededXp,
          coins: updated.coins,
          title: updated.title,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /mini-games — upsert progress for a specific game
    if (method === "PATCH") {
      const body = await req.json();
      const { userId, gameNumber, completed, bestScore } = body as {
        userId: string;
        gameNumber: number;
        completed?: boolean;
        bestScore?: number;
      };

      if (!userId || typeof gameNumber !== "number" || gameNumber < 1 || gameNumber > 10) {
        return new Response(JSON.stringify({ error: "userId and gameNumber (1-10) required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabase
        .from("mini_game_progress")
        .select("id, completed, best_score")
        .eq("user_id", userId)
        .eq("game_number", gameNumber)
        .maybeSingle();

      let result;
      if (existing) {
        const updates: Record<string, unknown> = { played_at: new Date().toISOString() };
        if (completed !== undefined) updates.completed = completed;
        if (bestScore !== undefined) updates.best_score = Math.max(existing.best_score, bestScore);
        const { data, error } = await supabase
          .from("mini_game_progress")
          .update(updates)
          .eq("id", existing.id)
          .select("game_number, completed, best_score, played_at")
          .single();
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = data;
      } else {
        const { data, error } = await supabase
          .from("mini_game_progress")
          .insert({
            user_id: userId,
            game_number: gameNumber,
            completed: completed || false,
            best_score: bestScore || 0,
          })
          .select("game_number, completed, best_score, played_at")
          .single();
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = data;
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
