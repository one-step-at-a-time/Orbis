import React, { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
    MOCK_TASKS, MOCK_HABITS, MOCK_PROJECTS, MOCK_REMINDERS, MOCK_FINANCES, MOCK_WISHES
} from '../utils/mockData';
import {
    isSupabaseConfigured,
    syncTask, deleteTaskSupabase,
    syncHabit, deleteHabitSupabase,
    syncFinance, deleteFinanceSupabase,
    syncProject, deleteProjectSupabase,
    syncReminder, deleteReminderSupabase,
    syncWish, deleteWishSupabase,
    fetchTasks, fetchFinances, fetchHabits, fetchProjects, fetchReminders, fetchWishes,
} from '../services/supabaseService';

const DataContext = createContext(null);

function newId() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Fire-and-forget: chama fn assíncrona sem bloquear a UI
function bg(fn) {
    if (isSupabaseConfigured()) fn().catch(console.error);
}

export function DataProvider({ children }) {
    const [tasks, setTasks] = useLocalStorage('orbis_tasks', MOCK_TASKS);

    // Auto-marca tarefas atrasadas ao montar
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setTasks(prev => prev.map(t => {
            if (t.dataPrazo && t.dataPrazo < today && t.status !== 'concluida' && t.status !== 'atrasada') {
                return { ...t, status: 'atrasada' };
            }
            return t;
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [habits, setHabits] = useLocalStorage('orbis_habits', MOCK_HABITS);
    const [projects, setProjects] = useLocalStorage('orbis_projects', MOCK_PROJECTS);
    const [reminders, setReminders] = useLocalStorage('orbis_reminders', MOCK_REMINDERS);
    const [finances, setFinances] = useLocalStorage('orbis_finances', MOCK_FINANCES);
    const [wishes, setWishes] = useLocalStorage('orbis_wishes', MOCK_WISHES);

    // ── Pull do Supabase no startup ─────────────────────────────────────────────
    // Mescla dados remotos com localStorage:
    // - IDs novos do Supabase (ex: criados pelo bot) são adicionados ao estado local.
    // - Para tarefas: status e prioridade são atualizados se diferirem (ex: bot concluiu).
    // - Outros campos locais não são sobrescritos.
    useEffect(() => {
        if (!isSupabaseConfigured()) return;

        // Merge simples: só adiciona itens novos
        const merge = (local, remote) => {
            const localIds = new Set(local.map(x => x.id));
            const newItems = remote.filter(x => !localIds.has(x.id));
            return newItems.length > 0 ? [...local, ...newItems] : local;
        };

        // Merge de tarefas: adiciona novas + atualiza status/prioridade de existentes
        const mergeTasks = (local, remote) => {
            const remoteMap = new Map(remote.map(t => [t.id, t]));
            const updated = local.map(t => {
                const r = remoteMap.get(t.id);
                if (!r) return t;
                // Aplica atualizações do servidor para status e prioridade
                if (r.status !== t.status || r.prioridade !== t.prioridade) {
                    return { ...t, status: r.status, prioridade: r.prioridade };
                }
                return t;
            });
            const localIds = new Set(local.map(t => t.id));
            const newItems = remote.filter(t => !localIds.has(t.id));
            return newItems.length > 0 ? [...updated, ...newItems] : updated;
        };

        Promise.allSettled([
            fetchTasks(),
            fetchFinances(),
            fetchHabits(),
            fetchProjects(),
            fetchReminders(),
            fetchWishes(),
        ]).then(([t, f, h, p, r, w]) => {
            if (t.status === 'fulfilled' && t.value.length > 0) setTasks(prev => mergeTasks(prev, t.value));
            if (f.status === 'fulfilled' && f.value.length > 0) setFinances(prev => merge(prev, f.value));
            if (h.status === 'fulfilled' && h.value.length > 0) setHabits(prev => merge(prev, h.value));
            if (p.status === 'fulfilled' && p.value.length > 0) setProjects(prev => merge(prev, p.value));
            if (r.status === 'fulfilled' && r.value.length > 0) setReminders(prev => merge(prev, r.value));
            if (w.status === 'fulfilled' && w.value.length > 0) setWishes(prev => merge(prev, w.value));
        }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Tasks ──────────────────────────────────────────────────────────────────
    const addTask = (task) => {
        const id = newId();
        const newTask = { status: 'pendente', ...task, id };
        setTasks(prev => [...prev, newTask]);
        bg(() => syncTask(newTask));
    };

    const updateTask = (id, updates) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== id) return t;
            const updated = { ...t, ...updates };
            bg(() => syncTask(updated));
            return updated;
        }));
    };

    const deleteTask = (id) => {
        setTasks(prev => prev.filter(t => t.id !== id));
        bg(() => deleteTaskSupabase(id));
    };

    // ── Habits ─────────────────────────────────────────────────────────────────
    const addHabit = (habit) => {
        const id = newId();
        const newHabit = { icone: '✨', metaMensal: 30, ...habit, id, logs: [] };
        setHabits(prev => [...prev, newHabit]);
        bg(() => syncHabit(newHabit));
    };

    const deleteHabit = (id) => {
        setHabits(prev => prev.filter(h => h.id !== id));
        bg(() => deleteHabitSupabase(id));
    };

    const addHabitLog = (habitId, date) => {
        setHabits(prev => prev.map(h => {
            if (h.id !== habitId) return h;
            const hasDate = h.logs.some(l => l.data === date);
            const updated = {
                ...h,
                logs: hasDate ? h.logs.filter(l => l.data !== date) : [...h.logs, { data: date }]
            };
            bg(() => syncHabit(updated));
            return updated;
        }));
    };

    // ── Projects ───────────────────────────────────────────────────────────────
    const addProject = (project) => {
        const id = newId();
        const newProject = { cor: '#06b6d4', status: 'ativo', totalTarefas: 0, tarefasConcluidas: 0, ...project, id };
        setProjects(prev => [...prev, newProject]);
        bg(() => syncProject(newProject));
    };

    const updateProject = (id, updates) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== id) return p;
            const updated = { ...p, ...updates };
            bg(() => syncProject(updated));
            return updated;
        }));
    };

    const deleteProject = (id) => {
        setProjects(prev => prev.filter(p => p.id !== id));
        bg(() => deleteProjectSupabase(id));
    };

    // ── Reminders ──────────────────────────────────────────────────────────────
    const addReminder = (reminder) => {
        const id = newId();
        const newReminder = { ...reminder, id };
        setReminders(prev => [...prev, newReminder]);
        bg(() => syncReminder(newReminder));
    };

    const deleteReminder = (id) => {
        setReminders(prev => prev.filter(r => r.id !== id));
        bg(() => deleteReminderSupabase(id));
    };

    // ── Wishes ─────────────────────────────────────────────────────────────────
    const addWish = (wish) => {
        const id = newId();
        const newWish = { status: 'desejado', prioridade: 'media', ...wish, id };
        setWishes(prev => [...prev, newWish]);
        bg(() => syncWish(newWish));
    };

    const updateWish = (id, updates) => {
        setWishes(prev => prev.map(w => {
            if (w.id !== id) return w;
            const updated = { ...w, ...updates };
            bg(() => syncWish(updated));
            return updated;
        }));
    };

    const deleteWish = (id) => {
        setWishes(prev => prev.filter(w => w.id !== id));
        bg(() => deleteWishSupabase(id));
    };

    // ── Finances ───────────────────────────────────────────────────────────────
    const addFinance = (entry) => {
        const id = newId();
        const newEntry = { ...entry, id };
        setFinances(prev => [...prev, newEntry]);
        bg(() => syncFinance(newEntry));
    };

    const deleteFinance = (id) => {
        setFinances(prev => prev.filter(f => f.id !== id));
        bg(() => deleteFinanceSupabase(id));
    };

    return (
        <DataContext.Provider value={{
            tasks, tasksCount: tasks.length, addTask, updateTask, deleteTask,
            habits, addHabit, addHabitLog, deleteHabit, setHabits,
            projects, addProject, updateProject, deleteProject,
            reminders, addReminder, deleteReminder,
            finances, addFinance, deleteFinance,
            wishes, addWish, updateWish, deleteWish,
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useAppData() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useAppData must be used within a DataProvider');
    }
    return context;
}
