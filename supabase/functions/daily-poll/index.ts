import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Russia timezone (UTC+3) — server-side date determination so all users see the same day
function getRussiaDate(date: Date = new Date()): string {
  const russiaTime = new Date(date.getTime() + (3 * 60 * 60 * 1000));
  return russiaTime.toISOString().slice(0, 10);
}

// Russia hour (for 08:00 check)
function getRussiaHour(date: Date = new Date()): number {
  const russiaTime = new Date(date.getTime() + (3 * 60 * 60 * 1000));
  return russiaTime.getUTCHours();
}

// Seedable random based on date + index — deterministic candidate selection
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// XP system helpers (must match mini-games edge function)
const LEVEL_TITLES: Record<number, string> = {
  1: "Новичок", 2: "Ученик", 3: "Знаток", 4: "Искатель", 5: "Опытный",
  6: "Мастер", 7: "Эксперт", 8: "Вершитель", 9: "Хранитель знаний", 10: "Легенда",
};
const MAX_LEVEL = 10;

function xpForLevel(level: number): number { return level * 100; }

function recalcLevel(xp: number): { level: number; title: string } {
  let level = 1;
  let remaining = xp;
  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level);
    if (remaining >= needed) { remaining -= needed; level++; } else break;
  }
  return { level, title: LEVEL_TITLES[level] || LEVEL_TITLES[MAX_LEVEL] };
}

function currentLevelXP(xp: number) {
  const { level, title } = recalcLevel(xp);
  let spent = 0;
  for (let l = 1; l < level; l++) spent += xpForLevel(l);
  const currentXp = xp - spent;
  const neededXp = level >= MAX_LEVEL ? currentXp : xpForLevel(level);
  return { level, currentXp, neededXp, title };
}

// Default worker list (must match frontend data.ts)
const DEFAULT_WORKERS = [
  "Шигапова З.М.", "Дикая С.И.", "Терлецкая Т.А.", "Тимшин Д.С.", "Пономарева Е.Е.",
  "Бенвовская Ю.С.", "Билык И.Е.", "Усенко А.Н.", "Шомесова Е.П.", "Тарабукина Н.Б.",
  "Майерс Н.А.", "Пруткевич Е.Р.", "Гутче А.И.", "Гаврилюк Е.В.", "Карпюк О.В.",
  "Капустина О.Н.", "Пруткевич О.В.", "Гутче Н.С.", "Батманов И.А.", "Заколодяжная И.В.",
  "Усенко В.А.", "Кетова В.В.", "Радина Е.А.", "Красоцкая А.Н.",
];

// Pick 3 deterministic candidates for a given date
function pickCandidates(dateStr: string, availableWorkers: string[]): string[] {
  const pool = availableWorkers.length >= 3 ? availableWorkers : DEFAULT_WORKERS;
  const indices = pool.map((_, i) => i);
  // Fisher-Yates shuffle with seeded random
  const seed = dateStr;
  for (let i = indices.length - 1; i > 0; i--) {
    const r = seededRandom(seed + ":" + i) % (i + 1);
    [indices[i], indices[r]] = [indices[r], indices[i]];
  }
  return [pool[indices[0]], pool[indices[1]], pool[indices[2]]];
}

// Pick a deterministic question for a given date
function pickQuestionIndex(dateStr: string, count: number): number {
  return seededRandom(dateStr + ":question") % count;
}

// Placement rewards: 1st=30/5, 2nd=20/3, 3rd=10/1
const PLACEMENT_REWARDS: Record<number, { xp: number; titleXp: number }> = {
  1: { xp: 30, titleXp: 5 },
  2: { xp: 20, titleXp: 3 },
  3: { xp: 10, titleXp: 1 },
};

// Count votes per candidate and determine placement
function computeResults(
  votes: { selected_candidates: string[] }[],
  candidates: string[]
): { candidate: string; votes: number; placement: number }[] {
  const voteCounts: Record<string, number> = {};
  for (const c of candidates) voteCounts[c] = 0;
  for (const v of votes) {
    for (const c of v.selected_candidates) {
      if (voteCounts[c] !== undefined) voteCounts[c]++;
    }
  }
  // Sort by votes desc, then alphabetically (stable tiebreak)
  const ranked = candidates
    .map((c) => ({ candidate: c, votes: voteCounts[c] }))
    .sort((a, b) => b.votes - a.votes || a.candidate.localeCompare(b.candidate));
  return ranked.map((r, i) => ({ ...r, placement: i + 1 }));
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
    const action = url.searchParams.get("action");

    // ─── GET: get poll state for current user ───
    if (method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const todayStr = getRussiaDate();
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = getRussiaDate(yesterdayDate);

      // Get or create today's poll
      let { data: todayPoll } = await supabase
        .from("daily_polls")
        .select("id, question_id, poll_date, candidate_1, candidate_2, candidate_3")
        .eq("poll_date", todayStr)
        .maybeSingle();

      if (!todayPoll) {
        // Get active questions
        const { data: questions } = await supabase
          .from("daily_poll_questions")
          .select("id, question")
          .eq("active", true)
          .order("id", { ascending: true });

        if (!questions || questions.length === 0) {
          return new Response(JSON.stringify({ error: "Нет активных вопросов" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const qIdx = pickQuestionIndex(todayStr, questions.length);
        const question = questions[qIdx];
        const candidates = pickCandidates(todayStr, DEFAULT_WORKERS);

        const { data: newPoll, error: pollErr } = await supabase
          .from("daily_polls")
          .insert({
            question_id: question.id,
            poll_date: todayStr,
            candidate_1: candidates[0],
            candidate_2: candidates[1],
            candidate_3: candidates[2],
          })
          .select("id, question_id, poll_date, candidate_1, candidate_2, candidate_3")
          .single();

        if (pollErr || !newPoll) {
          // Race condition: another request created it — fetch again
          const { data: retryPoll } = await supabase
            .from("daily_polls")
            .select("id, question_id, poll_date, candidate_1, candidate_2, candidate_3")
            .eq("poll_date", todayStr)
            .maybeSingle();
          todayPoll = retryPoll;
        } else {
          todayPoll = newPoll;
        }
      }

      if (!todayPoll) {
        return new Response(JSON.stringify({ error: "Не удалось создать опрос" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get today's question text
      const { data: todayQuestion } = await supabase
        .from("daily_poll_questions")
        .select("question")
        .eq("id", todayPoll.question_id)
        .single();

      // Get user's vote for today
      const { data: todayVote } = await supabase
        .from("daily_poll_user_votes")
        .select("selected_candidates, voted_at")
        .eq("daily_poll_id", todayPoll.id)
        .eq("user_id", userId)
        .maybeSingle();

      // Get yesterday's poll + results
      const { data: yesterdayPoll } = await supabase
        .from("daily_polls")
        .select("id, question_id, poll_date, candidate_1, candidate_2, candidate_3")
        .eq("poll_date", yesterdayStr)
        .maybeSingle();

      let yesterdayData = null;
      if (yesterdayPoll) {
        const { data: yQuestion } = await supabase
          .from("daily_poll_questions")
          .select("question")
          .eq("id", yesterdayPoll.question_id)
          .single();

        const { data: yVotes } = await supabase
          .from("daily_poll_user_votes")
          .select("selected_candidates")
          .eq("daily_poll_id", yesterdayPoll.id);

        const candidates = [yesterdayPoll.candidate_1, yesterdayPoll.candidate_2, yesterdayPoll.candidate_3];
        const results = computeResults(yVotes || [], candidates);

        // Get user's vote for yesterday
        const { data: yUserVote } = await supabase
          .from("daily_poll_user_votes")
          .select("selected_candidates")
          .eq("daily_poll_id", yesterdayPoll.id)
          .eq("user_id", userId)
          .maybeSingle();

        // Get user's reward record for yesterday
        const { data: yReward } = await supabase
          .from("daily_poll_rewards")
          .select("participation_rewarded, result_rewarded, xp_awarded, title_xp_awarded")
          .eq("daily_poll_id", yesterdayPoll.id)
          .eq("user_id", userId)
          .maybeSingle();

        yesterdayData = {
          pollId: yesterdayPoll.id,
          question: yQuestion?.question || "",
          results,
          userVote: yUserVote?.selected_candidates || null,
          reward: yReward || null,
        };
      }

      return new Response(JSON.stringify({
        today: {
          pollId: todayPoll.id,
          question: todayQuestion?.question || "",
          candidates: [todayPoll.candidate_1, todayPoll.candidate_2, todayPoll.candidate_3],
          userVote: todayVote?.selected_candidates || null,
          votedAt: todayVote?.voted_at || null,
        },
        yesterday: yesterdayData,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── POST: vote or claim results ───
    if (method === "POST") {
      const body = await req.json();
      const { userId, action: bodyAction, selectedCandidates } = body as {
        userId: string;
        action: "vote" | "claimResults";
        selectedCandidates?: string[];
      };

      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const todayStr = getRussiaDate();

      // ─── Vote action ───
      if (bodyAction === "vote") {
        if (!selectedCandidates || selectedCandidates.length < 1 || selectedCandidates.length > 3) {
          return new Response(JSON.stringify({ error: "Выберите от 1 до 3 кандидатов" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get today's poll
        const { data: todayPoll } = await supabase
          .from("daily_polls")
          .select("id, candidate_1, candidate_2, candidate_3")
          .eq("poll_date", todayStr)
          .maybeSingle();

        if (!todayPoll) {
          return new Response(JSON.stringify({ error: "Опрос не найден" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Validate candidates
        const validCandidates = [todayPoll.candidate_1, todayPoll.candidate_2, todayPoll.candidate_3];
        const allValid = selectedCandidates.every((c) => validCandidates.includes(c));
        if (!allValid) {
          return new Response(JSON.stringify({ error: "Недопустимый кандидат" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if already voted
        const { data: existingVote } = await supabase
          .from("daily_poll_user_votes")
          .select("id")
          .eq("daily_poll_id", todayPoll.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (existingVote) {
          return new Response(JSON.stringify({ error: "Вы уже проголосовали" }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Insert vote
        const { error: voteErr } = await supabase
          .from("daily_poll_user_votes")
          .insert({
            daily_poll_id: todayPoll.id,
            user_id: userId,
            selected_candidates: selectedCandidates,
          });

        if (voteErr) {
          if (voteErr.code === "23505") {
            return new Response(JSON.stringify({ error: "Вы уже проголосовали" }), {
              status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ error: voteErr.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Award participation XP (+10 XP, +2 title progress) — only once
        const { data: existingReward } = await supabase
          .from("daily_poll_rewards")
          .select("id, participation_rewarded")
          .eq("daily_poll_id", todayPoll.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingReward) {
          await supabase
            .from("daily_poll_rewards")
            .insert({
              daily_poll_id: todayPoll.id,
              user_id: userId,
              participation_rewarded: true,
              result_rewarded: false,
              xp_awarded: 10,
              title_xp_awarded: 2,
            });
        } else if (!existingReward.participation_rewarded) {
          await supabase
            .from("daily_poll_rewards")
            .update({ participation_rewarded: true, xp_awarded: 10, title_xp_awarded: 2 })
            .eq("id", existingReward.id);
        }

        // Add XP to mini_game_profile
        await addXpToProfile(supabase, userId, 10);

        return new Response(JSON.stringify({
          success: true,
          message: "Голос учтён! Результаты будут доступны завтра в 08:00",
          selectedCandidates,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Claim results action ───
      if (bodyAction === "claimResults") {
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = getRussiaDate(yesterdayDate);

        const { data: yPoll } = await supabase
          .from("daily_polls")
          .select("id, candidate_1, candidate_2, candidate_3")
          .eq("poll_date", yesterdayStr)
          .maybeSingle();

        if (!yPoll) {
          return new Response(JSON.stringify({ error: "Вчерашний опрос не найден" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if user voted yesterday
        const { data: yUserVote } = await supabase
          .from("daily_poll_user_votes")
          .select("selected_candidates")
          .eq("daily_poll_id", yPoll.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!yUserVote) {
          return new Response(JSON.stringify({
            success: true,
            message: "Вы не участвовали во вчерашнем опросе",
            totalXp: 0,
            totalTitleXp: 0,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if already claimed results reward
        const { data: yReward } = await supabase
          .from("daily_poll_rewards")
          .select("id, result_rewarded, xp_awarded, title_xp_awarded")
          .eq("daily_poll_id", yPoll.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (yReward?.result_rewarded) {
          return new Response(JSON.stringify({
            success: true,
            message: "Награда уже получена",
            totalXp: yReward.xp_awarded - 10,
            totalTitleXp: yReward.title_xp_awarded - 2,
            alreadyClaimed: true,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Compute results
        const { data: yVotes } = await supabase
          .from("daily_poll_user_votes")
          .select("selected_candidates")
          .eq("daily_poll_id", yPoll.id);

        const candidates = [yPoll.candidate_1, yPoll.candidate_2, yPoll.candidate_3];
        const results = computeResults(yVotes || [], candidates);

        // Calculate placement rewards for user's selected candidates
        let totalXp = 0;
        let totalTitleXp = 0;
        const breakdown: { candidate: string; placement: number; xp: number; titleXp: number }[] = [];

        for (const sel of yUserVote.selected_candidates) {
          const result = results.find((r) => r.candidate === sel);
          if (result && result.placement <= 3) {
            const reward = PLACEMENT_REWARDS[result.placement];
            totalXp += reward.xp;
            totalTitleXp += reward.titleXp;
            breakdown.push({ candidate: sel, placement: result.placement, xp: reward.xp, titleXp: reward.titleXp });
          }
        }

        // Update reward record
        if (yReward) {
          await supabase
            .from("daily_poll_rewards")
            .update({
              result_rewarded: true,
              xp_awarded: (yReward.xp_awarded || 10) + totalXp,
              title_xp_awarded: (yReward.title_xp_awarded || 2) + totalTitleXp,
            })
            .eq("id", yReward.id);
        } else {
          // User voted but somehow no reward record — create one
          await supabase
            .from("daily_poll_rewards")
            .insert({
              daily_poll_id: yPoll.id,
              user_id: userId,
              participation_rewarded: true,
              result_rewarded: true,
              xp_awarded: 10 + totalXp,
              title_xp_awarded: 2 + totalTitleXp,
            });
        }

        // Add XP to profile
        if (totalXp > 0) {
          await addXpToProfile(supabase, userId, totalXp);
        }

        return new Response(JSON.stringify({
          success: true,
          totalXp,
          totalTitleXp,
          breakdown,
          results,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper: add XP to mini_game_profile (with level recalculation)
async function addXpToProfile(supabase: ReturnType<typeof createClient>, userId: string, xpToAdd: number): Promise<void> {
  let { data: profile } = await supabase
    .from("mini_game_profile")
    .select("user_id, xp, coins, title")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile) {
    const { data: newProfile } = await supabase
      .from("mini_game_profile")
      .insert({ user_id: userId, level: 1, xp: 0, coins: 0, title: "Новичок" })
      .select("user_id, xp, coins, title")
      .single();
    profile = newProfile;
  }

  if (!profile) return;

  const newXp = profile.xp + xpToAdd;
  const { level, title } = recalcLevel(newXp);

  await supabase
    .from("mini_game_profile")
    .update({ xp: newXp, level, title, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}
