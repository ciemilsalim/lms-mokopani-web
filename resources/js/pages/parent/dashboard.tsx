import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Users, ChevronRight, GraduationCap, Sparkles, FileText } from 'lucide-react';
import { ChildSwitcher, ParentAcademicSummary } from '@/components/parent';
import { WelcomeCard, type IdentityProps } from '@/components/dashboard/welcome-card';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Portal Orang Tua', href: '/parent/dashboard' },
];

interface ChildData {
    id: number;
    name: string;
    nis: string;
    class_name: string;
    total_assignments: number;
    submitted: number;
    pending: number;
    avg_score: number | null;
    attendance_pct: number | null;
    grade_trend: { name: string; score: number }[];
    attendance_breakdown: { name: string; value: number; fill: string }[];
}

interface ParentDashboardProps {
    children: ChildData[];
    identity?: IdentityProps;
    todayName?: string;
    dateText?: string;
}

export default function ParentDashboard({
    children = [],
    identity,
    todayName,
    dateText,
}: ParentDashboardProps) {
    const [selectedChildId, setSelectedChildId] = useState<number>(() => (children.length > 0 ? children[0].id : 0));

    const selectedChild = children.find(c => c.id === selectedChildId) || children[0];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Portal Orang Tua – LMS Mokopani" />

            <div className="space-y-5 sm:space-y-6 fade-in pb-16 md:pb-6 max-w-5xl mx-auto px-4 sm:px-6">
                {/* Header Banner */}
                <WelcomeCard
                    identity={identity}
                    userRole="parent"
                    todayName={todayName}
                    dateText={dateText}
                    showIllustration={false}
                />

                {children.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-2xl border border-border p-6 text-center">
                        <Users className="mb-4 h-12 w-12 opacity-20" />
                        <p className="text-sm font-bold text-foreground">Belum ada data anak yang terhubung</p>
                        <p className="text-xs text-muted-foreground mt-1">Hubungi pihak sekolah/admin untuk menghubungkan data akun Anda.</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Multi-child switcher if > 1 child */}
                        <ChildSwitcher
                            childrenList={children}
                            selectedChildId={selectedChildId}
                            onSelectChild={(id) => setSelectedChildId(id)}
                        />

                        {/* Selected Child Info Header Card */}
                        {selectedChild && (
                            <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs space-y-4">
                                <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60 min-w-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-base shrink-0">
                                            {selectedChild.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-base font-bold text-foreground truncate">{selectedChild.name}</h2>
                                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5 truncate">
                                                <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                                                <span className="truncate">Kelas {selectedChild.class_name}</span>
                                                <span className="text-border">•</span>
                                                <span className="shrink-0">NIS: {selectedChild.nis || '-'}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <Link
                                        href={route('parent.child', selectedChild.id)}
                                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition active:scale-95 min-h-[44px] shrink-0"
                                    >
                                        <span>Detail Belajar</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </div>

                                {/* Academic & Attendance Quick Summary */}
                                <ParentAcademicSummary
                                    avgScore={selectedChild.avg_score}
                                    submittedCount={selectedChild.submitted}
                                    totalAssignments={selectedChild.total_assignments}
                                    pendingCount={selectedChild.pending}
                                    attendancePct={selectedChild.attendance_pct}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
