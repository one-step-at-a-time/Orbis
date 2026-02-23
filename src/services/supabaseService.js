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

// ─── Health Logs ─────────────────────────────────────────────────────────────
//
// Tabela necessária no Supabase Dashboard (SQL Editor):
//
//   create table if not exists health_logs (
//     id          uuid      default gen_random_uuid() primary key,
//     date        date      not null unique,
//     sleep_hours numeric(3,1),
//     energy      smallint  check (energy between 1 and 5),
//     weight      numeric(5,1),
//     notes       text,
//     ts          bigint,
//     created_at  timestamptz default now(),
//     updated_at  timestamptz default now()
//   );
//
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert de uma entrada de log de saúde (conflito resolvido por date).
 * @param {{ date, sleep_hours, energy, weight, notes, ts }} entry
 * @returns {{ data, error }}
 */
export async function syncHealthLog(entry) {
  const supabase = getClient();
  if (!supabase) return { data: null, error: new Error('Supabase não configurado') };

  const { data, error } = await supabase
    .from('health_logs')
    .upsert(
      {
        date:        entry.date,
        sleep_hours: entry.sleep_hours ?? null,
        energy:      entry.energy      ?? null,
        weight:      entry.weight      ?? null,
        notes:       entry.notes       ?? null,
        ts:          entry.ts          ?? Date.now(),
        updated_at:  new Date().toISOString(),
      },
      { onConflict: 'date' }
    )
    .select()
    .single();

  return { data, error };
}

/**
 * Busca logs de saúde dos últimos N dias (útil para restaurar em novo dispositivo).
 * @param {number} days
 * @returns {{ data, error }}
 */
export async function fetchHealthLogs(days = 90) {
  const supabase = getClient();
  if (!supabase) return { data: [], error: null };

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('health_logs')
    .select('*')
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false });

  return { data: data || [], error };
}
