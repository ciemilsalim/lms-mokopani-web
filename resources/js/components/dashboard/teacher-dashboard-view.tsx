import React, { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    GraduationCap,
    BookOpen,
    Library,
    ClipboardList,
    Bell,
    Users,
    ChevronRight,
    Award,
    BarChart3,
    ArrowUpDown,
    CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    WelcomeCard,
    SummaryCard,
    QuickActionGrid,
    PendingTaskList,
    ScheduleList,
    ActivityList,
    SectionHeader,
} from './index';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard Guru', href: '/dashboard' },
];

export interface TeacherDashboardViewProps {
    stats: {
        total_students: number;
        total_teachers: number;
        total_subjects: number;
        total_materials: number;
        total_assignments: number;
        pending_submissions: number;
        pending_grading_list?: { id: number; title: string; subject: string; class: string; pending_count: number }[];
        class_performance?: { name: string; value: number; color: string }[];
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
    classes?: { id: number; name: string }[];
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
        teacher?: string;
        time: string;
        is_current: boolean;
    }[];
    todayName: string;
    auth: any;
}

/**
 * TeacherDashboardView
 * Mobile-First presenter component for Teacher Dashboard.
 * Clean, calm, thumb-friendly, and fully responsive across all breakpoints.
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

    // Filter & Pagination states for Course Progress table (Desktop / Secondary View)
    const [subjectFilter, setSubjectFilter] = useState<number | 'all'>('all');
    const [classFilter, setClassFilter] = useState<number | 'all'>('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [perPage, setPerPage] = useState(10);
    const [page, setPage] = useState(1);

    const courseData = stats?.course_progress ?? [];

    const filteredData = useMemo(() => {
        return courseData
            .filter((row) => subjectFilter === 'all' || row.subject_id === subjectFilter)
            .filter((row) => classFilter === 'all' || row.class_id === classFilter)
            .sort((a, b) => (sortOrder === 'desc' ? b.progress - a.progress : a.progress - b.progress));
    }, [courseData, subjectFilter, classFilter, sortOrder]);

    const totalFiltered = filteredData.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage));
    const safePage = Math.min(page, totalPages);
    const paginatedData = filteredData.slice((safePage - 1) * perPage, safePage * perPage);
    const startRow = totalFiltered > 0 ? (safePage - 1) * perPage + 1 : 0;
    const endRow = Math.min(safePage * perPage, totalFiltered);

    const pendingGradingItems = stats?.pending_grading_list ?? [];

    const totalCalculated = courseData.length;
    const sumProgress = courseData.reduce((acc, curr) => acc + (curr.progress || 0), 0);
    const avgProgress = totalCalculated > 0 ? Math.round(sumProgress / totalCalculated) : 0;
    const needingAttentionCount = courseData.filter((c) => (c.progress || 0) < 60).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard Guru - LMS Mokopani" />

            <div className="space-y-4 sm:space-y-5 fade-in pb-16 md:pb-6 max-w-7xl mx-auto w-full min-w-0">
                {/* 1. COMPACT HERO GREETING BANNER */}
                <WelcomeCard
                    identity={identity || {
                        name: auth?.user?.name || 'Guru',
                        role: 'teacher',
                        sekolah: 'LMS Mokopani',
                        tahunAjaran: '',
                        semester: '',
                    }}
                    userRole="teacher"
                    illustrationSrc="/teacher-illustration.png"
                />

                {/* 2. HERO PRIORITY: AGENDA HARI INI (What class do I teach now?) */}
                <ScheduleList
                    schedules={todaySchedule}
                    dayName={todayName || 'Hari Ini'}
                    dateText={todayDateText}
                />

                {/* 3. ACTION PRIORITY: PERLU TINDAKAN (Assignments awaiting grading) */}
                <PendingTaskList
                    items={pendingGradingItems}
                    actionHref="/assignments"
                />

                {/* 4. AKSI CEPAT GURU (4 Compact Action Tiles) */}
                <div className="w-full min-w-0">
                    <SectionHeader
                        title="Aksi Cepat Guru"
                        subtitle="Pintasan pembuatan materi & asesmen"
                        className="mb-2"
                    />
                    <QuickActionGrid />
                </div>

                {/* 5. RINGKASAN PEMBELAJARAN (Compact Stats) */}
                <div className="w-full min-w-0">
                    <SectionHeader
                        title="Ringkasan Pembelajaran"
                        subtitle="Statistik data diampu semester ini"
                        icon={GraduationCap}
                        className="mb-2"
                    />
                    <div className="grid grid-cols-2 gap-2 sm:gap-3.5 sm:grid-cols-4 w-full min-w-0">
                        <SummaryCard
                            label="Siswa"
                            value={stats?.total_students ?? 0}
                            icon={GraduationCap}
                            variant="primary"
                            href="/students"
                        />
                        <SummaryCard
                            label="Mata Pelajaran"
                            value={stats?.total_subjects ?? 0}
                            icon={BookOpen}
                            variant="success"
                            href="/subjects"
                        />
                        <SummaryCard
                            label="Materi"
                            value={stats?.total_materials ?? 0}
                            icon={Library}
                            variant="warning"
                            href="/materials"
                        />
                        <SummaryCard
                            label="Asesmen"
                            value={stats?.total_assignments ?? 0}
                            icon={ClipboardList}
                            variant="destructive"
                            href="/assignments"
                        />
                    </div>
                </div>

                {/* 6. SECONDARY INSIGHTS & UPDATES TWO-COLUMN ON TABLET/DESKTOP */}
                <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 w-full min-w-0">
                    {/* LEFT: AKTIVITAS TERKINI (Max 3 Items) */}
                    <div className="w-full min-w-0">
                        <ActivityList
                            activities={recentActivities}
                        />
                    </div>

                    {/* RIGHT: PROGRESS PEMBELAJARAN & PENGUMUMAN SEKOLAH */}
                    <div className="space-y-4 sm:space-y-5 w-full min-w-0">
                        {/* PROGRESS PEMBELAJARAN SISWA (High-Level Insight Card) */}
                        {courseData.length > 0 && (
                            <Card className="rounded-2xl border border-border/70 shadow-xs bg-card overflow-hidden w-full min-w-0">
                                <div className="p-3.5 sm:p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-sm sm:text-base font-bold text-foreground leading-tight flex items-center gap-2">
                                            <GraduationCap className="h-4 w-4 text-emerald-500 shrink-0" />
                                            <span>Progress Siswa</span>
                                        </h2>
                                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                                            {stats?.total_students ?? totalFiltered} Siswa terdaftar
                                        </p>
                                    </div>
                                    <Link
                                        href="/students"
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 min-h-[44px] px-2 py-1 rounded-lg shrink-0"
                                    >
                                        <span>Detail</span>
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>

                                <CardContent className="p-3.5 sm:p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <span className="text-2xl sm:text-3xl font-black text-foreground">{avgProgress}%</span>
                                            <span className="text-[11px] text-muted-foreground block">Rata-rata progres pembelajaran</span>
                                        </div>
                                        {needingAttentionCount > 0 ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-1 text-[11px] font-bold">
                                                ⚠️ {needingAttentionCount} siswa perlu perhatian
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-[11px] font-bold">
                                                ✓ Siswa aktif belajar
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    avgProgress >= 80 ? 'bg-emerald-500' : avgProgress >= 60 ? 'bg-primary' : avgProgress >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                                                }`}
                                                style={{ width: `${Math.min(100, Math.max(0, avgProgress))}%` }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* PENGUMUMAN SEKOLAH (Compact 72-88px height) */}
                        <Card className="rounded-2xl border border-border/70 shadow-xs bg-card overflow-hidden w-full min-w-0">
                            <div className="flex items-center justify-between border-b border-border/60 p-3 sm:p-4 bg-muted/20 w-full min-w-0">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                        <Bell className="h-3.5 w-3.5" />
                                    </div>
                                    <h2 className="font-bold text-foreground text-xs sm:text-sm truncate">Pengumuman Sekolah</h2>
                                </div>
                                <Link
                                    href="/announcements"
                                    className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 min-h-[38px] px-2 py-1 rounded-lg shrink-0"
                                >
                                    <span>Semua</span> <ChevronRight className="h-3 w-3" />
                                </Link>
                            </div>

                            <CardContent className="p-3 sm:p-3.5 space-y-2 w-full min-w-0">
                                {recentAnnouncements.length === 0 ? (
                                    <div className="py-2.5 text-center text-muted-foreground text-xs font-medium">
                                        Belum ada pengumuman baru
                                    </div>
                                ) : (
                                    recentAnnouncements.slice(0, 1).map((ann) => (
                                        <Link
                                            key={ann.id}
                                            href="/announcements"
                                            className="block p-2.5 rounded-xl border border-border/50 bg-card hover:bg-muted/40 transition active:scale-98 min-h-[44px] w-full min-w-0"
                                        >
                                            <div className="flex items-center gap-2 mb-0.5 w-full min-w-0">
                                                <span className={`h-2 w-2 rounded-full shrink-0 ${
                                                    ann.priority === 'important' ? 'bg-rose-500' :
                                                    ann.priority === 'warning' ? 'bg-amber-500' : 'bg-primary'
                                                }`} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                                                    {ann.teacher_name || 'Sekolah'}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{ann.created_at}</span>
                                            </div>
                                            <h3 className="text-xs font-bold text-foreground line-clamp-1 leading-snug">
                                                {ann.title}
                                            </h3>
                                        </Link>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* 5. SECONDARY DATA SECTION: PROGRESS PEMBELAJARAN (Summary-First on Mobile, Table on Desktop) */}
                {courseData.length > 0 && (
                    <Card className="rounded-2xl border border-border/70 shadow-xs bg-card overflow-hidden w-full min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 p-4 sm:p-5 bg-muted/20">
                            <div>
                                <h2 className="font-bold text-foreground text-base sm:text-lg">Progress Pembelajaran Siswa</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Ringkasan & status penyelesaian asesmen ({totalFiltered} siswa)</p>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2">
                                <Link
                                    href="/students"
                                    className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-[44px] px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                                >
                                    Lihat Semua Siswa <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>

                        {/* Mobile Summary Cards Preview (3-5 Items max on Mobile) */}
                        <div className="block sm:hidden divide-y divide-border/50">
                            {paginatedData.slice(0, 5).map((row, i) => (
                                <div key={i} className="p-3.5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground truncate">{row.student}</span>
                                        <Badge
                                            variant={row.progress >= 75 ? 'success' : row.progress >= 50 ? 'warning' : 'secondary'}
                                            className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                                        >
                                            {row.status || `${row.progress}%`}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                        <span>{row.course}</span>
                                        {row.class_name && <span className="font-medium text-foreground">{row.class_name}</span>}
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${
                                                row.progress >= 75 ? 'bg-emerald-500' : row.progress >= 50 ? 'bg-amber-500' : 'bg-primary'
                                            }`}
                                            style={{ width: `${Math.min(100, Math.max(0, row.progress))}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Full Table View */}
                        <div className="hidden sm:block">
                            <div className="p-4 border-b border-border/40 bg-muted/10 flex flex-wrap items-center gap-3">
                                {classes.length > 0 && (
                                    <select
                                        value={classFilter}
                                        onChange={(e) => {
                                            setClassFilter(e.target.value === 'all' ? 'all' : Number(e.target.value));
                                            setPage(1);
                                        }}
                                        className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                                    >
                                        <option value="all">Semua Kelas</option>
                                        {classes.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                )}

                                {subjects.length > 0 && (
                                    <select
                                        value={subjectFilter}
                                        onChange={(e) => {
                                            setSubjectFilter(e.target.value === 'all' ? 'all' : Number(e.target.value));
                                            setPage(1);
                                        }}
                                        className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                                    >
                                        <option value="all">Semua Mapel</option>
                                        {subjects.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-semibold">
                                        <tr>
                                            <th className="p-3 sm:p-4">Nama Siswa</th>
                                            <th className="p-3 sm:p-4">Kelas</th>
                                            <th className="p-3 sm:p-4">Mata Pelajaran</th>
                                            <th className="p-3 sm:p-4 text-center">Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {paginatedData.map((row, i) => (
                                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-3 sm:p-4 font-bold text-foreground">{row.student}</td>
                                                <td className="p-3 sm:p-4 text-muted-foreground">{row.class_name || '-'}</td>
                                                <td className="p-3 sm:p-4 text-muted-foreground">{row.course}</td>
                                                <td className="p-3 sm:p-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className="bg-primary h-full rounded-full"
                                                                style={{ width: `${Math.min(100, Math.max(0, row.progress))}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-bold text-foreground text-[11px]">{row.progress}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Footer */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t border-border/60 p-3.5 text-xs text-muted-foreground">
                                    <span>{startRow}-{endRow} dari {totalFiltered}</span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={safePage <= 1}
                                            className="px-3 py-1.5 rounded-lg border border-border font-bold hover:bg-muted disabled:opacity-40 min-h-[44px]"
                                        >
                                            Sebelumnya
                                        </button>
                                        <button
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={safePage >= totalPages}
                                            className="px-3 py-1.5 rounded-lg border border-border font-bold hover:bg-muted disabled:opacity-40 min-h-[44px]"
                                        >
                                            Berikutnya
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
