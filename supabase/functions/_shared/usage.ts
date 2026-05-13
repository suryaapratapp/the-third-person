import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type CreditType = 'relationship_report' | 'bestie_message';

const defaultLimits: Record<CreditType, number> = {
  relationship_report: 5,
  bestie_message: 100,
};

export function createAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Server configuration is incomplete.');
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getAuthenticatedUser(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authHeader = req.headers.get('Authorization') || '';
  if (!supabaseUrl || !anonKey || !authHeader) return null;
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user || null;
}

function weekWindow() {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    today: now.toISOString().slice(0, 10),
  };
}

export async function consumeCredit(admin: ReturnType<typeof createAdminClient>, userId: string, creditType: CreditType) {
  const { start, end, today } = weekWindow();
  const { data: existing } = await admin
    .from('analysis_credits')
    .select('*')
    .eq('user_id', userId)
    .eq('credit_type', creditType)
    .lte('period_start', today)
    .gte('period_end', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let credit = existing;
  if (!credit) {
    const { data, error } = await admin
      .from('analysis_credits')
      .insert({
        user_id: userId,
        credit_type: creditType,
        credits_granted: defaultLimits[creditType],
        credits_used: 0,
        period_start: start,
        period_end: end,
        source: 'free',
      })
      .select('*')
      .single();
    if (error) throw error;
    credit = data;
  }

  if (credit.credits_used >= credit.credits_granted) {
    await admin.from('ai_usage_logs').insert({
      user_id: userId,
      action: creditType === 'relationship_report' ? 'generate_relationship_report' : 'ai_bestie_chat',
      status: 'blocked_no_credits',
      metadata: { creditType },
    });
    return { allowed: false, remaining: 0 };
  }

  const { error } = await admin
    .from('analysis_credits')
    .update({ credits_used: credit.credits_used + 1 })
    .eq('id', credit.id);
  if (error) throw error;

  const { data: daily } = await admin
    .from('daily_message_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();
  const nextDaily = {
    user_id: userId,
    usage_date: today,
    relationship_reports_count: (daily?.relationship_reports_count || 0) + (creditType === 'relationship_report' ? 1 : 0),
    bestie_messages_count: (daily?.bestie_messages_count || 0) + (creditType === 'bestie_message' ? 1 : 0),
  };
  if (daily?.id) {
    await admin.from('daily_message_usage').update(nextDaily).eq('id', daily.id);
  } else {
    await admin.from('daily_message_usage').insert(nextDaily);
  }

  return {
    allowed: true,
    remaining: Math.max(credit.credits_granted - credit.credits_used - 1, 0),
  };
}
