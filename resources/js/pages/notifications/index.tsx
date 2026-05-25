import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Bell, Calendar, ChevronRight, CheckCheck, ArrowLeft } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Notifikasi', href: '/notifications' },
];

interface NotificationItem {
    id: number;
    type: string;
    title: string;
    message: string | null;
    data: Record<string, any> | null;
    is_read: boolean;
    created_at: string;
}

interface NotificationsPageProps {
    notifications: NotificationItem[];
    unread_count: number;
}

export default function NotificationsIndex({ notifications, unread_count }: NotificationsPageProps) {
    const markAsRead = (id: number) => {
        router.post(`/notifications/${id}/read`, {}, {
            preserveScroll: true,
            onSuccess: () => router.reload(),
        });
    };

    const markAllAsRead = () => {
        router.post('/notifications/read-all', {}, {
            preserveScroll: true,
            onSuccess: () => router.reload(),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Notifikasi – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-foreground">Notifikasi</h1>
                            {unread_count > 0 && (
                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                    {unread_count} belum dibaca
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Pemberitahuan dan informasi terbaru</p>
                    </div>
                    {unread_count > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition"
                        >
                            <CheckCheck className="h-4 w-4" />
                            Tandai Semua Dibaca
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                            <Bell className="h-16 w-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Tidak ada notifikasi</p>
                            <p className="text-sm">Belum ada pemberitahuan untuk Anda.</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                className={`group relative flex items-start gap-4 rounded-xl border p-5 transition hover:shadow-sm cursor-pointer ${
                                    n.is_read
                                        ? 'bg-card border-border'
                                        : 'bg-primary/5 border-primary/20'
                                }`}
                                onClick={() => {
                                    if (!n.is_read) markAsRead(n.id);
                                    if (n.type === 'assignment' && n.data?.assignment_id) {
                                        router.visit(route('assignments.show', n.data.assignment_id));
                                    } else if (n.type === 'announcement') {
                                        router.visit(route('announcements.index'));
                                    }
                                }}
                            >
                                <div className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                                    n.is_read ? 'bg-muted-foreground/30' : 'bg-primary'
                                }`} />
                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-sm leading-snug ${
                                        n.is_read ? 'text-muted-foreground' : 'text-foreground font-semibold'
                                    }`}>
                                        {n.title}
                                    </h3>
                                    {n.message && (
                                        <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground/60 mt-2 flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3" />
                                        {n.created_at}
                                    </p>
                                </div>
                                {!n.is_read && (
                                    <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
