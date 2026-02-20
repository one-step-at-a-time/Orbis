import React, { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
    MOCK_TASKS, MOCK_HABITS, MOCK_PROJECTS, MOCK_REMINDERS, MOCK_FINANCES
} from '../utils/mockData';

const DataContext = createContext(null);

// Gera um ID único usando a API nativa do navegador
function newId() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
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

    // ── Tasks ──────────────────────────────────────────────────────────────
    // Usar updater function (prev =>) para evitar closures stale
    const addTask = (task) => setTasks(prev => [...prev, { ...task, id: newId() }]);
    const updateTask = (id, updates) => setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    const deleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

    // ── Habits ─────────────────────────────────────────────────────────────
    const addHabit = (habit) => setHabits(prev => [...prev, { ...habit, id: newId(), logs: [] }]);
    const deleteHabit = (id) => setHabits(prev => prev.filter(h => h.id !== id));
    const addHabitLog = (habitId, date) => {
        setHabits(prev => prev.map(h => {
            if (h.id !== habitId) return h;
            const hasDate = h.logs.some(l => l.data === date);
            return {
                ...h,
                logs: hasDate ? h.logs.filter(l => l.data !== date) : [...h.logs, { data: date }]
            };
        }));
    };

    // ── Projects ───────────────────────────────────────────────────────────
    const addProject = (project) => setProjects(prev => [...prev, { ...project, id: newId(), status: "ativo", totalTarefas: 0, tarefasConcluidas: 0 }]);
    const updateProject = (id, updates) => setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    const deleteProject = (id) => setProjects(prev => prev.filter(p => p.id !== id));

    // ── Reminders ──────────────────────────────────────────────────────────
    const addReminder = (reminder) => setReminders(prev => [...prev, { ...reminder, id: newId() }]);
    const deleteReminder = (id) => setReminders(prev => prev.filter(r => r.id !== id));

    // ── Finances ───────────────────────────────────────────────────────────
    const addFinance = (entry) => setFinances(prev => [...prev, { ...entry, id: newId() }]);
    const deleteFinance = (id) => setFinances(prev => prev.filter(f => f.id !== id));

    return (
        <DataContext.Provider value={{
            tasks, tasksCount: tasks.length, addTask, updateTask, deleteTask,
            habits, addHabit, addHabitLog, deleteHabit, setHabits,
            projects, addProject, updateProject, deleteProject,
            reminders, addReminder, deleteReminder,
            finances, addFinance, deleteFinance
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
