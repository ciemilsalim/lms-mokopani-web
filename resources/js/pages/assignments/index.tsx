import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ClipboardList, Plus, Users, BookOpen, ChevronDown, ChevronRight,
    Sparkles, CheckCircle2, AlertCircle, Clock, X
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { EmptyState } from '@/components/dashboard/empty-state';
import {
    AssessmentCard,
    AssessmentFilter,
    type AssignmentItem
} from '@/components/assignments';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Asesmen', href: '/assignments' },
];

interface SubjectObjectiveGroup {
    objective_id: number | null;
    objective_code: string;
    objective_description: string;
    assignments: AssignmentItem[];
}

interface SubjectGroup {
    subject_id: number;
    subject_name: string;
    objectives: SubjectObjectiveGroup[];
    total: number;
}

interface TeacherObjectiveGroup {
    objective_id: number | null;
    objective_code: string;
    objective_description: string;
    assignments: AssignmentItem[];
}

interface TeacherSubjectGroup {
    subject_id: number;
    subject_name: string;
    objectives: TeacherObjectiveGroup[];
}

interface TeacherClassGroup {
    class_id: number;
    class_name: string;
    students_count?: number;
    subjects: TeacherSubjectGroup[];
}

interface AssignmentsProps {
    assignments?: AssignmentItem[];
    grouped_assignments?: SubjectGroup[];
    teacher_grouped?: TeacherClassGroup[];
    active_year?: string;
    active_semester?: string;
    user_role: 'teacher' | 'student' | 'admin' | 'parent';
    counts_by_type?: { all?: number; initial?: number; formative?: number; summative?: number };
    stats?: { total_pending_grading: number; total_active: number; total_overdue?: number };
}

const sortAssignments = (assignments: AssignmentItem[]) => {
    const order: Record<string, number> = { 'initial': 1, 'formative': 2, 'summative': 3 };
    return assignments.sort((a, b) => (order[a.assessment_type || ''] || 99) - (order[b.assessment_type || ''] || 99));
};

// ── Student View ─────────────────────────────────────────────
function StudentAssignmentsView({ groups, search, studentStatusFilter, onClearSearch }: {
    groups: SubjectGroup[];
    search: string;
    studentStatusFilter: 'all' | 'pending' | 'submitted' | 'graded';
    onClearSearch: () => void;
}) {
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | 'all'>('all');

    const allStudentAssignments = useMemo(() => {
        const list: (AssignmentItem & { topic?: string })[] = [];
        groups.forEach(g => {
            g.objectives.forEach(obj => {
                obj.assignments.forEach(asgn => {
                    list.push({
                        ...asgn,
                        subject_name: g.subject_name,
                        subject_id: g.subject_id,
                        topic: obj.objective_description,
                    });
                });
            });
        });
        return list;
    }, [groups]);

    const filteredAssignments = useMemo(() => {
        return allStudentAssignments.filter(asgn => {
            const matchSearch = asgn.title.toLowerCase().includes(search.toLowerCase()) ||
                asgn.subject_name.toLowerCase().includes(search.toLowerCase());
            const matchSubject = selectedSubjectId === 'all' || asgn.subject_id === selectedSubjectId;

            let matchStatus = true;
            if (studentStatusFilter === 'pending') {
                matchStatus = !asgn.student_submission;
            } else if (studentStatusFilter === 'submitted') {
                matchStatus = Boolean(asgn.student_submission && !asgn.student_submission.is_graded);
            } else if (studentStatusFilter === 'graded') {
                matchStatus = Boolean(asgn.student_submission && asgn.student_submission.is_graded);
            }

            return matchSearch && matchSubject && matchStatus;
        });
    }, [allStudentAssignments, search, selectedSubjectId, studentStatusFilter]);

    return (
        <div className="space-y-4 w-full min-w-0">
            {/* Subject Filter Pills */}
            {groups.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        type="button"
                        onClick={() => setSelectedSubjectId('all')}
                        className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition active:scale-95 min-h-[44px] ${
                            selectedSubjectId === 'all'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Semua Mapel ({allStudentAssignments.length})
                    </button>
                    {groups.map(g => {
                        const count = allStudentAssignments.filter(a => a.subject_id === g.subject_id).length;
                        return (
                            <button
                                key={g.subject_id}
                                type="button"
                                onClick={() => setSelectedSubjectId(g.subject_id)}
                                className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition active:scale-95 min-h-[44px] ${
                                    selectedSubjectId === g.subject_id
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {g.subject_name} ({count})
                            </button>
                        );
                    })}
                </div>
            )}

            {filteredAssignments.length === 0 ? (
                <div className="rounded-2xl border border-border/80 bg-card p-8 text-center space-y-3">
                    <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                        <ClipboardList className="h-6 w-6 opacity-60" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Tidak ada asesmen ditemukan</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {search ? 'Coba gunakan kata kunci pencarian lain.' : 'Tidak ada tugas yang sesuai dengan filter.'}
                        </p>
                    </div>
                    {search && (
                        <button
                            type="button"
                            onClick={onClearSearch}
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline pt-1"
                        >
                            <X className="h-3.5 w-3.5" />
                            <span>Hapus Pencarian</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
                    {filteredAssignments.map((asgn) => (
                        <AssessmentCard
                            key={asgn.id}
                            assignment={asgn}
                            isTeacher={false}
                            viewMode="card"
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Teacher Grouped View (Mobile-Native: Collapsed by Default) ───────────────────
function TeacherGroupedView({
    groups,
    search,
    filterType,
    onClearSearch,
}: {
    groups: TeacherClassGroup[];
    search: string;
    filterType: string;
    onClearSearch: () => void;
}) {
    const [expandedClasses, setExpandedClasses] = useState<Record<number, boolean>>({});

    // Reset accordion overrides when switching filter tabs
    useEffect(() => {
        setExpandedClasses({});
    }, [filterType]);

    // Check if class is expanded: strictly false (collapsed) unless actively searching or explicitly toggled
    const getClassExpanded = (classId: number) => {
        if (expandedClasses[classId] !== undefined) {
            return expandedClasses[classId];
        }
        return Boolean(search.trim());
    };

    const toggleClass = (id: number) => {
        setExpandedClasses(prev => {
            const current = prev[id] !== undefined ? prev[id] : Boolean(search.trim());
            return { ...prev, [id]: !current };
        });
    };

    const visible = useMemo(() => {
        return groups
            .map(cls => ({
                ...cls,
                subjects: (cls.subjects || [])
                    .map(sub => ({
                        ...sub,
                        objectives: (sub.objectives || [])
                            .map(obj => ({
                                ...obj,
                                assignments: sortAssignments(obj.assignments.filter(a => {
                                    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
                                        a.subject_name.toLowerCase().includes(search.toLowerCase());
                                    const matchType = filterType === 'all' || a.assessment_type === filterType;
                                    return matchSearch && matchType;
                                })),
                            }))
                            .filter(obj => obj.assignments.length > 0),
                    }))
                    .filter(sub => sub.objectives.length > 0),
            }))
            .filter(cls => cls.subjects.length > 0)
            .sort((a, b) => (a.class_name || '').localeCompare(b.class_name || '', undefined, { numeric: true, sensitivity: 'base' }));
    }, [groups, search, filterType]);

    // Check if all are currently expanded
    const areAllExpanded = useMemo(() => {
        if (visible.length === 0) return false;
        return visible.every(cls => getClassExpanded(cls.class_id));
    }, [visible, expandedClasses, search]);

    const handleToggleAll = () => {
        if (areAllExpanded) {
            const allClosed: Record<number, boolean> = {};
            visible.forEach(cls => {
                allClosed[cls.class_id] = false;
            });
            setExpandedClasses(allClosed);
        } else {
            const allOpen: Record<number, boolean> = {};
            visible.forEach(cls => {
                allOpen[cls.class_id] = true;
            });
            setExpandedClasses(allOpen);
        }
    };

    if (visible.length === 0) {
        return (
            <div className="rounded-2xl border border-border/80 bg-card p-8 text-center space-y-3">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <ClipboardList className="h-6 w-6 opacity-60" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-foreground">Tidak ada asesmen ditemukan</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {search ? 'Tidak ada asesmen yang cocok dengan kata kunci pencarian Anda.' : 'Belum ada asesmen yang sesuai dengan kategori filter ini.'}
                    </p>
                </div>
                {search ? (
                    <button
                        type="button"
                        onClick={onClearSearch}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline pt-1"
                    >
                        <X className="h-3.5 w-3.5" />
                        <span>Hapus Pencarian</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => router.visit(route('assignments.create'))}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition min-h-[44px]"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Buat Asesmen Baru</span>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3 w-full min-w-0">
            {/* Section Header: e.g. "1 Kelas" and "Buka Semua / Tutup Semua" (44px touch area) */}
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5 px-0.5 w-full min-w-0">
                <span className="text-xs font-bold text-foreground">
                    {visible.length} Kelas
                </span>
                <button
                    type="button"
                    onClick={handleToggleAll}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer min-h-[44px] flex items-center px-1"
                >
                    {areAllExpanded ? 'Tutup Semua' : 'Buka Semua'}
                </button>
            </div>

            {/* Class Cards (Default: Collapsed, 72-80px height, 16px radius, 16px padding) */}
            <div className="flex flex-col gap-3 w-full min-w-0">
                {visible.map((cls) => {
                    const isClassExpanded = getClassExpanded(cls.class_id);
                    const totalAsgnInClass = cls.subjects.reduce((acc, sub) => acc + sub.objectives.reduce((oAcc, obj) => oAcc + obj.assignments.length, 0), 0);
                    
                    let classPendingGrading = 0;
                    let classGradedCount = 0;
                    let classSubmissionsCount = 0;
                    const studentCount = cls.students_count || 0;

                    const flatAssignments: (AssignmentItem & { topicCode?: string })[] = [];

                    cls.subjects.forEach(sub => {
                        sub.objectives.forEach(obj => {
                            obj.assignments.forEach(a => {
                                flatAssignments.push({
                                    ...a,
                                    topic: obj.objective_description !== 'Tanpa TP' ? obj.objective_description : undefined,
                                    topicCode: obj.objective_code,
                                });
                                if (a.pending_grading_count && a.pending_grading_count > 0) {
                                    classPendingGrading += a.pending_grading_count;
                                }
                                if (a.graded_count) {
                                    classGradedCount += a.graded_count;
                                }
                                if (a.submissions_count) {
                                    classSubmissionsCount += a.submissions_count;
                                }
                            });
                        });
                    });

                    return (
                        <div
                            key={cls.class_id}
                            className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs hover:border-primary/40 transition-all w-full min-w-0 box-border"
                        >
                            {/* Class Header Card (Tap to Expand/Collapse) */}
                            <div
                                onClick={() => toggleClass(cls.class_id)}
                                className="flex items-center justify-between p-4 bg-card cursor-pointer hover:bg-muted/20 active:bg-muted/40 transition-colors gap-3 min-h-[72px] sm:min-h-[78px] w-full min-w-0 box-border"
                                role="button"
                                aria-expanded={isClassExpanded}
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggleClass(cls.class_id);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm sm:text-base font-bold text-foreground truncate leading-tight">
                                            {cls.class_name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                            {studentCount > 0 ? `${studentCount} siswa` : ''}
                                            {studentCount > 0 ? ' • ' : ''}
                                            {totalAsgnInClass} asesmen
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {classPendingGrading > 0 ? (
                                        <span className="hidden xs:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[11px] border border-amber-500/30">
                                            <span>🟠</span>
                                            <span>{classPendingGrading} Perlu Nilai</span>
                                        </span>
                                    ) : null}

                                    <div className={`h-8 w-8 rounded-lg bg-muted/60 text-muted-foreground flex items-center justify-center transition-transform duration-200 ${isClassExpanded ? 'rotate-180' : ''}`}>
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>

                            {/* Class Content: Compact Assessment Cards */}
                            {isClassExpanded && (
                                <div className="border-t border-border/70 divide-y divide-border/40 bg-card">
                                    {flatAssignments.map(asgn => (
                                        <AssessmentCard
                                            key={asgn.id}
                                            assignment={asgn}
                                            isTeacher={true}
                                            classId={cls.class_id}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Flat View (Admin / Parent Fallback) ──────────────────────────────────
function FlatView({ assignments, search, filterType, onClearSearch }: {
    assignments: AssignmentItem[];
    search: string;
    filterType: string;
    onClearSearch: () => void;
}) {
    const filtered = useMemo(() => {
        return sortAssignments(assignments.filter(a => {
            const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
            const matchType = filterType === 'all' || a.assessment_type === filterType;
            return matchSearch && matchType;
        }));
    }, [assignments, search, filterType]);

    if (filtered.length === 0) {
        return (
            <div className="rounded-2xl border border-border/80 bg-card p-8 text-center space-y-3">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <ClipboardList className="h-6 w-6 opacity-60" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-foreground">Tidak ada asesmen ditemukan</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Daftar asesmen belum tersedia atau tidak cocok dengan pencarian.</p>
                </div>
                {search && (
                    <button
                        type="button"
                        onClick={onClearSearch}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline pt-1"
                    >
                        <X className="h-3.5 w-3.5" />
                        <span>Hapus Pencarian</span>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-xs divide-y divide-border/30 w-full min-w-0">
            {filtered.map(asgn => (
                <AssessmentCard key={asgn.id} assignment={asgn} viewMode="row" />
            ))}
        </div>
    );
}

// ── Main Page Export ─────────────────────────────────────────────
export default function Assignments({
    assignments,
    grouped_assignments,
    teacher_grouped,
    active_year,
    active_semester,
    user_role,
    counts_by_type,
    stats,
}: AssignmentsProps) {
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
    const { flash } = usePage<{ flash: { success?: string; error?: string } }>().props;
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const isTeacher = user_role === 'teacher' || user_role === 'admin';

    useEffect(() => {
        if (flash?.success) {
            setToast({ message: flash.success, type: 'success' });
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
        if (flash?.error) {
            setToast({ message: flash.error, type: 'error' });
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Asesmen & Penilaian – LMS Mokopani" />

            {/* Canvas Container: Standardized to match Kelas Saya */}
            <div className="space-y-4 sm:space-y-5 fade-in pb-24 sm:pb-8 max-w-7xl mx-auto w-full min-w-0">
                
                {/* 1. Page Header (Title: 24px, Subtitle: 13-14px) */}
                <div className="w-full min-w-0 space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
                        {user_role === 'student' ? 'Asesmen & Tugas' : 'Asesmen'}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                        {user_role === 'student'
                            ? 'Pantau dan kerjakan tugas serta asesmen belajarmu tepat waktu.'
                            : 'Kelola dan pantau penilaian siswa'}
                    </p>
                </div>

                {/* 2. Add Assessment Primary CTA (Mobile: 100% width, 48px height, 16px radius) */}
                {isTeacher && (
                    <div className="w-full min-w-0">
                        <button
                            type="button"
                            onClick={() => router.visit(route('assignments.create'))}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-xs hover:bg-primary/90 transition active:scale-[0.98] min-h-[48px] box-border"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Tambah Asesmen</span>
                        </button>
                    </div>
                )}

                {/* 3. Compact Active Assessment Summary Badge (Height: 40-44px) */}
                {isTeacher && stats && (stats.total_pending_grading > 0 || stats.total_active > 0) && (
                    <div className="flex flex-wrap items-center gap-2 w-full min-w-0">
                        {stats.total_active > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold min-h-[38px]">
                                <span>●</span>
                                <span>{stats.total_active} asesmen aktif</span>
                            </span>
                        )}
                        {stats.total_pending_grading > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold min-h-[38px]">
                                <span>🟠</span>
                                <span>{stats.total_pending_grading} perlu dinilai</span>
                            </span>
                        )}
                        {stats.total_overdue && stats.total_overdue > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-xs font-bold min-h-[38px]">
                                <span>🔴</span>
                                <span>{stats.total_overdue} terlambat</span>
                            </span>
                        ) : null}
                    </div>
                )}

                {/* 4. Filter Tabs & Search Bar */}
                <div className="w-full min-w-0">
                    <AssessmentFilter
                        search={search}
                        onSearchChange={setSearch}
                        userRole={user_role}
                        filterType={filterType}
                        onFilterTypeChange={setFilterType}
                        studentStatusFilter={studentStatusFilter}
                        onStudentStatusFilterChange={setStudentStatusFilter}
                        countsByType={counts_by_type}
                    />
                </div>

                {/* 5. Role-based Assessment List (Default: Collapsed Class Cards) */}
                <div className="w-full min-w-0">
                    {user_role === 'teacher' ? (
                        <TeacherGroupedView
                            groups={teacher_grouped ?? []}
                            search={search}
                            filterType={filterType}
                            onClearSearch={() => setSearch('')}
                        />
                    ) : user_role === 'student' ? (
                        <StudentAssignmentsView
                            groups={grouped_assignments ?? []}
                            search={search}
                            studentStatusFilter={studentStatusFilter}
                            onClearSearch={() => setSearch('')}
                        />
                    ) : (
                        <FlatView
                            assignments={assignments ?? []}
                            search={search}
                            filterType={filterType}
                            onClearSearch={() => setSearch('')}
                        />
                    )}
                </div>
            </div>

            {/* Floating Toast Notification */}
            {toast && (
                <div className={`fixed bottom-20 right-4 sm:right-6 z-50 flex max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
                    toast.type === 'success'
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-destructive/20 bg-destructive/10 text-destructive'
                }`}>
                    <span className="text-xs font-bold leading-snug">{toast.message}</span>
                </div>
            )}
        </AppLayout>
    );
}
