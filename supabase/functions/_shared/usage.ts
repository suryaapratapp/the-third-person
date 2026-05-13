import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type CreditType = 'relationship_report' | 'bestie_message';

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

function todayKey() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

export async function getCreditBalance(admin: ReturnType<typeof createAdminClient>, userId: string, creditType: CreditType) {
  const { data, error } = await admin
    .from('analysis_credits')
    .select('credits_granted, credits_used, source')
    .eq('user_id', userId)
    .eq('credit_type', creditType)
    .neq('source', 'free');
  if (error) throw error;

  return (data || []).reduce((sum, row) => {
    return sum + Math.max((row.credits_granted || 0) - (row.credits_used || 0), 0);
  }, 0);
}

export async function logBlockedCredit(admin: ReturnType<typeof createAdminClient>, userId: string, creditType: CreditType) {
  await admin.from('ai_usage_logs').insert({
    user_id: userId,
    action: creditType === 'relationship_report' ? 'generate_relationship_report' : 'ai_bestie_chat',
    status: 'blocked_no_credits',
    metadata: { creditType },
  });
}

export async function consumeCredit(admin: ReturnType<typeof createAdminClient>, userId: string, creditType: CreditType) {
  const { data, error } = await admin.rpc('consume_analysis_credit', {
    p_user_id: userId,
    p_credit_type: creditType,
  });
  if (error) throw error;

  const remaining = Number(data);
  if (!Number.isFinite(remaining) || remaining < 0) {
    await admin.from('ai_usage_logs').insert({
      user_id: userId,
      action: creditType === 'relationship_report' ? 'generate_relationship_report' : 'ai_bestie_chat',
      status: 'blocked_no_credits',
      metadata: { creditType },
    });
    return { allowed: false, remaining: 0 };
  }

  const today = todayKey();
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
    remaining,
  };
}
