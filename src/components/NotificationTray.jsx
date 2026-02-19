import React, { useState, useEffect } from 'react';
import { Bell, X, Calendar } from 'lucide-react';
import { useAppData } from '../context/DataContext';
import { AnimatePresence, motion } from 'framer-motion';

export function NotificationTray() {
    const { reminders } = useAppData();
    const [notifications, setNotifications] = useState([]);
    const [notifiedIds, setNotifiedIds] = useState(new Set());

    // Request browser notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            const upcoming = reminders.filter(r => {
                const rDate = new Date(r.dataHora);
                const diff = rDate - now;
                return !notifiedIds.has(r.id) && diff < 300000 && diff > -120000;
            });

            if (upcoming.length > 0) {
                const newToasts = upcoming.map(r => ({
                    id: r.id,
                    titulo: r.titulo,
                    dataHora: r.dataHora
                }));
                setNotifications(prev => [...prev, ...newToasts]);
                setNotifiedIds(prev => {
                    const next = new Set(prev);
                    upcoming.forEach(r => {
                        next.add(r.id);
                        // Fire native OS notification
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('The System — Lembrete', {
                                body: r.titulo,
                                icon: '/vite.svg',
                            });
                        }
                    });
                    return next;
                });
            }
        };

        const interval = setInterval(checkReminders, 10000);
        checkReminders();
        return () => clearInterval(interval);
    }, [reminders, notifiedIds]);

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <div className="notification-tray">
            <AnimatePresence>
                {notifications.map(n => (
                    <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        className="toast"
                        onClick={() => removeNotification(n.id)}
                    >
                        <div style={{ padding: 10, borderRadius: 10, background: "rgba(59, 130, 246, 0.1)" }}>
                            <Bell size={20} color="var(--primary)" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: 14 }}>Lembrete Próximo</p>
                            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{n.titulo}</p>
                        </div>
                        <button className="btn-ghost" style={{ padding: 4 }}>
                            <X size={16} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
