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

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Daftar Kelas', href: '/classes' },
        { title: schoolClass.name, href: `/classes/${schoolClass.id}` },
    ];

    const filteredStudents = useMemo(() => {
        if (!studentSearch.trim()) return students;
        const q = studentSearch.toLowerCase();
        return students.filter(
            (s) => s.name.toLowerCase().includes(q) || (s.nis && s.nis.toLowerCase().includes(q))
        );
    }, [students, studentSearch]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Kelas ${schoolClass.name} - LMS Mokopani`} />

            <div className="space-y-5 sm:space-y-6 fade-in pb-16 md:pb-6 max-w-7xl mx-auto px-4 sm:px-6">
                {/* Contextual Header */}
                <ClassHeader
                    className={`Kelas ${schoolClass.name}`}
                    subjects={schoolClass.subjects}
                    studentsCount={schoolClass.students_count}
                    backUrl="/classes"
                />

                {/* Touch-Friendly Segmented Tabs */}
                <ClassTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    studentsCount={students.length}
                    materialsCount={materials.length}
                    assignmentsCount={assignments.length}
                />

                {/* TAB 1: RINGKASAN OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="space-y-5 sm:space-y-6 fade-in">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-4">
                            <SummaryCard
                                label="Total Siswa"
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
                                label="Bahan Materi"
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

                        {/* Quick Actions Grid for this class */}
                        <div>
                            <SectionHeader
                                title="Aksi Cepat Kelas"
                                subtitle={`Aksi langsung untuk Kelas ${schoolClass.name}`}
                                icon={BookOpen}
                                className="mb-2.5"
                            />
                            <QuickActionGrid />
                        </div>
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
