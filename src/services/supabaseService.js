// GÊMEO DIGITAL — Supabase Service
// Credenciais lidas em runtime do localStorage (orbis_supabase_url / orbis_supabase_anon_key)
// Consistente com o padrão de API keys do app (orbis_gemini_key, etc.)

import { createClient } from '@supabase/supabase-js';

function getClient() {
  const url = localStorage.getItem('orbis_supabase_url');
  const key = localStorage.getItem('orbis_supabase_anon_key');
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Salva um log biométrico na tabela biometric_logs.
 * @param {string} logText   Texto digitado no terminal
 * @param {object} aiAnalysis JSON retornado pela IA
 * @returns {{ data, error }}
 */
export async function saveBiometricLog(logText, aiAnalysis) {
  const supabase = getClient();
  if (!supabase) return { data: null, error: new Error('Supabase não configurado') };

  const { data, error } = await supabase
    .from('biometric_logs')
    .insert([{ log_text: logText, ai_analysis_json: aiAnalysis }])
    .select()
    .single();

  return { data, error };
}

/**
 * Busca os logs biométricos mais recentes.
 * @param {number} limit
 * @returns {{ data, error }}
 */
export async function getRecentLogs(limit = 10) {
  const supabase = getClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from('biometric_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: data || [], error };
}

/**
 * Verifica se as credenciais Supabase estão configuradas.
 */
export function isSupabaseConfigured() {
  return !!(
    localStorage.getItem('orbis_supabase_url') &&
    localStorage.getItem('orbis_supabase_anon_key')
  );
}
