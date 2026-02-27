/**
 * supabase-server.js
 * Cliente Supabase server-side + operações de banco para o bot Telegram.
 * Usa env vars (SUPABASE_URL, SUPABASE_SERVICE_KEY) em vez de localStorage.
 * Colunas em snake_case conforme schema do Supabase.
 */

import { createClient } from '@supabase/supabase-js';

let _client = null;

export function getSupabase() {
    if (_client) return _client;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados.');
    _client = createClient(url, key);
    return _client;
}

// ── Tasks ──────────────────────────────────────────────────────────────────────

export async function listPendingTasks(supabase) {
    const { data } = await supabase
        .from('tasks')
        .select('id, titulo, status, prioridade, data_prazo')
        .neq('status', 'concluida')
        .order('data_prazo', { ascending: true, nullsFirst: false })
        .limit(20);
    return data || [];
}

export async function findTaskByTitle(supabase, searchTerm) {
    const { data } = await supabase
        .from('tasks')
        .select('id, titulo, status, prioridade, data_prazo')
        .neq('status', 'concluida')
        .ilike('titulo', `%${searchTerm}%`)
        .limit(5);
    return data || [];
}

export async function completeTask(supabase, taskId) {
    const { error } = await supabase
        .from('tasks')
        .update({ status: 'concluida', updated_at: new Date().toISOString() })
        .eq('id', taskId);
    return !error;
}

export async function createTask(supabase, { titulo, prioridade, dataPrazo, descricao }) {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('tasks').insert({
        id,
        titulo,
        status: 'pendente',
        prioridade: prioridade || 'media',
        data_prazo: dataPrazo || null,
        updated_at: new Date().toISOString(),
    });
    return { id, titulo, error };
}

// ── Habits ─────────────────────────────────────────────────────────────────────

export async function listHabitsWithTodayStatus(supabase) {
    const today = new Date().toISOString().split('T')[0];
    const { data: habits } = await supabase
        .from('habits')
        .select('id, titulo, icone, meta_mensal, habit_logs(date)')
        .limit(20);

    return (habits || []).map(h => {
        const logs = h.habit_logs || [];
        const doneToday = logs.some(l => l.date === today);
        const thisMonth = logs.filter(l => l.date?.startsWith(today.slice(0, 7))).length;
        return { id: h.id, titulo: h.titulo, icone: h.icone, metaMensal: h.meta_mensal, doneToday, thisMonth };
    });
}

export async function findHabitByTitle(supabase, searchTerm) {
    const { data } = await supabase
        .from('habits')
        .select('id, titulo, icone')
        .ilike('titulo', `%${searchTerm}%`)
        .limit(3);
    return data || [];
}

export async function logHabitByTitle(supabase, searchTerm) {
    const today = new Date().toISOString().split('T')[0];
    const habits = await findHabitByTitle(supabase, searchTerm);
    if (!habits || habits.length === 0) return { found: false };

    const habit = habits[0];

    // Verifica se já foi logado hoje
    const { data: existing } = await supabase
        .from('habit_logs')
        .select('id')
        .eq('habit_id', habit.id)
        .eq('date', today)
        .limit(1);

    if (existing && existing.length > 0) {
        return { found: true, titulo: habit.titulo, alreadyLogged: true };
    }

    const { error } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habit.id, date: today });

    return { found: true, titulo: habit.titulo, alreadyLogged: false, error };
}

// ── Finances ───────────────────────────────────────────────────────────────────

export async function createFinance(supabase, { descricao, valor, tipo, categoria, data }) {
    const id = crypto.randomUUID();
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('finances').insert({
        id,
        descricao,
        valor: Math.abs(Number(valor)),
        tipo: tipo === 'receita' ? 'receita' : 'despesa',
        categoria: categoria || 'outros',
        data: data || today,
        updated_at: new Date().toISOString(),
    });
    return { id, error };
}

// ── Reminders ──────────────────────────────────────────────────────────────────

export async function createReminder(supabase, { titulo, descricao, importancia, dataHora }) {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('reminders').insert({
        id,
        titulo,
        descricao: descricao || null,
        importancia: importancia || 'media',
        data_hora: dataHora || null,
        updated_at: new Date().toISOString(),
    });
    return { id, error };
}

// ── Projects ───────────────────────────────────────────────────────────────────

export async function createProject(supabase, { titulo, descricao, cor }) {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('projects').insert({
        id,
        titulo,
        descricao: descricao || null,
        cor: cor || '#06b6d4',
        status: 'ativo',
        updated_at: new Date().toISOString(),
    });
    return { id, error };
}

// ── Habits (create) ────────────────────────────────────────────────────────────

export async function createHabit(supabase, { titulo, descricao, icone, metaMensal }) {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('habits').insert({
        id,
        titulo,
        descricao: descricao || null,
        icone: icone || '✨',
        meta_mensal: metaMensal || 30,
        updated_at: new Date().toISOString(),
    });
    return { id, error };
}

// ── AI Context Snapshot ────────────────────────────────────────────────────────
// Espelha fetchAiContextSnapshot() de src/services/supabaseService.js

export async function fetchServerAiContext(supabase) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const [tasksRes, habitsRes, financesRes, projectsRes, remindersRes, healthRes] =
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
        ]);

    return {
        tasks:      tasksRes.status      === 'fulfilled' ? (tasksRes.value.data      || []) : [],
        habits:     habitsRes.status     === 'fulfilled' ? (habitsRes.value.data     || []) : [],
        finances:   financesRes.status   === 'fulfilled' ? (financesRes.value.data   || []) : [],
        projects:   projectsRes.status   === 'fulfilled' ? (projectsRes.value.data   || []) : [],
        reminders:  remindersRes.status  === 'fulfilled' ? (remindersRes.value.data  || []) : [],
        healthLogs: healthRes.status     === 'fulfilled' ? (healthRes.value.data     || []) : [],
        today: new Date().toISOString().split('T')[0],
    };
}
