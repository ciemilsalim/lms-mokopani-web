import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage, Link } from '@inertiajs/react';
import {
    BookOpen, ClipboardCheck, ClipboardList, GraduationCap, Library,
    TrendingUp, Users, Bell, ChevronRight, ChevronLeft, Clock, Award, BarChart3,
    MoreHorizontal, Play, Target, Calendar, CheckCircle2, Circle,
    User, Star, FileText, Activity, ArrowUpRight, Zap, Heart, ArrowUpDown,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Cell, PieChart, Pie, ResponsiveContainer, RadialBarChart, RadialBar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
];

interface DashboardStats {
    total_students: number;
    total_teachers: number;
    total_subjects: number;
    total_materials: number;
    total_assignments: number;
    pending_submissions: number;
    p5_total?: number;
    p5_scored?: number;
    p5_progress?: number;
    pending_grading_list?: { id: number; title: string; subject: string; class: string; pending_count: number }[];
    class_performance?: { name: string; value: number; color: string }[];
    upcoming_deadlines?: { id: number; title: string; subject: string; due_date: string; is_urgent: boolean }[];
    grade_trend?: { name: string; title: string; score: number }[];
    topic_data?: { name: string; value: number; color: string }[];
    assignment_progress?: { graded: number; ungraded: number; unsubmitted: number; total: number };
    popular_instructors?: { name: string; role: string; lessons: number; color?: string }[];
    course_progress?: { student_id?: number; student: string; class_id?: number; class_name?: string; course: string; subject_id?: number; progress: number; status: string }[];
}

interface IdentityInfo {
    name: string;
    role: string;
    idLabel?: string;
    idValue?: string;
    extra?: string;
    sekolah: string;
    tahunAjaran: string;
    semester: string;
}

interface RecentActivity {
    id: number;
    type: 'material' | 'assignment' | 'submission';
    title: string;
    subject: string;
    created_at: string;
}

interface ScheduleItem {
    subject: string;
    class?: string;
    teacher?: string;
    time: string;
    is_current: boolean;
}

interface AnnouncementItem {
    id: number;
    title: string;
    priority: 'info' | 'warning' | 'important';
    teacher_name: string;
    created_at: string;
}

interface DashboardProps {
    stats: DashboardStats;
    identity?: IdentityInfo;
    subjects?: { id: number; name: string }[];
    classes?: { id: number; name: string }[];
    recentActivities: RecentActivity[];
    recentAnnouncements: AnnouncementItem[];
    todaySchedule: ScheduleItem[];
    todayName: string;
}

const statCards = (stats: DashboardStats, role: string) => {
    const cards = [
        {
            key: 'students',
            label: 'Siswa',
            value: stats.total_students,
            icon: GraduationCap,
            color: 'primary',
            roles: ['admin', 'teacher'],
            url: '/students',
        },
        {
            key: 'teachers',
            label: 'Guru',
            value: stats.total_teachers,
            icon: Users,
            color: 'info',
            roles: ['admin'],
            url: '/teachers',
        },
        {
            key: 'subjects',
            label: 'Mata Pelajaran',
            value: stats.total_subjects,
            icon: BookOpen,
            color: 'success',
            roles: ['admin', 'teacher', 'student'],
            url: '/subjects',
        },
        {
            key: 'materials',
            label: 'Materi',
            value: stats.total_materials,
            icon: Library,
            color: 'warning',
            roles: ['admin', 'teacher', 'student'],
            url: '/materials',
        },
        {
            key: 'assignments',
            label: 'Asesmen',
            value: stats.total_assignments,
            icon: ClipboardList,
            color: 'destructive',
            roles: ['admin', 'teacher', 'student'],
            url: '/assignments',
        },
        {
            key: 'pending',
            label: 'Belum Dinilai',
            value: stats.pending_submissions,
            icon: ClipboardCheck,
            color: 'info',
            roles: ['admin', 'teacher'],
            url: '/assignments',
        },
        {
            key: 'pending_student',
            label: 'Belum Dikerjakan',
            value: stats.pending_submissions,
            icon: ClipboardCheck,
            color: 'info',
            roles: ['student'],
            url: '/assignments',
        },
        {
            key: 'p5',
            label: 'Projek P5',
            value: stats.p5_total ?? 0,
            icon: Heart,
            color: 'destructive',
            roles: ['student'],
            url: '/p5',
        },
    ];
    return cards.filter(c => c.roles.includes(role));
};

const colorMap: Record<string, { hex: string; bg: string; text: string; trendText: string }> = {
    primary: { hex: '#4F46E5', bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-600 dark:text-indigo-400', trendText: 'text-emerald-600' },
    success: { hex: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', trendText: 'text-emerald-600' },
    info: { hex: '#0EA5E9', bg: 'bg-sky-50 dark:bg-sky-950/30', text: 'text-sky-600 dark:text-sky-400', trendText: 'text-emerald-600' },
    warning: { hex: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', trendText: 'text-emerald-600' },
    destructive: { hex: '#F43F5E', bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-600 dark:text-rose-400', trendText: 'text-rose-600' },
};

const activityColorMap: Record<string, string> = {
    material: '#7367f0',
    assignment: '#ea5455',
};

const activityLabelMap: Record<string, string> = {
    material: 'Materi',
    assignment: 'Asesmen',
};



export default function Dashboard({ stats, identity, subjects, classes, recentActivities, recentAnnouncements, todaySchedule, todayName }: DashboardProps) {
    const { auth, user_role } = usePage<SharedData>().props;

    useEffect(() => {
        console.group('[LMS Mokopani Dashboard Loaded]');
        console.log('✅ Pengguna Terautentikasi (Auth):', auth?.user);
        console.log('Peran Pengguna (Role):', user_role);
        console.log('Identitas:', identity);
        console.groupEnd();
    }, [auth, user_role, identity]);

    const roleLabel: Record<string, string> = {
        admin: 'Administrator',
        teacher: 'Guru',
        student: 'Siswa',
        parent: 'Orang Tua',
        user: 'Pengguna',
    };

    const safeStats = stats ?? {
        total_students: 0, total_teachers: 0, total_subjects: 0,
        total_materials: 0, total_assignments: 0, pending_submissions: 0,
    };
    const cards = statCards(safeStats, user_role);

    const topicData = safeStats.topic_data ?? [
        { name: 'Matematika', value: 35, color: '#7367f0' },
        { name: 'IPA', value: 25, color: '#28c76f' },
        { name: 'Bahasa', value: 20, color: '#ff9f43' },
        { name: 'IPS', value: 12, color: '#ea5455' },
        { name: 'Lainnya', value: 8, color: '#00cfe8' },
    ];



    const popularInstructors = safeStats.popular_instructors ?? [];
    const courseData = safeStats.course_progress ?? [];

    const [mobileTab, setMobileTab] = useState<'overview' | 'schedule' | 'activity'>('overview');
    const [subjectFilter, setSubjectFilter] = useState<number | 'all'>('all');
    const [classFilter, setClassFilter] = useState<number | 'all'>('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [perPage, setPerPage] = useState(10);
    const [page, setPage] = useState(1);

    const filteredData = useMemo(() => {
        return courseData
            .filter(row => subjectFilter === 'all' || row.subject_id === subjectFilter)
            .filter(row => classFilter === 'all' || row.class_id === classFilter)
            .sort((a, b) => sortOrder === 'desc' ? b.progress - a.progress : a.progress - b.progress);
    }, [courseData, subjectFilter, classFilter, sortOrder]);

    const totalFiltered = filteredData.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage));
    const safePage = Math.min(page, totalPages);
    const paginatedData = filteredData.slice((safePage - 1) * perPage, safePage * perPage);
    const startRow = totalFiltered > 0 ? (safePage - 1) * perPage + 1 : 0;
    const endRow = Math.min(safePage * perPage, totalFiltered);

    const todayDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard - LMS Mokopani" />

            <div className="space-y-5 sm:space-y-6 fade-in pb-10 md:pb-0">
                {/* Welcome Banner + Identity */}
                <div className="relative">
                    <div className="relative overflow-hidden rounded-2xl md:rounded-xl bg-gradient-to-br from-primary via-primary/95 to-indigo-700 p-5 sm:p-6 text-white shadow-md">
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-medium text-white/80">Selamat datang kembali,</p>
                                <h1 className="mt-1 text-xl sm:text-2xl font-black flex flex-wrap items-center gap-2">
                                    <span className="truncate">{identity?.name ?? auth?.user?.name ?? 'Pengguna'}</span>
                                    <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wide backdrop-blur-xs">
                                        {roleLabel[user_role] ?? user_role}
                                    </span>
                                </h1>
                                {identity ? (
                                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/90">
                                        {identity.idLabel && identity.idValue && (
                                            <span className="bg-black/20 px-2 py-0.5 rounded-md font-mono font-semibold">
                                                {identity.idLabel}: {identity.idValue}
                                            </span>
                                        )}
                                        {identity.extra && (
                                            <span className="bg-white/15 px-2 py-0.5 rounded-md font-medium">
                                                {identity.extra}
                                            </span>
                                        )}
                                        <span className="text-white/80">{identity.sekolah}</span>
                                        <span className="hidden sm:inline text-white/40">&bull;</span>
                                        <span className="text-white/80">{identity.tahunAjaran} ({identity.semester})</span>
                                    </div>
                                ) : (
                                    <p className="mt-1 text-xs text-white/80">Pantau aktivitas pembelajaran hari ini</p>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Pop-out Image outside overflow-hidden */}
                    <div className="hidden sm:block absolute right-8 bottom-0 z-20 pointer-events-none">
                        <img 
                            src={user_role === 'student' ? "/student-illustration.png" : "/teacher-illustration.png"} 
                            alt={user_role === 'student' ? "Ilustrasi Siswa" : "Ilustrasi Guru"} 
                            className="h-44 w-auto object-contain object-bottom drop-shadow-xl translate-y-1 -scale-x-100" 
                        />
                    </div>
                </div>

                {/* Mobile Quick Action Buttons Bar */}
                <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {user_role === 'teacher' && (
                        <>
                            <Link href="/materials/create" className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold active:scale-95 transition">
                                <BookOpen className="h-3.5 w-3.5" />
                                + Materi
                            </Link>
                            <Link href="/assignments/create" className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold active:scale-95 transition">
                                <ClipboardList className="h-3.5 w-3.5" />
                                + Asesmen
                            </Link>
                            <Link href="/lesson-plans" className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold active:scale-95 transition">
                                <FileText className="h-3.5 w-3.5" />
                                Modul Ajar / RPP
                            </Link>
                            <Link href="/gradebook" className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold active:scale-95 transition">
                                <Award className="h-3.5 w-3.5" />
                                Nilai & Rapor
                            </Link>
                        </>
                    )}
                    {user_role === 'student' && (
                        <>
                            <Link href="/materials" className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold active:scale-95 transition">
                                <BookOpen className="h-3.5 w-3.5" />
                                Pelajari Materi
                            </Link>
                            <Link href="/assignments" className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold active:scale-95 transition">
                                <ClipboardList className="h-3.5 w-3.5" />
                                Kerjakan Tugas
                            </Link>
                            <Link href="/gradebook" className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold active:scale-95 transition">
                                <Award className="h-3.5 w-3.5" />
                                Lihat Nilai
                            </Link>
                        </>
                    )}
                </div>

                {/* Stat Cards - EduAdmin Style */}
                <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 lg:grid-cols-6">
                    {cards.map((card) => {
                        const Icon = card.icon;
                        const c = colorMap[card.color] || colorMap.primary;
                        const cardContent = (
                            <Card className="border border-border/60 card-hover shadow-xs bg-card overflow-hidden h-full rounded-2xl md:rounded-xl">
                                <CardContent className="p-4 sm:p-5 h-full flex flex-col justify-between">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">{card.label}</p>
                                        <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl ${c.bg} flex items-center justify-center shrink-0 shadow-xs`}>
                                            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${c.text}`} strokeWidth={2.5} />
                                        </div>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-black text-foreground mt-2 leading-none">{card.value}</p>
                                </CardContent>
                            </Card>
                        );

                        return card.url ? (
                            <Link key={card.key} href={card.url} className="block w-full h-full active:scale-95 transition-transform">
                                {cardContent}
                            </Link>
                        ) : (
                            <div key={card.key} className="block w-full h-full">
                                {cardContent}
                            </div>
                        );
                    })}
                </div>

                {/* Mobile Tab Segmented Switcher */}
                <div className="md:hidden flex p-1 bg-muted/60 rounded-2xl border border-border/50">
                    <button
                        type="button"
                        onClick={() => setMobileTab('overview')}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                            mobileTab === 'overview'
                                ? 'bg-card text-primary shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Ringkasan
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileTab('schedule')}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                            mobileTab === 'schedule'
                                ? 'bg-card text-primary shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Jadwal & Tugas
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileTab('activity')}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                            mobileTab === 'activity'
                                ? 'bg-card text-primary shadow-xs'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Aktivitas
                    </button>
                </div>

                {/* Announcements */}
                {recentAnnouncements && recentAnnouncements.length > 0 && (
                    <div className={`${mobileTab === 'schedule' ? 'grid' : 'hidden'} md:grid gap-3 sm:gap-4 md:grid-cols-3`}>
                        {recentAnnouncements.map((ann) => (
                            <Link
                                key={ann.id}
                                href={route('announcements.index')}
                                className={`flex items-center gap-3 sm:gap-4 rounded-2xl md:rounded-xl border p-3.5 sm:p-4 shadow-xs transition hover:shadow-md bg-card ${
                                    ann.priority === 'important' ? 'border-l-4 border-l-[#ea5455]' :
                                    ann.priority === 'warning' ? 'border-l-4 border-l-[#ff9f43]' :
                                    'border-l-4 border-l-[#7367f0]'
                                }`}
                            >
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                    ann.priority === 'important' ? 'bg-[#ea5455]' :
                                    ann.priority === 'warning' ? 'bg-[#ff9f43]' :
                                    'bg-[#7367f0]'
                                } text-white`}>
                                    <Bell className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pengumuman</p>
                                    <h3 className="text-xs sm:text-sm font-bold truncate text-foreground">{ann.title}</h3>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            </Link>
                        ))}
                    </div>
                )}

                {/* Middle Row: Charts + Schedule + Activity */}
                <div className="grid gap-5 sm:gap-6 xl:grid-cols-4">
                    {/* Admin Only: Topic Distribution */}
                    {user_role === 'admin' && (
                        <Card className={`xl:col-span-1 card-hover shadow-xs border border-border/80 overflow-hidden rounded-2xl md:rounded-xl ${mobileTab === 'overview' ? 'block' : 'hidden'} md:block`}>
                            <div className="flex items-center justify-between border-b px-5 sm:px-6 py-4">
                                <div>
                                    <h2 className="font-bold text-foreground text-sm sm:text-base">Distribusi Topik</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Materi per mata pelajaran</p>
                                </div>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height={180}>
                                        <PieChart>
                                            <Pie
                                                data={topicData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={80}
                                                paddingAngle={3}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {topicData.map((entry, index) => (
                                                    <Cell key={index} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-3 space-y-2">
                                    {topicData.map((item) => (
                                        <div key={item.name} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-foreground font-medium">{item.name}</span>
                                            </div>
                                            <span className="font-bold text-muted-foreground">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Admin Only: Popular Instructors */}
                    {user_role === 'admin' && (
                        <Card className={`xl:col-span-1 card-hover shadow-xs border border-border/80 overflow-hidden rounded-2xl md:rounded-xl ${mobileTab === 'activity' ? 'block' : 'hidden'} md:block`}>
                            <div className="flex items-center justify-between border-b px-5 sm:px-6 py-4">
                                <div>
                                    <h2 className="font-bold text-foreground text-sm sm:text-base">Instruktur</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Populer bulan ini</p>
                                </div>
                                <Star className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <CardContent className="p-4 sm:p-5 space-y-3">
                                {popularInstructors.length > 0 ? popularInstructors.map((inst, i) => {
                                    const c = colorMap[inst.color ?? 'primary'];
                                    return (
                                        <div key={i} className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/50 cursor-pointer">
                                            <Avatar className="h-9 w-9 border-2 border-background shadow-xs">
                                                <AvatarFallback className="text-xs font-bold" style={{ backgroundColor: c.hex + '20', color: c.hex }}>
                                                    {inst.name.split(' ').map(n => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs sm:text-sm font-bold text-foreground truncate">{inst.name}</p>
                                                <p className="text-[11px] text-muted-foreground">{inst.role}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs sm:text-sm font-bold text-foreground">{inst.lessons}</p>
                                                <p className="text-[10px] text-muted-foreground">Pertemuan</p>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                        <Users className="h-10 w-10 mb-2 opacity-30" />
                                        <p className="text-xs font-medium">Belum ada data instruktur</p>
                                    </div>
                                )}
                                {user_role === 'admin' && popularInstructors.length > 0 && (
                                    <Link href={route('teachers.index')} className="flex items-center justify-center gap-1 pt-2 text-xs font-bold text-primary transition hover:text-primary/80">
                                        Lihat semua instruktur
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Teacher Only: Pending Grading */}
                    {user_role === 'teacher' && (
                        <Card className={`xl:col-span-2 card-hover shadow-xs border border-border/80 overflow-hidden rounded-2xl md:rounded-xl ${mobileTab === 'overview' ? 'block' : 'hidden'} md:block`}>
                            <div className="flex items-center justify-between border-b px-5 sm:px-6 py-4">
                                <div>
                                    <h2 className="font-bold text-foreground text-sm sm:text-base">Tugas Perlu Dinilai</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Asesmen menunggu penilaian</p>
                                </div>
                                <ClipboardCheck className="h-4 w-4 text-rose-500" />
                            </div>
                            <CardContent className="p-0">
                                {(safeStats.pending_grading_list ?? []).length > 0 ? (
                                    <div className="divide-y divide-border/60">
                                        {(safeStats.pending_grading_list ?? []).map((item, i) => (
                                            <Link key={i} href="/assignments" className="flex items-center gap-3 p-4 transition hover:bg-muted/30 active:bg-muted/60">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">{item.title}</p>
                                                    <p className="text-[11px] text-muted-foreground truncate">{item.class} &bull; {item.subject}</p>
                                                </div>
                                                <Badge variant="destructive" className="shrink-0 text-[10px] font-bold rounded-lg">{item.pending_count} Perlu Dinilai</Badge>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500/50" />
                                        <p className="text-xs sm:text-sm font-bold">Semua tugas sudah dinilai</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Student Only: Upcoming Deadlines */}
                    {user_role === 'student' && (
                        <Card className={`xl:col-span-1 card-hover shadow-xs border border-border/80 overflow-hidden rounded-2xl md:rounded-xl ${mobileTab === 'schedule' ? 'block' : 'hidden'} md:block`}>
                            <div className="flex items-center justify-between border-b px-5 sm:px-6 py-4">
                                <div>
                                    <h2 className="font-bold text-foreground text-sm sm:text-base">Tugas Mendatang</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Tenggat waktu terdekat</p>
                                </div>
                                <Clock className="h-4 w-4 text-amber-500" />
                            </div>
                            <CardContent className="p-0">
                                {(safeStats.upcoming_deadlines ?? []).length > 0 ? (
                                    <div className="divide-y divide-border/60">
                                        {(safeStats.upcoming_deadlines ?? []).map((item, i) => (
                                            <Link key={i} href="/assignments" className="flex items-center gap-3 p-4 transition hover:bg-muted/30 active:bg-muted/60">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">{item.title}</p>
                                                    <p className="text-[11px] text-muted-foreground truncate">{item.subject}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className={`text-xs font-bold ${item.is_urgent ? 'text-rose-500' : 'text-amber-500'}`}>{item.due_date}</p>
                                                    {item.is_urgent && <span className="text-[9px] uppercase font-bold text-rose-500">Mendesak</span>}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500/50" />
                                        <p className="text-xs sm:text-sm font-bold">Tidak ada tugas mendesak</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Student Only: Grade Trend */}
                    {user_role === 'student' && (
                        <Card className={`xl:col-span-1 card-hover shadow-xs border border-border/80 overflow-hidden rounded-2xl md:rounded-xl ${mobileTab === 'overview' ? 'block' : 'hidden'} md:block`}>
                            <div className="flex items-center justify-between border-b px-5 sm:px-6 py-4">
                                <div>
                                    <h2 className="font-bold text-foreground text-sm sm:text-base">Perkembangan Belajar</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Tren nilai terbaru</p>
                                </div>
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </div>
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height={180}>
                                        <LineChart data={safeStats.grade_trend ?? []}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }} />
                                            <Line type="monotone" dataKey="score" stroke="#5E6AD2" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Today's Schedule */}
                    <Card className={`card-hover shadow-xs border border-border/80 overflow-hidden rounded-2xl md:rounded-xl ${user_role === 'teacher' ? 'xl:col-span-2' : 'xl:col-span-1'} ${mobileTab === 'schedule' ? 'block' : 'hidden'} md:block`}>
                        <div className="flex items-center justify-between border-b px-5 sm:px-6 py-4">
                            <div>
                                <h2 className="font-bold text-foreground text-sm sm:text-base">Jadwal Hari Ini</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">{todayName}, {todayDate}</p>
                            </div>
                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wide">Live</span>
                        </div>
                        <CardContent className="p-4 space-y-2">
                            {(todaySchedule ?? []).length === 0 ? (
                                <div className="py-12 text-center">
                                    <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                                    <p className="text-sm text-muted-foreground">Tidak ada jadwal mengajar hari ini.</p>
                                </div>
                            ) : (
                                todaySchedule.map((s, i) => (
                                    <div
                                        key={i}
                                        className={`group relative flex items-center gap-4 rounded-lg p-3 transition-all ${
                                            s.is_current ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50'
                                        }`}
                                    >
                                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                            s.is_current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-semibold text-foreground truncate">{s.subject}</h3>
                                                {s.is_current && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                                            </div>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                {s.class ? `Kelas ${s.class}` : s.teacher}
                                                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                                {s.time}
                                            </p>
                                        </div>
                                        {s.is_current && (
                                            <div className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                                                Sekarang
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Assignment Progress */}
                    {user_role !== 'teacher' && (
                        <Card className="xl:col-span-1 card-hover shadow-sm border border-border/80 overflow-hidden">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <div>
                                <h2 className="font-semibold text-foreground">Progress Asesmen</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Status pengumpulan tugas</p>
                            </div>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <CardContent className="p-5">
                            {(() => {
                                const ap = safeStats.assignment_progress;
                                const total = Math.max(ap?.total ?? 1, 1);
                                
                                let chartData = [];
                                if (user_role === 'student') {
                                    const gradedPct = Math.round(((ap?.graded ?? 0) / total) * 100);
                                    const ungradedPct = Math.round(((ap?.ungraded ?? 0) / total) * 100);
                                    const unsubmittedPct = Math.max(0, 100 - gradedPct - ungradedPct);
                                    chartData = [
                                        { name: 'Selesai Dinilai', value: gradedPct, fill: '#28c76f' },
                                        { name: 'Menunggu Penilaian', value: ungradedPct, fill: '#ff9f43' },
                                        { name: 'Belum Dikerjakan', value: unsubmittedPct, fill: '#7367f0' },
                                    ];
                                } else {
                                    const gradedPct = Math.round(((ap?.graded ?? 0) / total) * 100);
                                    const ungradedPct = Math.max(0, 100 - gradedPct);
                                    chartData = [
                                        { name: 'Selesai Dinilai', value: gradedPct, fill: '#28c76f' },
                                        { name: 'Perlu Dinilai', value: ungradedPct, fill: '#ea5455' },
                                    ];
                                }

                                return (
                                    <>
                                        <div className="flex items-center justify-center">
                                            <ResponsiveContainer width="100%" height={180}>
                                                <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="80%" barSize={12} data={chartData}>
                                                    <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#f1f0f2' }} />
                                                </RadialBarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {chartData.map((item) => (
                                                <div key={item.name} className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                                                        <span className="text-foreground">{item.name}</span>
                                                    </div>
                                                    <span className="font-medium text-muted-foreground">{item.value}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                );
                            })()}
                        </CardContent>
                    </Card>
                    )}
                </div>

                {/* P5 Progress (Student Only) */}
                {user_role === 'student' && (safeStats.p5_total ?? 0) > 0 && (
                    <Card className={`card-hover shadow-xs border border-border/80 overflow-hidden rounded-2xl md:rounded-xl ${mobileTab === 'overview' ? 'block' : 'hidden'} md:block`}>
                        <div className="flex items-center justify-between border-b px-5 sm:px-6 py-4">
                            <div>
                                <h2 className="font-bold text-foreground text-sm sm:text-base">Projek P5</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Projek Penguatan Profil Pelajar Pancasila</p>
                            </div>
                            <Heart className="h-4 w-4 text-rose-500" />
                        </div>
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-2xl sm:text-3xl font-black text-foreground">{safeStats.p5_scored}/{safeStats.p5_total}</p>
                                    <p className="text-xs text-muted-foreground">Sub-elemen dinilai</p>
                                </div>
                                <Link
                                    href={route('p5.student')}
                                    className="flex items-center gap-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 transition hover:bg-rose-100 dark:hover:bg-rose-950/50"
                                >
                                    Lihat Detail
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                            {(safeStats.p5_total ?? 0) > 0 && (
                                <div className="mt-4 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className="font-bold text-foreground">{safeStats.p5_progress ?? 0}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all"
                                            style={{ width: `${safeStats.p5_progress ?? 0}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Bottom Row: Course Table + Recent Activity */}
                <div className="grid gap-5 sm:gap-6 xl:grid-cols-3">
                    {/* Course Progress Table */}
                    {user_role !== 'teacher' && (
                        <Card className={`xl:col-span-2 shadow-xs border border-border/80 overflow-hidden rounded-2xl md:rounded-xl ${mobileTab === 'overview' ? 'block' : 'hidden'} md:block`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b px-5 sm:px-6 py-4">
                            <div>
                                <h2 className="font-bold text-foreground text-sm sm:text-base">Progress Siswa</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Status pembelajaran terkini</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                {classes && classes.length > 0 && (
                                    <select
                                        value={classFilter}
                                        onChange={e => { setClassFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(1); }}
                                        className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="all">Semua Kelas</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                )}
                                {subjects && subjects.length > 0 && (
                                    <select
                                        value={subjectFilter}
                                        onChange={e => { setSubjectFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(1); }}
                                        className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="all">Semua Mapel</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                )}
                                <select
                                    value={perPage}
                                    onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>
                        <div className="w-full">
                            {courseData.length > 0 ? (
                                <>
                                    <div className="w-full text-sm block sm:table">
                                        <div className="hidden sm:table-header-group bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                            <div className="sm:table-row text-left text-xs font-semibold uppercase text-muted-foreground">
                                                <div className="sm:table-cell px-6 py-3 font-medium">Siswa</div>
                                                <div className="sm:table-cell px-6 py-3 font-medium">Mata Pelajaran</div>
                                                <div
                                                    className="sm:table-cell px-6 py-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                                                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                                >
                                                    <span className="inline-flex items-center gap-1">
                                                        Progress
                                                        <ArrowUpDown className="h-3 w-3" />
                                                        {sortOrder === 'desc' ? '↓' : '↑'}
                                                    </span>
                                                </div>
                                                <div className="sm:table-cell px-6 py-3 font-medium">Status</div>
                                            </div>
                                        </div>
                                        <div className="block sm:table-row-group divide-y divide-border/60 sm:divide-y-0">
                                            {paginatedData.map((row) => (
                                                <div key={row.student_id + '-' + row.subject_id} className="block sm:table-row border-b border-border/60 last:border-0 transition hover:bg-muted/30 p-4 sm:p-0">
                                                    <div className="block sm:table-cell px-0 sm:px-6 py-2 sm:py-3 border-b border-dashed sm:border-0 border-border/50 mb-2 pb-3 sm:mb-0 sm:pb-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <Avatar className="h-8 w-8 shrink-0">
                                                                <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                                                    {row.student.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-bold text-foreground text-xs sm:text-sm truncate">{row.student}</span>
                                                                {row.class_name && <span className="text-[10px] text-muted-foreground truncate">{row.class_name}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex sm:table-cell items-center justify-between sm:justify-start px-0 sm:px-6 py-1.5 sm:py-3 text-muted-foreground min-w-0">
                                                        <span className="sm:hidden text-xs font-semibold text-foreground/70 shrink-0 mr-4">Mapel</span>
                                                        <span className="text-right sm:text-left text-xs sm:text-sm break-words min-w-0 flex-1">{row.course}</span>
                                                    </div>
                                                    <div className="flex sm:table-cell items-center justify-between sm:justify-start px-0 sm:px-6 py-1.5 sm:py-3 min-w-0">
                                                        <span className="sm:hidden text-xs font-semibold text-foreground/70 shrink-0 mr-4">Progress</span>
                                                        <div className="flex items-center gap-3 w-[50%] sm:w-auto justify-end sm:justify-start">
                                                            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all"
                                                                    style={{
                                                                        width: `${row.progress}%`,
                                                                        backgroundColor: row.progress >= 80 ? '#28c76f' : row.progress >= 50 ? '#ff9f43' : '#ea5455',
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="w-8 text-xs font-bold text-right text-muted-foreground">{row.progress}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex sm:table-cell items-center justify-between sm:justify-start px-0 sm:px-6 py-1.5 sm:py-3 min-w-0">
                                                        <span className="sm:hidden text-xs font-semibold text-foreground/70 shrink-0 mr-4">Status</span>
                                                        <Badge
                                                            variant={row.status === 'completed' ? 'default' : row.status === 'active' ? 'secondary' : 'outline'}
                                                            className={row.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 font-bold' : 'font-bold'}
                                                        >
                                                            {row.status === 'completed' ? 'Selesai' : row.status === 'active' ? 'Aktif' : 'Tertunda'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-5 sm:px-6 py-3 text-xs text-muted-foreground">
                                        <span>Menampilkan {startRow}-{endRow} dari {totalFiltered}</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={safePage <= 1}
                                                className="rounded-xl border border-border px-2.5 py-1.5 font-bold hover:bg-muted transition disabled:opacity-30 disabled:pointer-events-none"
                                            >
                                                <ChevronLeft className="h-3.5 w-3.5" />
                                            </button>
                                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                                const startPage = Math.max(1, safePage - 2);
                                                const pageNum = startPage + i;
                                                if (pageNum > totalPages) return null;
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setPage(pageNum)}
                                                        className={`min-w-[28px] rounded-xl px-2.5 py-1.5 font-bold transition ${
                                                            pageNum === safePage
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'border border-border hover:bg-muted'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                            <button
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={safePage >= totalPages}
                                                className="rounded-xl border border-border px-2.5 py-1.5 font-bold hover:bg-muted transition disabled:opacity-30 disabled:pointer-events-none"
                                            >
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <BookOpen className="h-10 w-10 mb-2 opacity-30" />
                                    <p className="text-sm font-bold">Belum ada data progress siswa</p>
                                    <p className="text-xs mt-1">Data akan muncul setelah siswa mulai mengerjakan asesmen</p>
                                </div>
                            )}
                        </div>
                    </Card>
                    )}

                    {/* Recent Activity */}
                    <Card className={`shadow-xs border border-border/80 overflow-hidden rounded-2xl md:rounded-xl ${user_role === 'teacher' ? 'xl:col-span-3' : 'xl:col-span-1'} ${mobileTab === 'activity' ? 'block' : 'hidden'} md:block`}>
                        <div className="flex items-center justify-between border-b px-5 sm:px-6 py-4">
                            <div>
                                <h2 className="font-bold text-foreground text-sm sm:text-base">Aktivitas Terbaru</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Materi, asesmen, dan pengumpulan</p>
                            </div>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="divide-y divide-border/60">
                            {(recentActivities ?? []).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <ClipboardList className="h-10 w-10 mb-2 opacity-30" />
                                    <p className="text-xs sm:text-sm font-medium">Belum ada aktivitas</p>
                                </div>
                            ) : (
                                recentActivities.slice(0, 6).map((act) => {
                                    const color = activityColorMap[act.type] ?? '#5E6AD2';
                                    const label = activityLabelMap[act.type] ?? act.type;
                                    return (
                                        <div key={act.id} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 transition hover:bg-muted/30">
                                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs sm:text-sm font-bold text-foreground truncate">{act.title}</p>
                                                <p className="text-[11px] text-muted-foreground truncate">{act.subject}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span
                                                    className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                                                    style={{ backgroundColor: color }}
                                                >
                                                    {label}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground hidden sm:inline">{act.created_at}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
