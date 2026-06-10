import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';

interface NotificationItem {
    id: number;
    type: string;
    title: string;
    message: string | null;
    data: Record<string, any> | null;
    is_read: boolean;
    created_at: string;
}

export default function NotificationBell() {
    const { unread_count } = usePage<SharedData>().props;
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [unread, setUnread] = useState(unread_count ?? 0);
    const ref = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/notifications');
            const json = await res.json();
            setNotifications(json.notifications ?? []);
            setUnread(json.unread_count ?? 0);
        } catch(e) {
            console.error('Failed to fetch notifications', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (open) fetchNotifications();
    }, [open, fetchNotifications]);

    useEffect(() => {
        setUnread(unread_count ?? 0);
    }, [unread_count]);

    // Polling notifikasi setiap 30 detik agar guru lihat tugas baru langsung
    useEffect(() => {
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function getCsrfToken() {
        const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    const markAsRead = async (id: number) => {
        await fetch(`/notifications/${id}/read`, {
            method: 'POST',
            headers: { 'X-XSRF-TOKEN': getCsrfToken() }
        });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnread(prev => Math.max(0, prev - 1));
    };

    const markAllAsRead = async () => {
        await fetch('/notifications/read-all', {
            method: 'POST',
            headers: { 'X-XSRF-TOKEN': getCsrfToken() }
        });
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnread(0);
    };

    const handleClick = (n: NotificationItem) => {
        if (!n.is_read) markAsRead(n.id);
        if (n.type === 'submission' && n.data?.assignment_id) {
            router.visit(route('assignments.show', { 
                assignment: n.data.assignment_id, 
                student_id: n.data.student_id 
            }));
        } else if (n.type === 'assignment' && n.data?.assignment_id) {
            router.visit(route('assignments.show', n.data.assignment_id));
        } else if (n.type === 'announcement') {
            router.visit(route('announcements.index'));
        }
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(prev => !prev)}
                className="relative"
                aria-label="Notifikasi"
            >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-sm">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </Button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border bg-card shadow-lg z-50 overflow-hidden">
                    <div className="flex items-center justify-between border-b px-5 py-3">
                        <h3 className="text-sm font-semibold text-foreground">Notifikasi</h3>
                        {unread > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs font-medium text-primary hover:text-primary/80"
                            >
                                Tandai Dibaca
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                                Memuat...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Bell className="h-8 w-8 mb-2 opacity-30" />
                                <p className="text-sm font-medium">Tidak ada notifikasi</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => handleClick(n)}
                                    className={cn(
                                        'w-full text-left px-5 py-3.5 border-b last:border-b-0 hover:bg-muted/50 transition-colors flex items-start gap-3',
                                        !n.is_read && 'bg-primary/5'
                                    )}
                                >
                                    <div className={cn(
                                        'mt-1.5 h-2 w-2 rounded-full flex-shrink-0',
                                        n.is_read ? 'bg-transparent' : 'bg-primary'
                                    )} />
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            'text-sm leading-snug',
                                            n.is_read ? 'text-muted-foreground' : 'text-foreground font-semibold'
                                        )}>
                                            {n.title}
                                        </p>
                                        {n.message && (
                                            <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                                        )}
                                        <p className="text-[10px] text-muted-foreground/60 mt-1">{n.created_at}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
