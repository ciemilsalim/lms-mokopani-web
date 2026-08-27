import React, { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    Users, BookOpen, ClipboardList, CalendarCheck, Search,
    Plus, ChevronRight, CheckCircle2, Clock, AlertCircle, ExternalLink, Library
} from 'lucide-react';
import { SectionHeader, SummaryCard, QuickActionGrid, EmptyState } from '@/components/dashboard';
import { ClassHeader, ClassTabs, StudentCard, type ClassTabKey, type StudentItemProps } from '@/components/classes';
import { AttendanceClassCard, AttendanceHistory } from '@/components/attendance';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface MaterialItem {
    id: number;
    title: string;
    subject_name: string;
    created_at?: string;
}

interface AssignmentItem {
    id: number;
    title: string;
    subject_name: string;
    due_date?: string;
    pending_count?: number;
    created_at?: string;
}

interface ClassShowProps {
    schoolClass: {
        id: number;
        name: string;
        students_count: number;
        subjects: string[];
    };
    students: StudentItemProps[];
    materials: MaterialItem[];
    assignments: AssignmentItem[];
}

export default function ClassShow({
    schoolClass,
    students = [],
    materials = [],
    assignments = [],
}: ClassShowProps) {
    const [activeTab, setActiveTab] = useState<ClassTabKey>('overview');
    const [studentSearch, setStudentSearch] = useState('');

    const cleanClassName = schoolClass.name.replace(/^Kelas\s+Kelas\s*/i, 'Kelas ').replace(/^Kelas\s*(\d)/i, 'Kelas $1');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Kelas Saya', href: '/classes' },
        { title: cleanClassName, href: `/classes/${schoolClass.id}` },
    ];

    const filteredStudents = useMemo(() => {
        if (!studentSearch.trim()) return students;
        const q = studentSearch.toLowerCase();
        return students.filter(
            (s) => s.name.toLowerCase().includes(q) || (s.nis && s.nis.toLowerCase().includes(q))
        );
    }, [students, studentSearch]);

    const pendingAssignments = useMemo(() => {
        return assignments.filter((a) => (a.pending_count || 0) > 0);
    }, [assignments]);

    // Class specific quick actions with direct action verbs
    const classQuickActions = [
        {
            id: 'presensi',
            title: 'Mulai Presensi',
            description: 'Buka form absensi',
            href: '/sso/presensi',
            icon: CalendarCheck,
            variant: 'info' as const,
            isExternal: true,
        },
        {
            id: 'materi',
            title: 'Tambah Materi',
            description: 'Unggah modul & bahan',
            href: '/materials/create',
            icon: BookOpen,
            variant: 'primary' as const,
        },
        {
            id: 'asesmen',
            title: 'Buat Asesmen',
            description: 'Tugas, tes & kuis',
            href: '/assignments/create',
            icon: ClipboardList,
            variant: 'destructive' as const,
        },
        {
            id: 'siswa',
            title: 'Kelola Siswa',
            description: `${students.length} siswa terdaftar`,
            href: '#',
            icon: Users,
            variant: 'success' as const,
            onClick: () => setActiveTab('students'),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${cleanClassName} - LMS Mokopani`} />

            <div className="space-y-4 sm:space-y-5 fade-in pb-16 md:pb-6 max-w-7xl mx-auto w-full min-w-0">
                {/* 1. Compact Contextual Hero Banner */}
                <ClassHeader
                    className={cleanClassName}
                    subjects={schoolClass.subjects}
                    studentsCount={students.length}
                    backUrl="/classes"
                />

                {/* 2. Touch-Friendly Navigation Tabs */}
                <ClassTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    studentsCount={students.length}
                    materialsCount={materials.length}
                    assignmentsCount={assignments.length}
                />

                {/* TAB 1: RINGKASAN RUANG KERJA (OVERVIEW) */}
                {activeTab === 'overview' && (
                    <div className="space-y-4 sm:space-y-5 fade-in w-full min-w-0">
                        {/* Summary Metrics Bar */}
                        <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 sm:gap-3 w-full min-w-0">
                            <SummaryCard
                                label="Siswa"
                                value={students.length}
                                icon={Users}
                                variant="primary"
                                href="#"
                                onClick={(e) => { e.preventDefault(); setActiveTab('students'); }}
                            />
                            <SummaryCard
                                label="Mata Pelajaran"
                                value={schoolClass.subjects.length || 1}
                                icon={BookOpen}
                                variant="success"
                            />
                            <SummaryCard
                                label="Materi"
                                value={materials.length}
                                icon={Library}
                                variant="warning"
                                href="#"
                                onClick={(e) => { e.preventDefault(); setActiveTab('materials'); }}
                            />
                            <SummaryCard
                                label="Asesmen"
                                value={assignments.length}
                                icon={ClipboardList}
                                variant="destructive"
                                href="#"
                                onClick={(e) => { e.preventDefault(); setActiveTab('assignments'); }}
                            />
                        </div>

                        {/* Aksi Cepat Kelas */}
                        <div className="w-full min-w-0">
                            <SectionHeader
                                title="Aksi Cepat Kelas"
                                subtitle={`Tindakan langsung untuk ${cleanClassName}`}
                                className="mb-2"
                            />
                            <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 sm:gap-3 w-full min-w-0">
                                {classQuickActions.map((act) => {
                                    const Icon = act.icon;
                                    const cardContent = (
                                        <div className="group flex flex-col xs:flex-row items-center gap-2 xs:gap-2.5 p-2.5 sm:p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/40 transition-all shadow-2xs h-full min-h-[52px] w-full min-w-0">
                                            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0 text-center xs:text-left">
                                                <h3 className="text-xs font-bold text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                                                    {act.title}
                                                </h3>
                                                <p className="text-[10px] text-muted-foreground truncate hidden xs:block mt-0.5">
                                                    {act.description}
                                                </p>
                                            </div>
                                        </div>
                                    );

                                    if (act.onClick) {
                                        return (
                                            <button
                                                key={act.id}
                                                type="button"
                                                onClick={act.onClick}
                                                className="block min-w-0 w-full focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-2xl active:scale-97 transition-transform text-left"
                                            >
                                                {cardContent}
                                            </button>
                                        );
                                    }

                                    if (act.isExternal) {
                                        return (
                                            <a
                                                key={act.id}
                                                href={act.href}
                                                className="block min-w-0 w-full focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-2xl active:scale-97 transition-transform"
                                            >
                                                {cardContent}
                                            </a>
                                        );
                                    }

                                    return (
                                        <Link
                                            key={act.id}
                                            href={act.href}
                                            className="block min-w-0 w-full focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-2xl active:scale-97 transition-transform"
                                        >
                                            {cardContent}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Perlu Tindakan */}
                        {pendingAssignments.length > 0 && (
                            <Card className="rounded-2xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 p-3.5 sm:p-4 w-full min-w-0">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                            <AlertCircle className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                                {pendingAssignments.reduce((sum, a) => sum + (a.pending_count || 0), 0)} tugas perlu dinilai di {cleanClassName}
                                            </h3>
                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                {pendingAssignments.map(a => a.title).join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/assignments/${pendingAssignments[0].id}/grade-view`}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0"
                                    >
                                        <span>Periksa</span>
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </Card>
                        )}

                        {/* Aktivitas Terakhir Kelas */}
                        <Card className="rounded-2xl border border-border/70 shadow-xs bg-card overflow-hidden w-full min-w-0">
                            <div className="p-3 sm:p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                                <h3 className="text-xs sm:text-sm font-bold text-foreground">Aktivitas Terakhir Kelas</h3>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('materials')}
                                    className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                                >
                                    <span>Semua</span>
                                    <ChevronRight className="h-3 w-3" />
                                </button>
                            </div>
                            <CardContent className="p-0">
                                {materials.length === 0 && assignments.length === 0 ? (
                                    <div className="py-5 text-center text-xs text-muted-foreground">
                                        Belum ada aktivitas di kelas ini
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/50">
                                        {materials.slice(0, 2).map((m) => (
                                            <Link
                                                key={m.id}
                                                href={`/materials/${m.id}`}
                                                className="flex items-center justify-between p-3 sm:p-3.5 hover:bg-muted/30 transition text-xs"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                                        <BookOpen className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="font-bold text-foreground truncate block">{m.title}</span>
                                                        <span className="text-[10px] text-muted-foreground">Materi Pembelajaran</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            </Link>
                                        ))}
                                        {assignments.slice(0, 1).map((a) => (
                                            <Link
                                                key={a.id}
                                                href={`/assignments/${a.id}/grade-view`}
                                                className="flex items-center justify-between p-3 sm:p-3.5 hover:bg-muted/30 transition text-xs"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                                        <ClipboardList className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="font-bold text-foreground truncate block">{a.title}</span>
                                                        <span className="text-[10px] text-muted-foreground">Penugasan & Asesmen</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* TAB 2: SISWA (ROSTER CARD LIST) */}
                {activeTab === 'students' && (
                    <div className="space-y-4 fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <SectionHeader
                                title={`Roster Siswa (${filteredStudents.length})`}
                                subtitle={`Daftar siswa terdaftar di Kelas ${schoolClass.name}`}
                                icon={Users}
                            />

                            {/* Student Search Bar */}
                            <div className="relative max-w-xs w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Cari nama atau NIS..."
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-card border border-border/70 focus:outline-none focus:ring-2 focus:ring-primary/20 transition shadow-2xs"
                                />
                            </div>
                        </div>

                        {filteredStudents.length === 0 ? (
                            <EmptyState
                                icon={Users}
                                title={studentSearch ? 'Siswa Tidak Ditemukan' : 'Belum Ada Siswa'}
                                description={
                                    studentSearch
                                        ? `Tidak ada siswa yang sesuai dengan "${studentSearch}".`
                                        : `Belum ada data siswa yang dimasukkan ke Kelas ${schoolClass.name}.`
                                }
                            />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                                {filteredStudents.map((st) => (
                                    <StudentCard key={st.id} student={st} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: MATERI */}
                {activeTab === 'materials' && (
                    <div className="space-y-4 fade-in">
                        <div className="flex items-center justify-between">
                            <SectionHeader
                                title={`Bahan Materi (${materials.length})`}
                                subtitle={`Materi pembelajaran untuk Kelas ${schoolClass.name}`}
                                icon={Library}
                            />
                            <Link
                                href="/materials/create"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition active:scale-95 min-h-[38px]"
                            >
                                <Plus className="h-4 w-4" />
                                <span>+ Materi</span>
                            </Link>
                        </div>

                        {materials.length === 0 ? (
                            <EmptyState
                                icon={Library}
                                title="Belum Ada Materi"
                                description={`Belum ada bahan materi yang diunggah untuk Kelas ${schoolClass.name}.`}
                                actionLabel="+ Tambah Materi"
                                actionHref="/materials/create"
                            />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {materials.map((mat) => (
                                    <Link
                                        key={mat.id}
                                        href={`/materials/${mat.id}`}
                                        className="group p-4 rounded-2xl bg-card border border-border/70 hover:border-primary/40 shadow-2xs transition-all active:scale-[0.98] flex items-center justify-between min-h-[56px]"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                                <BookOpen className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                                    {mat.title}
                                                </h4>
                                                <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                                                    {mat.subject_name} {mat.created_at ? `• ${mat.created_at}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: ASESMEN */}
                {activeTab === 'assignments' && (
                    <div className="space-y-4 fade-in">
                        <div className="flex items-center justify-between">
                            <SectionHeader
                                title={`Asesmen & Tugas (${assignments.length})`}
                                subtitle={`Penilaian aktif untuk Kelas ${schoolClass.name}`}
                                icon={ClipboardList}
                            />
                            <Link
                                href="/assignments/create"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-xs hover:bg-rose-700 transition active:scale-95 min-h-[38px]"
                            >
                                <Plus className="h-4 w-4" />
                                <span>+ Asesmen</span>
                            </Link>
                        </div>

                        {assignments.length === 0 ? (
                            <EmptyState
                                icon={ClipboardList}
                                title="Belum Ada Asesmen"
                                description={`Belum ada tugas atau asesmen yang dibuat untuk Kelas ${schoolClass.name}.`}
                                actionLabel="+ Buat Asesmen"
                                actionHref="/assignments/create"
                            />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {assignments.map((asg) => (
                                    <Link
                                        key={asg.id}
                                        href={`/assignments/${asg.id}/grade-view`}
                                        className="group p-4 rounded-2xl bg-card border border-border/70 hover:border-primary/40 shadow-2xs transition-all active:scale-[0.98] flex items-center justify-between min-h-[64px]"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                                <ClipboardList className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                                    {asg.title}
                                                </h4>
                                                <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                                                    {asg.subject_name} {asg.due_date ? `• Deadline: ${asg.due_date}` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {typeof asg.pending_count === 'number' && asg.pending_count > 0 && (
                                                <Badge variant="destructive" className="text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                                    {asg.pending_count} Dinilai
                                                </Badge>
                                            )}
                                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 5: PRESENSI HUB & SSO INTEGRATION */}
                {activeTab === 'attendance' && (
                    <div className="space-y-5 fade-in">
                        <SectionHeader
                            title="Attendance Hub — Presensi Kelas"
                            subtitle={`Pusat konteks & ringkasan kehadiran Kelas ${schoolClass.name}`}
                            icon={CalendarCheck}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AttendanceClassCard
                                classNameStr={`Kelas ${schoolClass.name}`}
                                subjectName={schoolClass.subjects[0] || 'Informatika'}
                                studentsCount={schoolClass.students_count}
                                counts={{ hadir: schoolClass.students_count, sakit: 0, izin: 0, alpha: 0 }}
                                ssoUrl="/sso/presensi"
                            />

                            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <span>Riwayat Presensi Pertemuan</span>
                                </h3>
                                <AttendanceHistory
                                    items={[
                                        {
                                            id: 1,
                                            date: 'Hari ini',
                                            className: `Kelas ${schoolClass.name}`,
                                            subjectName: schoolClass.subjects[0] || 'Informatika',
                                            studentsCount: schoolClass.students_count,
                                            presentCount: schoolClass.students_count,
                                        }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
