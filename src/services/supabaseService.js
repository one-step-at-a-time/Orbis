/**
 * supabaseService.js
 * Camada de persistência Supabase para o Orbis.
 * Arquitetura local-first: localStorage é a fonte de verdade,
 * Supabase é sincronizado em background (fire-and-forget).
 *
 * SQL para criar as tabelas no Supabase (cole no SQL Editor):
 *
 * -- Tarefas
 * create table if not exists tasks (
 *   id          text      primary key,
 *   titulo      text      not null,
 *   status      text      default 'pendente',
 *   prioridade  text      default 'media',
 *   data_prazo  date,
 *   projeto     text,
 *   created_at  timestamptz default now(),
 *   updated_at  timestamptz default now()
 * );
 *
 * -- Hábitos
 * create table if not exists habits (
 *   id          text      primary key,
 *   titulo      text      not null,
 *   descricao   text,
 *   icone       text      default '✨',
 *   meta_mensal int       default 30,
 *   created_at  timestamptz default now(),
 *   updated_at  timestamptz default now()
 * );
 *
 * -- Logs de hábito
 * create table if not exists habit_logs (
 *   id          bigint    generated always as identity primary key,
 *   habit_id    text      references habits(id) on delete cascade,
 *   date        date      not null,
 *   unique (habit_id, date)
 * );
 *
 * -- Finanças
 * create table if not exists finances (
 *   id          text      primary key,
 *   descricao   text      not null,
 *   valor       numeric(12,2) not null,
 *   tipo        text      not null,
 *   categoria   text,
 *   data        date      not null,
 *   created_at  timestamptz default now(),
 *   updated_at  timestamptz default now()
 * );
 *
 * -- Projetos
 * create table if not exists projects (
 *   id          text      primary key,
 *   titulo      text      not null,
 *   descricao   text,
 *   cor         text      default '#06b6d4',
 *   status      text      default 'ativo',
 *   created_at  timestamptz default now(),
 *   updated_at  timestamptz default now()
 * );
 *
 * -- Lembretes
 * create table if not exists reminders (
 *   id          text      primary key,
 *   titulo      text      not null,
 *   descricao   text,
 *   importancia text      default 'media',
 *   data_hora   timestamptz,
 *   created_at  timestamptz default now(),
 *   updated_at  timestamptz default now()
 * );
 *
 * -- Mensagens do chat
 * create table if not exists chat_messages (
 *   id          text      primary key,
 *   tipo        text      not null,
 *   mensagem    text      not null,
 *   timestamp   text      not null,
 *   created_at  timestamptz default now()
 * );
 *
 * -- Logs de saúde (já existia no projeto anterior)
 * create table if not exists health_logs (
 *   id          uuid      default gen_random_uuid() primary key,
 *   date        date      not null unique,
 *   sleep_hours numeric(3,1),
 *   energy      smallint  check (energy between 1 and 5),
 *   weight      numeric(5,1),
 *   notes       text,
 *   ts          bigint,
 *   created_at  timestamptz default now(),
 *   updated_at  timestamptz default now()
 * );
 *
 * -- Notas do Caderno
 * create table if not exists notes (
 *   id          text      primary key,
 *   titulo      text      not null default 'Sem título',
 *   conteudo    text,
 *   created_at  timestamptz default now(),
 *   updated_at  timestamptz default now()
 * );
 *
 * -- Entradas do Diário
 * create table if not exists diary_entries (
 *   id          text      primary key,
 *   data        date      not null,
 *   conteudo    text,
 *   created_at  timestamptz default now(),
 *   updated_at  timestamptz default now()
 * );
 */

import { createClient } from '@supabase/supabase-js';

// ── Cliente ────────────────────────────────────────────────────────────────────

let _client = null;
let _clientUrl = null;
let _clientKey = null;

function getClient() {
    const url = localStorage.getItem('orbis_supabase_url');
    const key = localStorage.getItem('orbis_supabase_anon_key');
    if (!url || !key) return null;
    // Reutiliza instância se as credenciais não mudaram
    if (_client && _clientUrl === url && _clientKey === key) return _client;
    _client = createClient(url, key);
    _clientUrl = url;
    _clientKey = key;
    return _client;
}

export function isSupabaseConfigured() {
    return !!(
        localStorage.getItem('orbis_supabase_url') &&
        localStorage.getItem('orbis_supabase_anon_key')
    );
}

// ── Tasks ──────────────────────────────────────────────────────────────────────

export async function syncTask(task) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('tasks').upsert({
        id:         task.id,
        titulo:     task.titulo,
        status:     task.status     || 'pendente',
        prioridade: task.prioridade || 'media',
        data_prazo: task.dataPrazo  || null,
        projeto:    task.projeto    || null,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
}

export async function deleteTaskSupabase(id) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('tasks').delete().eq('id', id);
}

export async function fetchTasks() {
    const supabase = getClient();
    if (!supabase) return [];
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    return (data || []).map(t => ({
        id:         t.id,
        titulo:     t.titulo,
        status:     t.status,
        prioridade: t.prioridade,
        dataPrazo:  t.data_prazo,
        projeto:    t.projeto,
    }));
}

// ── Habits ─────────────────────────────────────────────────────────────────────

export async function syncHabit(habit) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('habits').upsert({
        id:         habit.id,
        titulo:     habit.titulo,
        descricao:  habit.descricao  || null,
        icone:      habit.icone      || '✨',
        meta_mensal: habit.metaMensal || 30,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (habit.logs && habit.logs.length > 0) {
        await supabase.from('habit_logs').upsert(
            habit.logs.map(l => ({ habit_id: habit.id, date: l.data })),
            { onConflict: 'habit_id,date' }
        );
    }
}

export async function deleteHabitSupabase(id) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('habits').delete().eq('id', id);
}

// ── Finances ───────────────────────────────────────────────────────────────────

export async function syncFinance(entry) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('finances').upsert({
        id:        entry.id,
        descricao: entry.descricao,
        valor:     entry.valor,
        tipo:      entry.tipo,
        categoria: entry.categoria || null,
        data:      entry.data,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
}

export async function deleteFinanceSupabase(id) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('finances').delete().eq('id', id);
}

// ── Projects ───────────────────────────────────────────────────────────────────

export async function syncProject(project) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('projects').upsert({
        id:        project.id,
        titulo:    project.titulo,
        descricao: project.descricao || null,
        cor:       project.cor       || '#06b6d4',
        status:    project.status    || 'ativo',
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
}

export async function deleteProjectSupabase(id) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('projects').delete().eq('id', id);
}

// ── Reminders ──────────────────────────────────────────────────────────────────

export async function syncReminder(reminder) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('reminders').upsert({
        id:         reminder.id,
        titulo:     reminder.titulo,
        descricao:  reminder.descricao  || null,
        importancia: reminder.importancia || 'media',
        data_hora:  reminder.dataHora   || null,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
}

export async function deleteReminderSupabase(id) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('reminders').delete().eq('id', id);
}

// ── Chat Messages ──────────────────────────────────────────────────────────────

export async function syncChatMessage(msg) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('chat_messages').upsert({
        id:        msg.id,
        tipo:      msg.tipo,
        mensagem:  msg.mensagem,
        timestamp: msg.timestamp,
    }, { onConflict: 'id' });
}

export async function fetchRecentChatMessages(limit = 100) {
    const supabase = getClient();
    if (!supabase) return [];
    const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
    return (data || []).reverse();
}

// ── Health Logs ────────────────────────────────────────────────────────────────

export async function syncHealthLog(entry) {
    const supabase = getClient();
    if (!supabase) return { data: null, error: new Error('Supabase não configurado') };
    const { data, error } = await supabase
        .from('health_logs')
        .upsert({
            date:        entry.date,
            sleep_hours: entry.sleep_hours ?? null,
            energy:      entry.energy      ?? null,
            weight:      entry.weight      ?? null,
            notes:       entry.notes       ?? null,
            ts:          entry.ts          ?? Date.now(),
            updated_at:  new Date().toISOString(),
        }, { onConflict: 'date' })
        .select()
        .single();
    return { data, error };
}

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

// ── Notes (Caderno) ────────────────────────────────────────────────────────────

export async function syncNote(note) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('notes').upsert({
        id:         note.id,
        titulo:     note.titulo    || 'Sem título',
        conteudo:   note.conteudo  || null,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
}

export async function deleteNoteSupabase(id) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('notes').delete().eq('id', id);
}

export async function fetchNotes() {
    const supabase = getClient();
    if (!supabase) return [];
    const { data } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });
    return data || [];
}

// ── Diary Entries (Caderno) ────────────────────────────────────────────────────

export async function syncDiaryEntry(entry) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('diary_entries').upsert({
        id:         entry.id,
        data:       entry.data,
        conteudo:   entry.conteudo || null,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
}

export async function deleteDiaryEntrySupabase(id) {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from('diary_entries').delete().eq('id', id);
}

export async function fetchDiaryEntries() {
    const supabase = getClient();
    if (!supabase) return [];
    const { data } = await supabase
        .from('diary_entries')
        .select('*')
        .order('data', { ascending: false });
    return data || [];
}

// ── AI Context Snapshot ────────────────────────────────────────────────────────
/**
 * Busca um snapshot compacto de todos os dados para injetar no prompt da IA.
 * Retorna null se Supabase não estiver configurado.
 */
export async function fetchAiContextSnapshot() {
    const supabase = getClient();
    if (!supabase) return null;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const [tasksRes, habitsRes, financesRes, projectsRes, remindersRes, healthRes, notesRes, diaryRes] =
        await Promise.allSettled([
            supabase.from('tasks')
                .select('titulo, status, prioridade, data_prazo')
                .neq('status', 'concluida')
                .order('data_prazo', { ascending: true })
                .limit(20),

            supabase.from('habits')
                .select('titulo, icone, habit_logs(date)')
                .limit(15),

            supabase.from('finances')
                .select('descricao, valor, tipo, categoria, data')
                .gte('data', thirtyDaysAgoStr)
                .order('data', { ascending: false })
                .limit(30),

            supabase.from('projects')
                .select('titulo, status, cor')
                .eq('status', 'ativo')
                .limit(10),

            supabase.from('reminders')
                .select('titulo, importancia, data_hora')
                .order('data_hora', { ascending: true })
                .limit(10),

            supabase.from('health_logs')
                .select('date, sleep_hours, energy, weight')
                .gte('date', weekAgoStr)
                .order('date', { ascending: false }),

            supabase.from('notes')
                .select('titulo, conteudo')
                .order('updated_at', { ascending: false })
                .limit(5),

            supabase.from('diary_entries')
                .select('data, conteudo')
                .order('data', { ascending: false })
                .limit(5),
        ]);

    return {
        tasks:      tasksRes.status      === 'fulfilled' ? (tasksRes.value.data      || []) : [],
        habits:     habitsRes.status     === 'fulfilled' ? (habitsRes.value.data     || []) : [],
        finances:   financesRes.status   === 'fulfilled' ? (financesRes.value.data   || []) : [],
        projects:   projectsRes.status   === 'fulfilled' ? (projectsRes.value.data   || []) : [],
        reminders:  remindersRes.status  === 'fulfilled' ? (remindersRes.value.data  || []) : [],
        healthLogs: healthRes.status     === 'fulfilled' ? (healthRes.value.data     || []) : [],
        notes:      notesRes.status      === 'fulfilled' ? (notesRes.value.data      || []) : [],
        diary:      diaryRes.status      === 'fulfilled' ? (diaryRes.value.data      || []) : [],
        today: new Date().toISOString().split('T')[0],
    };
}
