import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage, Link } from '@inertiajs/react';
import {
    BookOpen, ClipboardCheck, ClipboardList, GraduationCap, Library,
    TrendingUp, Users, Bell, ChevronRight, ChevronLeft, Clock, Award, BarChart3,
    MoreHorizontal, Play, Target, Calendar, CheckCircle2, Circle,
    User, Star, FileText, Activity, ArrowUpRight, Zap, Heart, ArrowUpDown,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Cell, PieChart, Pie, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
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
    topic_data?: { name: string; value: number; color: string }[];
    assignment_progress?: { completed: number; pending: number; total: number };
    popular_instructors?: { name: string; role: string; lessons: number; color?: string }[];
    course_progress?: { student_id: number; student: string; course: string; subject_id: number; progress: number; status: string }[];
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
        },
        {
            key: 'teachers',
            label: 'Guru',
            value: stats.total_teachers,
            icon: Users,
            color: 'info',
            roles: ['admin'],
        },
        {
            key: 'subjects',
            label: 'Mata Pelajaran',
            value: stats.total_subjects,
            icon: BookOpen,
            color: 'success',
            roles: ['admin', 'teacher', 'student'],
        },
        {
            key: 'materials',
            label: 'Materi',
            value: stats.total_materials,
            icon: Library,
            color: 'warning',
            roles: ['admin', 'teacher', 'student'],
        },
        {
            key: 'assignments',
            label: 'Asesmen',
            value: stats.total_assignments,
            icon: ClipboardList,
            color: 'destructive',
            roles: ['admin', 'teacher', 'student'],
        },
        {
            key: 'pending',
            label: 'Belum Dinilai',
            value: stats.pending_submissions,
            icon: ClipboardCheck,
            color: 'info',
            roles: ['admin', 'teacher'],
        },
        {
            key: 'pending_student',
            label: 'Belum Dikerjakan',
            value: stats.pending_submissions,
            icon: ClipboardCheck,
            color: 'info',
            roles: ['student'],
        },
        {
            key: 'p5',
            label: 'Projek P5',
            value: stats.p5_total ?? 0,
            icon: Heart,
            color: 'destructive',
            roles: ['student'],
        },
    ];
    return cards.filter(c => c.roles.includes(role));
};

const colorMap: Record<string, { hex: string; bg: string; text: string }> = {
    primary: { hex: '#7367f0', bg: 'bg-[#7367f0]/10', text: 'text-[#7367f0]' },
    success: { hex: '#28c76f', bg: 'bg-[#28c76f]/10', text: 'text-[#28c76f]' },
    info: { hex: '#00cfe8', bg: 'bg-[#00cfe8]/10', text: 'text-[#00cfe8]' },
    warning: { hex: '#ff9f43', bg: 'bg-[#ff9f43]/10', text: 'text-[#ff9f43]' },
    destructive: { hex: '#ea5455', bg: 'bg-[#ea5455]/10', text: 'text-[#ea5455]' },
};

const activityColorMap: Record<string, string> = {
    material: '#7367f0',
    assignment: '#ea5455',
};

const activityLabelMap: Record<string, string> = {
    material: 'Materi',
    assignment: 'Asesmen',
};



export default function Dashboard({ stats, identity, subjects, recentActivities, recentAnnouncements, todaySchedule, todayName }: DashboardProps) {
    const { auth, user_role } = usePage<SharedData>().props;

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

    const ap = safeStats.assignment_progress;
    const completedPct = ap ? Math.round((ap.completed / Math.max(ap.total, 1)) * 100) : 65;
    const pendingPct = ap ? Math.round((ap.pending / Math.max(ap.total, 1)) * 100) : 25;
    const remainingPct = Math.max(0, 100 - completedPct - pendingPct);
    const assignmentRadialData = [
        { name: 'Selesai', value: completedPct, fill: '#28c76f' },
        { name: 'Tertunda', value: pendingPct, fill: '#ff9f43' },
        { name: 'Belum', value: remainingPct ?? 10, fill: '#7367f0' },
    ];

    const popularInstructors = safeStats.popular_instructors ?? [];
    const courseData = safeStats.course_progress ?? [];

    const [subjectFilter, setSubjectFilter] = useState<number | 'all'>('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [perPage, setPerPage] = useState(10);
    const [page, setPage] = useState(1);

    const filteredData = useMemo(() => {
        return courseData
            .filter(row => subjectFilter === 'all' || row.subject_id === subjectFilter)
            .sort((a, b) => sortOrder === 'desc' ? b.progress - a.progress : a.progress - b.progress);
    }, [courseData, subjectFilter, sortOrder]);

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

            <div className="space-y-6">
                {/* Welcome Banner + Identity */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/90 via-primary to-primary/70 p-6 text-white shadow-sm">
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white/70">Selamat datang kembali</p>
                            <h1 className="mt-1 text-2xl font-semibold">
                                {identity?.name ?? auth?.user?.name ?? 'Pengguna'}
                                <span className="ml-2 inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
                                    {roleLabel[user_role] ?? user_role}
                                </span>
                            </h1>
                            {identity ? (
                                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/80">
                                    {identity.idLabel && identity.idValue && (
                                        <>
                                            <span>{identity.idLabel}: <strong className="text-white">{identity.idValue}</strong></span>
                                            <span className="hidden sm:inline text-white/30">|</span>
                                        </>
                                    )}
                                    {identity.extra && (
                                        <>
                                            <span className="text-white/90">{identity.extra}</span>
                                            <span className="hidden sm:inline text-white/30">|</span>
                                        </>
                                    )}
                                    <span className="text-white/70">{identity.sekolah}</span>
                                    <span className="hidden sm:inline text-white/30">|</span>
                                    <span className="text-white/70">{identity.tahunAjaran} • {identity.semester}</span>
                                </div>
                            ) : (
                                <p className="mt-1 text-sm text-white/60">Pantau aktivitas pembelajaran hari ini</p>
                            )}
                        </div>
                        <TrendingUp className="hidden h-20 w-20 text-white/10 sm:block shrink-0" />
                    </div>
                </div>

                {/* Announcements */}
                {recentAnnouncements && recentAnnouncements.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-3">
                        {recentAnnouncements.map((ann) => (
                            <Link
                                key={ann.id}
                                href={route('announcements.index')}
                                className={`flex items-center gap-4 rounded-xl border p-4 shadow-sm transition hover:shadow-md bg-card ${
                                    ann.priority === 'important' ? 'border-l-4 border-l-[#ea5455]' :
                                    ann.priority === 'warning' ? 'border-l-4 border-l-[#ff9f43]' :
                                    'border-l-4 border-l-[#7367f0]'
                                }`}
                            >
                                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                                    ann.priority === 'important' ? 'bg-[#ea5455]' :
                                    ann.priority === 'warning' ? 'bg-[#ff9f43]' :
                                    'bg-[#7367f0]'
                                } text-white`}>
                                    <Bell className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pengumuman</p>
                                    <h3 className="text-sm font-semibold truncate text-foreground">{ann.title}</h3>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                        ))}
                    </div>
                )}

                {/* Stat Cards - Vuexy Style */}
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
                    {cards.map((card) => {
                        const Icon = card.icon;
                        const c = colorMap[card.color];
                        return (
                            <Card key={card.key} className="shadow-sm">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white shadow-sm" style={{ background: c.hex + '15' }}>
                                            <Icon className="h-5 w-5" style={{ color: c.hex }} />
                                        </div>
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50">
                                            <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-2xl font-bold text-foreground">{card.value}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Middle Row: Charts + Schedule + Activity */}
                <div className="grid gap-6 xl:grid-cols-4">
                    {/* Topic Distribution - Donut Chart */}
                    <Card className="xl:col-span-1 shadow-sm">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <div>
                                <h2 className="font-semibold text-foreground">Distribusi Topik</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Materi per mata pelajaran</p>
                            </div>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <CardContent className="p-5">
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
                                            <span className="text-foreground">{item.name}</span>
                                        </div>
                                        <span className="font-medium text-muted-foreground">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Popular Instructors */}
                    <Card className="xl:col-span-1 shadow-sm">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <div>
                                <h2 className="font-semibold text-foreground">Instruktur</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Populer bulan ini</p>
                            </div>
                            <Star className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <CardContent className="p-5 space-y-4">
                            {popularInstructors.length > 0 ? popularInstructors.map((inst, i) => {
                                const c = colorMap[inst.color ?? 'primary'];
                                return (
                                    <div key={i} className="group flex items-center gap-3 rounded-lg p-2 transition hover:bg-muted/50 cursor-pointer">
                                        <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                            <AvatarFallback className="text-xs font-semibold" style={{ backgroundColor: c.hex + '20', color: c.hex }}>
                                                {inst.name.split(' ').map(n => n[0]).join('')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{inst.name}</p>
                                            <p className="text-xs text-muted-foreground">{inst.role}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-foreground">{inst.lessons}</p>
                                            <p className="text-[10px] text-muted-foreground">Pertemuan</p>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                    <Users className="h-10 w-10 mb-2 opacity-30" />
                                    <p className="text-sm font-medium">Belum ada data instruktur</p>
                                </div>
                            )}
                            {user_role === 'admin' && popularInstructors.length > 0 && (
                                <Link href={route('teachers.index')} className="flex items-center justify-center gap-1 pt-2 text-xs font-medium text-primary transition hover:text-primary/80">
                                    Lihat semua instruktur
                                    <ChevronRight className="h-3 w-3" />
                                </Link>
                            )}
                            {user_role === 'teacher' && safeStats.total_teachers > 0 && (
                                <div className="pt-1 text-center text-[10px] text-muted-foreground italic">
                                    Total {safeStats.total_teachers} guru terdaftar
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Today's Schedule */}
                    <Card className="xl:col-span-1 shadow-sm">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <div>
                                <h2 className="font-semibold text-foreground">Jadwal Hari Ini</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">{todayName}, {todayDate}</p>
                            </div>
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary uppercase">Live</span>
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
                    <Card className="xl:col-span-1 shadow-sm">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <div>
                                <h2 className="font-semibold text-foreground">Progress Asesmen</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Status pengumpulan tugas</p>
                            </div>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <CardContent className="p-5">
                            <div className="flex items-center justify-center">
                                <ResponsiveContainer width="100%" height={180}>
                                    <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="80%" barSize={12} data={assignmentRadialData}>
                                        <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#f1f0f2' }} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-3 space-y-2">
                                {assignmentRadialData.map((item) => (
                                    <div key={item.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                                            <span className="text-foreground">{item.name}</span>
                                        </div>
                                        <span className="font-medium text-muted-foreground">{item.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* P5 Progress (Student Only) */}
                {user_role === 'student' && (safeStats.p5_total ?? 0) > 0 && (
                    <Card className="shadow-sm">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <div>
                                <h2 className="font-semibold text-foreground">Projek P5</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Projek Penguatan Profil Pelajar Pancasila</p>
                            </div>
                            <Heart className="h-4 w-4 text-rose-500" />
                        </div>
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-3xl font-black text-foreground">{safeStats.p5_scored}/{safeStats.p5_total}</p>
                                    <p className="text-xs text-muted-foreground">Sub-elemen dinilai</p>
                                </div>
                                <Link
                                    href={route('p5.student')}
                                    className="flex items-center gap-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 transition hover:bg-rose-100 dark:hover:bg-rose-950/50"
                                >
                                    Lihat Detail
                                    <ChevronRight className="h-3 w-3" />
                                </Link>
                            </div>
                            {safeStats.p5_total > 0 && (
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
                <div className="grid gap-6 xl:grid-cols-3">
                    {/* Course Progress Table */}
                    <Card className="xl:col-span-2 shadow-sm">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <div>
                                <h2 className="font-semibold text-foreground">Progress Siswa</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Status pembelajaran terkini</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {subjects && subjects.length > 0 && (
                                    <select
                                        value={subjectFilter}
                                        onChange={e => { setSubjectFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(1); }}
                                        className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            {courseData.length > 0 ? (
                                <>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left text-xs font-semibold uppercase text-muted-foreground">
                                                <th className="px-6 py-3 font-medium">Siswa</th>
                                                <th className="px-6 py-3 font-medium">Mata Pelajaran</th>
                                                <th
                                                    className="px-6 py-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                                                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                                >
                                                    <span className="inline-flex items-center gap-1">
                                                        Progress
                                                        <ArrowUpDown className="h-3 w-3" />
                                                        {sortOrder === 'desc' ? '↓' : '↑'}
                                                    </span>
                                                </th>
                                                <th className="px-6 py-3 font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedData.map((row) => (
                                                <tr key={row.student_id + '-' + row.subject_id} className="border-b last:border-0 transition hover:bg-muted/30">
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                                                                    {row.student.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium text-foreground">{row.student}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-muted-foreground">{row.course}</td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all"
                                                                    style={{
                                                                        width: `${row.progress}%`,
                                                                        backgroundColor: row.progress >= 80 ? '#28c76f' : row.progress >= 50 ? '#ff9f43' : '#ea5455',
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="w-8 text-xs font-medium text-right text-muted-foreground">{row.progress}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <Badge
                                                            variant={row.status === 'completed' ? 'default' : row.status === 'active' ? 'secondary' : 'outline'}
                                                            className={row.status === 'completed' ? 'bg-[#28c76f]/10 text-[#28c76f] hover:bg-[#28c76f]/20 border-0' : ''}
                                                        >
                                                            {row.status === 'completed' ? 'Selesai' : row.status === 'active' ? 'Aktif' : 'Tertunda'}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="flex items-center justify-between border-t px-6 py-3 text-xs text-muted-foreground">
                                        <span>Menampilkan {startRow}-{endRow} dari {totalFiltered}</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={safePage <= 1}
                                                className="rounded-lg border border-border px-2.5 py-1.5 font-medium hover:bg-muted transition disabled:opacity-30 disabled:pointer-events-none"
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
                                                        className={`min-w-[28px] rounded-lg px-2.5 py-1.5 font-medium transition ${
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
                                                className="rounded-lg border border-border px-2.5 py-1.5 font-medium hover:bg-muted transition disabled:opacity-30 disabled:pointer-events-none"
                                            >
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <BookOpen className="h-12 w-12 mb-3 opacity-30" />
                                    <p className="text-sm font-medium">Belum ada data progress siswa</p>
                                    <p className="text-xs mt-1">Data akan muncul setelah siswa mulai mengerjakan asesmen</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="xl:col-span-1 shadow-sm">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <div>
                                <h2 className="font-semibold text-foreground">Aktivitas Terbaru</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Materi, asesmen, dan pengumpulan</p>
                            </div>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="divide-y">
                            {(recentActivities ?? []).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <ClipboardList className="h-12 w-12 mb-3 opacity-30" />
                                    <p className="text-sm">Belum ada aktivitas</p>
                                </div>
                            ) : (
                                recentActivities.slice(0, 6).map((act) => {
                                    const color = activityColorMap[act.type] ?? '#7367f0';
                                    const label = activityLabelMap[act.type] ?? act.type;
                                    return (
                                        <div key={act.id} className="flex items-center gap-4 px-6 py-3 transition hover:bg-muted/30">
                                            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{act.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">{act.subject}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                                                    style={{ backgroundColor: color }}
                                                >
                                                    {label}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{act.created_at}</span>
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
