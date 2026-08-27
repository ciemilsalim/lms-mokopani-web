import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ClipboardList, Plus, Users, BookOpen, ChevronDown, ChevronRight
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { MobileFab } from '@/components/mobile-fab';
import { SectionHeader } from '@/components/dashboard';
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
    subjects: TeacherSubjectGroup[];
}

interface AssignmentsProps {
    assignments?: AssignmentItem[];
    grouped_assignments?: SubjectGroup[];
    teacher_grouped?: TeacherClassGroup[];
    active_year?: string;
    active_semester?: string;
    user_role: 'teacher' | 'student' | 'admin' | 'parent';
}

const sortAssignments = (assignments: AssignmentItem[]) => {
    const order: Record<string, number> = { 'initial': 1, 'formative': 2, 'summative': 3 };
    return assignments.sort((a, b) => (order[a.assessment_type || ''] || 99) - (order[b.assessment_type || ''] || 99));
};

// ── Student View ─────────────────────────────────────────────
function StudentAssignmentsView({ groups, search, studentStatusFilter }: {
    groups: SubjectGroup[];
    search: string;
    studentStatusFilter: 'all' | 'pending' | 'submitted' | 'graded';
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
        <div className="space-y-5">
            {/* Subject Filter Pills */}
            {groups.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        type="button"
                        onClick={() => setSelectedSubjectId('all')}
                        className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-bold transition active:scale-95 min-h-[40px] ${
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
                                className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-bold transition active:scale-95 min-h-[40px] ${
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
                <EmptyState
                    icon={ClipboardList}
                    title="Tidak Ada Asesmen"
                    description="Tidak ada tugas atau asesmen yang sesuai dengan filter atau kata kunci Anda."
                />
            ) : (
                <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

// ── Teacher Accordion View ───────────────────────────────────────────
function TeacherGroupedView({
    groups,
    search,
    filterType,
    stats,
}: {
    groups: TeacherClassGroup[];
    search: string;
    filterType: string;
    stats?: { total_pending_grading: number; total_active: number };
}) {
    const [expandedClasses, setExpandedClasses] = useState<Record<number, boolean>>({});
    const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
    const [expandedObjectives, setExpandedObjectives] = useState<Record<string, boolean>>({});

    const toggleClass = (id: number) => setExpandedClasses(prev => ({ ...prev, [id]: !prev[id] }));
    const toggleSubject = (clsId: number, subId: number) => {
        const key = `${clsId}-${subId}`;
        setExpandedSubjects(prev => ({ ...prev, [key]: !prev[key] }));
    };
    const toggleObjective = (clsId: number, subId: number, objId: number) => {
        const key = `${clsId}-${subId}-${objId}`;
        setExpandedObjectives(prev => ({ ...prev, [key]: !prev[key] }));
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

    const handleExpandAll = () => {
        const allCls: Record<number, boolean> = {};
        const allSubs: Record<string, boolean> = {};
        const allObjs: Record<string, boolean> = {};
        visible.forEach(cls => {
            allCls[cls.class_id] = true;
            cls.subjects.forEach(sub => {
                allSubs[`${cls.class_id}-${sub.subject_id}`] = true;
                sub.objectives.forEach(obj => {
                    allObjs[`${cls.class_id}-${sub.subject_id}-${obj.objective_id}`] = true;
                });
            });
        });
        setExpandedClasses(allCls);
        setExpandedSubjects(allSubs);
        setExpandedObjectives(allObjs);
    };

    const handleCollapseAll = () => {
        setExpandedClasses({});
        setExpandedSubjects({});
        setExpandedObjectives({});
    };

    if (visible.length === 0) {
        return (
            <EmptyState
                icon={ClipboardList}
                title="Belum Ada Asesmen"
                description={
                    search || filterType !== 'all'
                        ? 'Tidak ada asesmen yang sesuai dengan filter atau pencarian Anda.'
                        : 'Asesmen pembelajaran yang Anda buat akan muncul di sini.'
                }
                actionLabel="+ Buat Asesmen Baru"
                onAction={() => router.visit(route('assignments.create'))}
            />
        );
    }

    return (
        <div className="space-y-3.5">
            {/* Toolbar: Counter & Clean Expand/Collapse Toggle */}
            <div className="flex items-center justify-between gap-2 pt-1 border-b border-border/50 pb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Menampilkan {visible.length} Kelas
                </span>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleExpandAll}
                        className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                    >
                        Buka Semua
                    </button>
                    <span className="text-border text-xs">•</span>
                    <button
                        type="button"
                        onClick={handleCollapseAll}
                        className="text-[11px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        Tutup Semua
                    </button>
                </div>
            </div>

            {/* Class Cards with Status */}
            <div className="flex flex-col gap-2.5">
                {visible.map((cls) => {
                    const isClassExpanded = Boolean(search) || filterType !== 'all' || Boolean(expandedClasses[cls.class_id]);
                    const totalAsgnInClass = cls.subjects.reduce((acc, sub) => acc + sub.objectives.reduce((oAcc, obj) => oAcc + obj.assignments.length, 0), 0);
                    
                    // Count pending grading across all assignments in this class
                    let classPendingGrading = 0;
                    cls.subjects.forEach(sub => {
                        sub.objectives.forEach(obj => {
                            obj.assignments.forEach(a => {
                                if (a.pending_grading_count && a.pending_grading_count > 0) {
                                    classPendingGrading += a.pending_grading_count;
                                }
                            });
                        });
                    });

                    return (
                        <div key={cls.class_id} className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-2xs hover:border-primary/40 transition-all">
                            {/* Class Header */}
                            <div
                                onClick={() => toggleClass(cls.class_id)}
                                className="flex items-center justify-between px-3.5 sm:px-4 py-3 bg-card cursor-pointer hover:bg-muted/30 transition-colors gap-2"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                        <Users className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-xs sm:text-sm font-black text-foreground truncate block">
                                            {cls.class_name}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                                            <span>{totalAsgnInClass} Asesmen</span>
                                            {classPendingGrading > 0 ? (
                                                <>
                                                    <span>•</span>
                                                    <span className="font-bold text-amber-700 dark:text-amber-300">
                                                        🟠 {classPendingGrading} perlu dinilai
                                                    </span>
                                                </>
                                            ) : totalAsgnInClass > 0 ? (
                                                <>
                                                    <span>•</span>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                        🟢 Selesai dinilai
                                                    </span>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className={`p-1.5 rounded-lg bg-muted/60 text-muted-foreground transition-transform duration-200 ${isClassExpanded ? 'rotate-180' : ''}`}>
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </div>
                                </div>
                            </div>

                            {/* Class Subjects & Objectives */}
                            {isClassExpanded && (
                                <div className="border-t border-border/70 divide-y divide-border/40">
                                    {cls.subjects.map((sub) => {
                                        const subKey = `${cls.class_id}-${sub.subject_id}`;
                                        const isSubExpanded = Boolean(search) || filterType !== 'all' || expandedSubjects[subKey] !== false;
                                        const totalSubAsgn = sub.objectives.reduce((acc, obj) => acc + obj.assignments.length, 0);

                                        return (
                                            <div key={sub.subject_id} className="bg-background/40">
                                                {/* Subject Header */}
                                                <div
                                                    onClick={() => toggleSubject(cls.class_id, sub.subject_id)}
                                                    className="px-3.5 sm:px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                                                        <span className="text-xs font-bold text-foreground">{sub.subject_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-muted-foreground">{totalSubAsgn} Asesmen</span>
                                                        {isSubExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                                    </div>
                                                </div>

                                                {/* Objectives */}
                                                {isSubExpanded && (
                                                    <div className="divide-y divide-border/30 bg-card border-t border-border/30">
                                                        {sub.objectives.map((obj) => {
                                                            const objKey = `${cls.class_id}-${sub.subject_id}-${obj.objective_id}`;
                                                            const isObjExpanded = Boolean(search) || filterType !== 'all' || expandedObjectives[objKey] !== false;
                                                            return (
                                                                <div key={obj.objective_id} className="divide-y divide-border/20">
                                                                    <div
                                                                        onClick={() => toggleObjective(cls.class_id, sub.subject_id, obj.objective_id || 0)}
                                                                        className="px-3.5 sm:px-4 py-1.5 bg-muted/10 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                            <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                                                                [{obj.objective_code}]
                                                                            </span>
                                                                            <span className="text-[11px] font-medium text-muted-foreground truncate">{obj.objective_description}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                            {isObjExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                                                        </div>
                                                                    </div>
                                                                    {isObjExpanded && (
                                                                        <div className="flex flex-col divide-y divide-border/30 bg-card">
                                                                            {obj.assignments.map(asgn => (
                                                                                <AssessmentCard key={asgn.id} assignment={asgn} isTeacher={true} viewMode="row" />
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
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
function FlatView({ assignments, search, filterType }: { assignments: AssignmentItem[]; search: string; filterType: string }) {
    const filtered = useMemo(() => {
        return sortAssignments(assignments.filter(a => {
            const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
            const matchType = filterType === 'all' || a.assessment_type === filterType;
            return matchSearch && matchType;
        }));
    }, [assignments, search, filterType]);

    if (filtered.length === 0) {
        return (
            <EmptyState
                icon={ClipboardList}
                title="Belum Ada Asesmen"
                description="Daftar asesmen belum tersedia."
            />
        );
    }

    return (
        <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-xs divide-y divide-border/30">
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
    stats,
}: AssignmentsProps & { stats?: { total_pending_grading: number; total_active: number } }) {
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

            <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto w-full min-w-0 pb-20 md:pb-8 fade-in">
                {/* Header Section */}
                <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                            {user_role === 'student' ? 'Asesmen & Tugas' : 'Asesmen'}
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
                            {user_role === 'student'
                                ? 'Pantau dan kerjakan tugas serta asesmen belajarmu tepat waktu.'
                                : `Kelola dan pantau penilaian siswa • Periode ${active_year || '2026/2027'} (${active_semester || 'Ganjil'})`}
                        </p>
                    </div>

                    {isTeacher && (
                        <button
                            type="button"
                            onClick={() => router.visit(route('assignments.create'))}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-extrabold shadow-sm hover:bg-primary/90 transition active:scale-97 min-h-[40px] sm:min-h-[44px] shrink-0"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Tambah Asesmen</span>
                        </button>
                    )}
                </div>

                {/* Teacher Action-First Summary Chips */}
                {isTeacher && stats && (stats.total_pending_grading > 0 || stats.total_active > 0) && (
                    <div className="flex flex-wrap items-center gap-2">
                        {stats.total_pending_grading > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold">
                                <span>🟠</span>
                                <span>{stats.total_pending_grading} hasil perlu dinilai</span>
                            </span>
                        )}
                        {stats.total_active > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                                <span>📝</span>
                                <span>{stats.total_active} asesmen aktif</span>
                            </span>
                        )}
                    </div>
                )}

                {/* Filter & Search Toolbar */}
                <AssessmentFilter
                    search={search}
                    onSearchChange={setSearch}
                    userRole={user_role}
                    filterType={filterType}
                    onFilterTypeChange={setFilterType}
                    studentStatusFilter={studentStatusFilter}
                    onStudentStatusFilterChange={setStudentStatusFilter}
                />

                {/* Role-based Content Views */}
                {user_role === 'teacher' ? (
                    <TeacherGroupedView
                        groups={teacher_grouped ?? []}
                        search={search}
                        filterType={filterType}
                        stats={stats}
                    />
                ) : user_role === 'student' ? (
                    <StudentAssignmentsView
                        groups={grouped_assignments ?? []}
                        search={search}
                        studentStatusFilter={studentStatusFilter}
                    />
                ) : (
                    <FlatView assignments={assignments ?? []} search={search} filterType={filterType} />
                )}
            </div>

            {/* Floating Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex max-w-md items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
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
