import React, { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Bell, CheckCheck, Sparkles, Activity } from 'lucide-react';
import { ActivityItem, ActivityFilter, type ActivityFilterKey, type ActivityNotificationItem } from '@/components/activity';
import { EmptyState, SectionHeader } from '@/components/dashboard';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Aktivitas & Notifikasi', href: '/notifications' },
];

interface NotificationsPageProps {
    notifications: ActivityNotificationItem[];
    unread_count: number;
}

export default function NotificationsIndex({ notifications = [], unread_count = 0 }: NotificationsPageProps) {
    const [activeFilter, setActiveFilter] = useState<ActivityFilterKey>('all');

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

    const filteredNotifications = useMemo(() => {
        if (activeFilter === 'all') return notifications;
        if (activeFilter === 'unread') return notifications.filter(n => !n.is_read);
        return notifications.filter(n => n.type === activeFilter);
    }, [notifications, activeFilter]);

    const handleItemClick = (n: ActivityNotificationItem) => {
        if (!n.is_read) {
            markAsRead(n.id);
        }

        if (n.type === 'assignment' && n.data?.assignment_id) {
            router.visit(route('assignments.show', n.data.assignment_id));
        } else if (n.type === 'submission' && n.data?.assignment_id) {
            router.visit(route('assignments.grade-view', { assignment: n.data.assignment_id }));
        } else if (n.type === 'material' && n.data?.material_id) {
            router.visit(route('materials.show', n.data.material_id));
        } else if (n.type === 'announcement') {
            router.visit(route('announcements.index'));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Aktivitas & Notifikasi – LMS Mokopani" />

            <div className="space-y-5 sm:space-y-6 fade-in pb-16 md:pb-6 max-w-5xl mx-auto px-4 sm:px-6">
                {/* Header & Mark All Read Action */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                Aktivitas & Notifikasi
                            </h1>
                            {unread_count > 0 && (
                                <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary animate-pulse">
                                    {unread_count} baru
                                </span>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
                            Pusat pembaruan materi, asesmen, tugas masuk, dan pengumuman sekolah
                        </p>
                    </div>

                    {unread_count > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-xs font-bold shadow-xs hover:bg-primary/90 transition min-h-[44px] shrink-0 active:scale-95"
                        >
                            <CheckCheck className="h-4 w-4" />
                            <span>Tandai Semua Dibaca</span>
                        </button>
                    )}
                </div>

                {/* Filter Pills */}
                <ActivityFilter
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    unreadCount={unread_count}
                />

                {/* Feed List */}
                <div className="space-y-3">
                    {filteredNotifications.length === 0 ? (
                        <EmptyState
                            icon={Bell}
                            title={activeFilter === 'unread' ? 'Tidak Ada Notifikasi Baru' : 'Belum Ada Aktivitas'}
                            description={
                                activeFilter === 'unread'
                                    ? 'Semua notifikasi terbaru Anda sudah dibaca.'
                                    : 'Aktivitas pembuatan materi, asesmen, dan tugas masuk akan muncul di sini.'
                            }
                        />
                    ) : (
                        <div className="space-y-2.5">
                            {filteredNotifications.map((n) => (
                                <ActivityItem
                                    key={n.id}
                                    item={n}
                                    onClick={() => handleItemClick(n)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
