import React, { createContext, useContext } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
    MOCK_TASKS, MOCK_HABITS, MOCK_PROJECTS, MOCK_REMINDERS, MOCK_FINANCES
} from '../utils/mockData';

const DataContext = createContext(null);

export function DataProvider({ children }) {
    const [tasks, setTasks] = useLocalStorage('orbis_tasks', MOCK_TASKS);
    const [habits, setHabits] = useLocalStorage('orbis_habits', MOCK_HABITS);
    const [projects, setProjects] = useLocalStorage('orbis_projects', MOCK_PROJECTS);
    const [reminders, setReminders] = useLocalStorage('orbis_reminders', MOCK_REMINDERS);
    const [finances, setFinances] = useLocalStorage('orbis_finances', MOCK_FINANCES);

    const addTask = (task) => setTasks([...tasks, { ...task, id: Date.now().toString() }]);
    const updateTask = (id, updates) => setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
    const deleteTask = (id) => setTasks(tasks.filter(t => t.id !== id));

    const addHabit = (habit) => setHabits([...habits, { ...habit, id: Date.now().toString(), logs: [] }]);
    const addHabitLog = (habitId, date) => {
        setHabits(habits.map(h => {
            if (h.id !== habitId) return h;
            const hasDate = h.logs.some(l => l.data === date);
            return {
                ...h,
                logs: hasDate ? h.logs.filter(l => l.data !== date) : [...h.logs, { data: date }]
            };
        }));
    };

    const addProject = (project) => setProjects([...projects, { ...project, id: Date.now().toString(), status: "ativo", totalTarefas: 0, tarefasConcluidas: 0 }]);
    const updateProject = (id, updates) => setProjects(projects.map(p => p.id === id ? { ...p, ...updates } : p));
    const deleteProject = (id) => setProjects(projects.filter(p => p.id !== id));

    const addReminder = (reminder) => setReminders([...reminders, { ...reminder, id: Date.now().toString() }]);
    const deleteReminder = (id) => setReminders(reminders.filter(r => r.id !== id));

    const addFinance = (entry) => setFinances([...finances, { ...entry, id: Date.now().toString() }]);

    return (
        <DataContext.Provider value={{
            tasks, tasksCount: tasks.length, addTask, updateTask, deleteTask,
            habits, addHabit, addHabitLog, setHabits,
            projects, addProject, updateProject, deleteProject,
            reminders, addReminder, deleteReminder,
            finances, addFinance
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
