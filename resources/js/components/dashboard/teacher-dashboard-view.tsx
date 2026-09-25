import React, { useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    GraduationCap,
    BookOpen,
    Library,
    ClipboardList,
    Bell,
    ChevronRight,
    ArrowRight,
    School,
    Plus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
    WelcomeCard,
    SummaryCard,
    QuickActionGrid,
    PendingTaskList,
    ScheduleList,
    ActivityList,
    SectionHeader,
    ClassPerformanceCard,
    AssignedClassesCard,
} from './index';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard Guru', href: '/dashboard' },
];

export interface TeacherDashboardViewProps {
    stats: {
        total_students: number;
        total_teachers: number;
        total_subjects: number;
        total_classes?: number;
        total_materials: number;
        total_assignments: number;
        pending_submissions: number;
        pending_grading_list?: { id: number; title: string; subject: string; class: string; pending_count: number }[];
        class_performance?: { id?: number; name: string; value: number; student_count?: number; color?: string }[];
        course_progress?: {
            student_id?: number;
            student: string;
            class_id?: number;
            class_name?: string;
            course: string;
            subject_id?: number;
            progress: number;
            status: string;
        }[];
    };
    identity?: {
        name: string;
        role: string;
        idLabel?: string;
        idValue?: string;
        extra?: string;
        sekolah: string;
        tahunAjaran: string;
        semester: string;
    };
    subjects?: { id: number; name: string }[];
    classes?: { id: number; name: string; student_count?: number; subjects?: string[] }[];
    recentActivities: {
        id: number;
        type: 'material' | 'assignment' | 'submission';
        title: string;
        subject: string;
        created_at: string;
    }[];
    recentAnnouncements: {
        id: number;
        title: string;
        priority: 'info' | 'warning' | 'important';
        teacher_name: string;
        created_at: string;
    }[];
    todaySchedule: {
        subject: string;
        class?: string;
        class_id?: number;
        teacher?: string;
        time: string;
        is_current: boolean;
    }[];
    todayName: string;
    auth: any;
}

/**
 * TeacherDashboardView
 * Mobile-First presenter component for Teacher Dashboard with responsive desktop enhancements.
 * Order on mobile:
 * 01 Welcome Card
 * 02 Agenda Hari Ini
 * 03 Perlu Tindakan
 * 04 Aksi Cepat Guru
 * 05 Ringkasan Pembelajaran
 * 06 Performa Nilai per Kelas
 * 07 Kelas yang Diampu
 * 08 Aktivitas Terkini
 * 09 Progress Pembelajaran
 * 10 Pengumuman Sekolah
 */
export function TeacherDashboardView({
    stats,
    identity,
    subjects = [],
    classes = [],
    recentActivities = [],
    recentAnnouncements = [],
    todaySchedule = [],
    todayName,
    auth,
}: TeacherDashboardViewProps) {
    const todayDateText = useMemo(() => {
        return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }, []);

    const courseData = stats?.course_progress ?? [];
    const pendingGradingItems = stats?.pending_grading_list ?? [];

    const totalStudents = stats?.total_students ?? (courseData.length > 0 ? courseData.length : 0);
    const sumProgress = courseData.reduce((acc, curr) => acc + (curr.progress || 0), 0);
    const avgProgress = courseData.length > 0 ? Math.round(sumProgress / courseData.length) : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard Guru - LMS Mokopani" />

            {/* Main Canvas: Responsive Grid (Flex-col on mobile, 12-cols on desktop) */}
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-5 fade-in pb-24 sm:pb-8 max-w-7xl mx-auto w-full min-w-0">
                
                {/* 01. WELCOME CARD (Full Width Header) */}
                <div className="order-1 lg:order-none lg:col-span-12 w-full min-w-0 box-border">
                    <WelcomeCard
                        identity={identity || {
                            name: auth?.user?.name || 'Guru',
                            role: 'teacher',
                            sekolah: 'LMS Mokopani',
                            tahunAjaran: '2026/2027',
                            semester: 'Ganjil',
                        }}
                        userRole="teacher"
                        illustrationSrc="/teacher-illustration.png"
                    />
                </div>

                {/* 02. RINGKASAN PEMBELAJARAN (Full Width 5 Stats) */}
                <div className="order-5 lg:order-none lg:col-span-12 w-full min-w-0 box-border">
                    <SectionHeader
                        title="Ringkasan Pembelajaran"
                        subtitle="Statistik utama pengampuan guru mapel"
                        icon={GraduationCap}
                        className="mb-2"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 w-full min-w-0 box-border">
                        <SummaryCard
                            label="SISWA"
                            value={stats?.total_students ?? 0}
                            icon={GraduationCap}
                            variant="primary"
                            href="/students"
                        />
                        <SummaryCard
                            label="KELAS"
                            value={classes?.length ?? stats?.total_classes ?? 0}
                            icon={School}
                            variant="info"
                            href="/classes"
                        />
                        <SummaryCard
                            label="MATERI"
                            value={stats?.total_materials ?? 0}
                            icon={Library}
                            variant="warning"
                            href="/materials"
                        />
                        <SummaryCard
                            label="ASESMEN"
                            value={stats?.total_assignments ?? 0}
                            icon={ClipboardList}
                            variant="destructive"
                            href="/assignments"
                        />
                        <SummaryCard
                            label="PERLU DINILAI"
                            value={stats?.pending_submissions ?? (pendingGradingItems.length > 0 ? pendingGradingItems.reduce((acc, it) => acc + (it.pending_count || 1), 0) : 0)}
                            icon={BookOpen}
                            variant="success"
                            href="/assignments"
                            className="col-span-2 sm:col-span-1"
                        />
                    </div>
                </div>

                {/* 03. AGENDA HARI INI (Right side on desktop, right after Welcome on mobile) */}
                <div className="order-2 lg:order-none lg:col-span-5 w-full min-w-0 box-border">
                    <ScheduleList
                        schedules={todaySchedule}
                        dayName={todayName || 'Hari Ini'}
                        dateText={todayDateText}
                    />
                </div>

                {/* 04. AKSI CEPAT GURU (Left side on desktop) */}
                <div className="order-4 lg:order-none lg:col-span-7 w-full min-w-0 box-border">
                    <SectionHeader
                        title="Aksi Cepat Guru"
                        subtitle="Pintasan pembuatan materi, asesmen & penilaian"
                        className="mb-2"
                    />
                    <QuickActionGrid />
                </div>

                {/* 05. PERLU TINDAKAN (Right side on desktop) */}
                <div className="order-3 lg:order-none lg:col-span-5 w-full min-w-0 box-border">
                    <PendingTaskList
                        items={pendingGradingItems}
                        actionHref="/assignments"
                    />
                </div>

                {/* 06. PERFORMA NILAI PER KELAS (Left side on desktop) */}
                {stats?.class_performance && stats.class_performance.length > 0 && (
                    <div className="order-6 lg:order-none lg:col-span-7 w-full min-w-0 box-border">
                        <ClassPerformanceCard
                            items={stats.class_performance}
                        />
                    </div>
                )}

                {/* 07. KELAS YANG DIAMPU (Left side on desktop) */}
                {classes && classes.length > 0 && (
                    <div className="order-7 lg:order-none lg:col-span-7 w-full min-w-0 box-border">
                        <AssignedClassesCard
                            classes={classes}
                        />
                    </div>
                )}

                {/* 08. AKTIVITAS TERKINI (Right side on desktop) */}
                <div className="order-8 lg:order-none lg:col-span-5 w-full min-w-0 box-border">
                    <ActivityList
                        activities={recentActivities}
                    />
                </div>

                {/* 09. PROGRESS PEMBELAJARAN (Left side on desktop) */}
                <div className="order-9 lg:order-none lg:col-span-7 w-full min-w-0 box-border">
                    <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden w-full min-w-0 box-border">
                        <div className="p-3.5 sm:p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-base font-bold text-foreground leading-tight flex items-center gap-2">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <GraduationCap className="h-4 w-4" />
                                    </div>
                                    <span className="truncate">Progress Pembelajaran Siswa</span>
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate pl-10">
                                    {totalStudents} total siswa di kelas yang diampu
                                </p>
                            </div>

                            <Link
                                href="/students"
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 min-h-[44px] px-2 py-1 shrink-0"
                            >
                                <span>Lihat Semua Siswa</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <span className="text-2xl sm:text-3xl font-bold text-foreground leading-none">
                                        {avgProgress}%
                                    </span>
                                    <span className="text-xs text-muted-foreground block mt-1">
                                        Rata-rata penyelesaian asesmen & tugas
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-bold text-foreground">
                                        {totalStudents}
                                    </span>
                                    <span className="text-xs text-muted-foreground block">
                                        Total Siswa
                                    </span>
                                </div>
                            </div>

                            {/* 8px Rounded Full Progress Bar */}
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        avgProgress >= 80 ? 'bg-emerald-500' : avgProgress >= 60 ? 'bg-primary' : avgProgress >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, avgProgress))}%` }}
                                />
                            </div>

                            {/* Action CTA Button */}
                            <div className="pt-1">
                                <Link
                                    href="/students"
                                    className="w-full min-h-[44px] px-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-98"
                                >
                                    <span>Lihat Direktori Siswa</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 10. PENGUMUMAN SEKOLAH (Right side on desktop) */}
                <div className="order-10 lg:order-none lg:col-span-5 w-full min-w-0 box-border">
                    <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden w-full min-w-0 box-border">
                        <div className="flex items-center justify-between border-b border-border/60 p-3.5 sm:p-4 bg-muted/20 w-full min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                    <Bell className="h-4 w-4" />
                                </div>
                                <h2 className="text-base font-bold text-foreground truncate">Pengumuman</h2>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Link
                                    href="/announcements"
                                    className="inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold px-2.5 py-1 transition-colors"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Buat</span>
                                </Link>
                                <Link
                                    href="/announcements"
                                    className="text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-0.5 px-1 py-1"
                                >
                                    <span>Semua</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>

                        <CardContent className="p-3 sm:p-4 w-full min-w-0">
                            {recentAnnouncements.length === 0 ? (
                                <div className="min-h-[64px] flex items-center justify-center text-center text-muted-foreground text-xs font-medium">
                                    Belum ada pengumuman baru
                                </div>
                            ) : (
                                <div className="space-y-2 w-full min-w-0">
                                    {recentAnnouncements.slice(0, 2).map((ann) => (
                                        <Link
                                            key={ann.id}
                                            href="/announcements"
                                            className="block p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/40 transition active:scale-98 min-h-[52px] w-full min-w-0 box-border"
                                        >
                                            <div className="flex items-center gap-2 mb-1 w-full min-w-0">
                                                <span className={`h-2 w-2 rounded-full shrink-0 ${
                                                    ann.priority === 'important' ? 'bg-rose-500' :
                                                    ann.priority === 'warning' ? 'bg-amber-500' : 'bg-primary'
                                                }`} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                                                    {ann.teacher_name || 'Sekolah'}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{ann.created_at}</span>
                                            </div>
                                            <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-snug">
                                                {ann.title}
                                            </h3>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </AppLayout>
    );
}
