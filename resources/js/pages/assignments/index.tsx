import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { BookOpen, ClipboardList, Clock, Plus, Search, Info, Target, GraduationCap, ChevronDown, ChevronRight, Pencil, Trash2, CheckCircle2, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { MobileFab } from '@/components/mobile-fab';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Asesmen', href: '/assignments' },
];

interface Assignment {
    id: number;
    title: string;
    description: string;
    subject_name: string;
    subject_id?: number;
    due_date: string | null;
    max_points: number;
    assessment_type: string | null;
    instrument_type: string | null;
    scoring_tool?: string | null;
    submissions_count: number;
    is_accessible?: boolean;
    student_submission?: { id: number; is_graded: boolean } | null;
}

interface SubjectObjectiveGroup {
    objective_id: number | null;
    objective_code: string;
    objective_description: string;
    assignments: Assignment[];
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
    assignments: Assignment[];
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
    assignments?: Assignment[];
    grouped_assignments?: SubjectGroup[];
    teacher_grouped?: TeacherClassGroup[];
    active_year?: string;
    active_semester?: string;
    user_role: 'teacher' | 'student' | 'admin';
}

const isOverdue = (due: string | null): boolean => {
    if (!due) return false;
    return new Date(due) < new Date();
};

const instrumentLabels: Record<string, string> = {
    quiz_survey: 'Kuis/Survei', observation_checklist: 'Observasi', anecdotal_notes: 'Anekdotal',
    reflective_journal: 'Jurnal Reflektif', self_assessment: 'Penilaian Diri', peer_assessment: 'Peer Assessment',
    rubric: 'Rubrik', exit_ticket: 'Exit Ticket', concept_map: 'Peta Konsep',     performance_observation: 'Observasi',
    written_test: 'Tes Tertulis', oral_test: 'Tes Lisan', performance: 'Kinerja',
    project: 'Proyek', portfolio: 'Portofolio', assignment: 'Penugasan',
    formative_quiz: 'Tes/Penugasan Singkat', guided_discussion: 'Diskusi Terpandu', structured_assignment: 'Penugasan Terstruktur',
};

const scoringToolLabels: Record<string, string> = {
    rubric: 'Rubrik',
    rating_scale: 'Skala Penilaian',
    checklist: 'Checklist',
    anecdotal_notes: 'Catatan Anekdotal',
};

const typeStyles: Record<string, { bg: string; text: string; icon: any }> = {
    initial:   { bg: 'bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-hover border border-primary/20', text: 'text-primary dark:text-primary-hover', icon: Info },
    formative: { bg: 'bg-warning/10 text-warning dark:bg-warning/15 border border-warning/20',   text: 'text-warning',   icon: Target },
    summative: { bg: 'bg-success/10 text-success dark:bg-success/15 border border-success/20',       text: 'text-success',       icon: GraduationCap },
};

function AssignmentCard({ asgn, isTeacher = false }: { asgn: Assignment; isTeacher?: boolean }) {
    const overdue = isOverdue(asgn.due_date);
    const isAccessible = true; // Selalu izinkan siswa mengklik dan melihat detail asesmen
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.get(route('assignments.edit', asgn.id));
    };

    const handleDelete = () => {
        router.delete(route('assignments.destroy', asgn.id));
    };

    return (
        <div
            onClick={() => router.visit(route('assignments.show', asgn.id))}
            className="group flex items-center justify-between py-3 sm:py-2 px-3.5 sm:px-4 hover:bg-popover border-l-2 border-transparent hover:border-primary transition-colors cursor-pointer active:bg-muted/40"
        >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    asgn.assessment_type === 'initial' ? 'bg-emerald-500' : 
                    asgn.assessment_type === 'formative' ? 'bg-warning' : 'bg-primary'
                }`} title={asgn.assessment_type || 'Tugas'} />
                
                <h3 className="text-xs sm:text-[13px] font-bold sm:font-medium text-foreground truncate max-w-sm group-hover:text-primary transition-colors">
                    {asgn.title}
                </h3>
                
                <span className="hidden sm:inline-flex items-center rounded-md bg-muted/60 border border-border/60 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                    {instrumentLabels[asgn.instrument_type || ''] || asgn.instrument_type}
                </span>

                {asgn.due_date && overdue && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive shrink-0">
                        <Clock className="h-3 w-3" /> Terlambat
                    </span>
                )}
                {!isTeacher && asgn.student_submission?.is_graded && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Dinilai
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0 pl-2 sm:pl-4">
                {isTeacher ? (
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center justify-end min-w-[50px] sm:min-w-[70px]">
                            {asgn.submissions_count > 0 ? (
                                <span className="text-[10px] sm:text-[11px] text-primary font-black bg-primary/10 px-2 py-0.5 rounded-md">{asgn.submissions_count} kumpul</span>
                            ) : (
                                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">0 kumpul</span>
                            )}
                        </div>
                        <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                            <button
                                onClick={handleEdit}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition cursor-pointer"
                                title="Edit asesmen"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm(true);
                                }}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer"
                                title="Hapus asesmen"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-[11px]">
                        {asgn.student_submission ? (
                            <span className="text-emerald-500 font-medium">Dikumpulkan</span>
                        ) : (
                            <span className="text-muted-foreground">Belum</span>
                        )}
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                title="Hapus Asesmen"
                message="Peringatan! Menghapus data ini akan ikut MENGHAPUS SEMUA data terkait (misal: pengumpulan siswa, nilai, remedial, dll) secara permanen."
                onConfirm={handleDelete}
                requireInput="DELETE"
                inputPlaceholder="Ketik DELETE untuk konfirmasi"
            />
        </div>
    );
}

const sortAssignments = (assignments: Assignment[]) => {
    const order: Record<string, number> = { 'initial': 1, 'formative': 2, 'summative': 3 };
    return assignments.sort((a, b) => (order[a.assessment_type || ''] || 99) - (order[b.assessment_type || ''] || 99));
};

function StudentAssignmentsView({ groups, search, studentStatusFilter, setStudentStatusFilter }: {
    groups: SubjectGroup[];
    search: string;
    studentStatusFilter: 'all' | 'pending' | 'submitted' | 'graded';
    setStudentStatusFilter: (status: 'all' | 'pending' | 'submitted' | 'graded') => void;
}) {
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | 'all'>('all');

    // Flatten all assignments from all objectives with subject info
    const allStudentAssignments = useMemo(() => {
        const list: (Assignment & { subject_name: string; subject_id: number; topic?: string })[] = [];
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
            const matchSearch = asgn.title.toLowerCase().includes(search.toLowerCase()) || asgn.subject_name.toLowerCase().includes(search.toLowerCase());
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
        <div className="space-y-6">
            {/* Quick Subject Filter Pills */}
            {groups.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    <button
                        type="button"
                        onClick={() => setSelectedSubjectId('all')}
                        className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-bold transition active:scale-95 ${
                            selectedSubjectId === 'all'
                                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        Semua Mata Pelajaran ({allStudentAssignments.length})
                    </button>
                    {groups.map(g => {
                        const count = allStudentAssignments.filter(a => a.subject_id === g.subject_id).length;
                        return (
                            <button
                                key={g.subject_id}
                                type="button"
                                onClick={() => setSelectedSubjectId(g.subject_id)}
                                className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-bold transition active:scale-95 ${
                                    selectedSubjectId === g.subject_id
                                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                {g.subject_name} ({count})
                            </button>
                        );
                    })}
                </div>
            )}

            {filteredAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card rounded-3xl border border-border">
                    <ClipboardList className="h-14 w-14 mb-4 opacity-25" />
                    <p className="text-sm font-bold text-foreground">Tidak ada tugas dalam kategori ini</p>
                    <p className="text-xs text-muted-foreground mt-1">Coba ganti filter status atau mata pelajaran.</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredAssignments.map((asgn) => {
                        const overdue = isOverdue(asgn.due_date);
                        const isSubmitted = Boolean(asgn.student_submission);
                        const isGraded = Boolean(asgn.student_submission?.is_graded);

                        let statusBadge = (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                <Clock className="h-3 w-3" /> Perlu Dikerjakan
                            </span>
                        );
                        if (isGraded) {
                            statusBadge = (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                    <CheckCircle2 className="h-3 w-3" /> Selesai Dinilai
                                </span>
                            );
                        } else if (isSubmitted) {
                            statusBadge = (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                                    <Clock className="h-3 w-3" /> Menunggu Penilaian
                                </span>
                            );
                        }

                        return (
                            <div
                                key={asgn.id}
                                onClick={() => router.visit(route('assignments.show', asgn.id))}
                                className="group relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 active:scale-98 cursor-pointer"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary truncate max-w-[150px]">
                                            {asgn.subject_name}
                                        </span>
                                        {statusBadge}
                                    </div>

                                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                                        {asgn.title}
                                    </h3>

                                    {asgn.topic && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                            {asgn.topic}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-5 pt-3.5 border-t border-border/50 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Tenggat Waktu</p>
                                        <p className={`text-xs font-semibold truncate ${overdue && !isSubmitted ? 'text-destructive font-bold' : 'text-foreground'}`}>
                                            {asgn.due_date ? asgn.due_date : 'Tidak ada batas'}
                                        </p>
                                    </div>

                                    <div className="shrink-0">
                                        {!isSubmitted ? (
                                            <span className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-xs group-hover:bg-primary/90">
                                                Kerjakan <ChevronRight className="h-3.5 w-3.5" />
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-xl bg-muted px-3 py-1.5 text-xs font-bold text-foreground group-hover:bg-muted/80">
                                                Lihat <ChevronRight className="h-3.5 w-3.5" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function TeacherGroupedView({ groups, search, filterType }: { groups: TeacherClassGroup[]; search: string; filterType: string }) {
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

    const visible = groups
        .map(cls => ({
            ...cls,
            subjects: (cls.subjects || [])
                .map(sub => ({
                    ...sub,
                    objectives: (sub.objectives || [])
                        .map(obj => ({
                            ...obj,
                            assignments: sortAssignments(obj.assignments.filter(a => {
                                const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.subject_name.toLowerCase().includes(search.toLowerCase());
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
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <ClipboardList className="h-14 w-14 mb-4 opacity-25" />
                <p className="text-sm font-medium">Belum ada asesmen</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header Toolbar: Expand / Collapse All */}
            <div className="flex items-center justify-between gap-3 bg-card p-3 sm:px-4 rounded-xl border border-border/70 shadow-xs">
                <span className="text-xs font-bold text-muted-foreground">
                    Menampilkan <strong className="text-foreground">{visible.length} Kelas</strong> dengan asesmen aktif
                </span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExpandAll}
                        className="px-3 py-1.5 rounded-lg bg-background border border-border text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition cursor-pointer"
                    >
                        Buka Semua
                    </button>
                    <button
                        type="button"
                        onClick={handleCollapseAll}
                        className="px-3 py-1.5 rounded-lg bg-background border border-border text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition cursor-pointer"
                    >
                        Tutup Semua
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                {visible.map((cls) => {
                    // Default is collapsed (hidden), except when searching or filtering
                    const isClassExpanded = Boolean(search) || filterType !== 'all' || Boolean(expandedClasses[cls.class_id]);
                    const totalAsgnInClass = cls.subjects.reduce((acc, sub) => acc + sub.objectives.reduce((oAcc, obj) => oAcc + obj.assignments.length, 0), 0);

                    return (
                        <div key={cls.class_id} className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs hover:border-primary/30 transition-all">
                            {/* Class Header Button */}
                            <div 
                                onClick={() => toggleClass(cls.class_id)}
                                className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-card cursor-pointer hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                        <Users className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-xs sm:text-sm font-black text-foreground truncate block">{cls.class_name}</span>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">{cls.subjects.length} Mata Pelajaran Diajarkan</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0">
                                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                                        {totalAsgnInClass} Asesmen
                                    </span>
                                    <div className={`p-1.5 rounded-lg bg-muted/50 text-muted-foreground transition-transform duration-200 ${isClassExpanded ? 'rotate-180' : ''}`}>
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>

                            {/* Class Contents (Subjects -> Objectives -> Assignments) */}
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
                                                    className="px-4 sm:px-5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                                                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">{sub.subject_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-muted-foreground">{totalSubAsgn} Asesmen</span>
                                                        {isSubExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                                    </div>
                                                </div>

                                                {/* Objectives Accordion */}
                                                {isSubExpanded && (
                                                    <div className="divide-y divide-border/30 bg-card border-t border-border/30">
                                                        {sub.objectives.map((obj) => {
                                                            const objKey = `${cls.class_id}-${sub.subject_id}-${obj.objective_id}`;
                                                            const isObjExpanded = Boolean(search) || filterType !== 'all' || expandedObjectives[objKey] !== false;
                                                            return (
                                                                <div key={obj.objective_id} className="divide-y divide-border/20">
                                                                    <div 
                                                                        onClick={() => toggleObjective(cls.class_id, sub.subject_id, obj.objective_id || 0)}
                                                                        className="px-4 sm:px-6 py-2 bg-muted/10 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">[{obj.objective_code}]</span>
                                                                            <span className="text-[11px] font-medium text-muted-foreground truncate">{obj.objective_description}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                                            {isObjExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                                                        </div>
                                                                    </div>
                                                                    {isObjExpanded && (
                                                                        <div className="flex flex-col divide-y divide-border/30 bg-card">
                                                                            {obj.assignments.map(asgn => (
                                                                                <AssignmentCard key={asgn.id} asgn={asgn} isTeacher={true} />
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

function FlatView({ assignments, search, filterType }: { assignments: Assignment[]; search: string; filterType: string }) {
    const filtered = sortAssignments(assignments.filter(a => {
        const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'all' || a.assessment_type === filterType;
        return matchSearch && matchType;
    }));

    if (filtered.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <ClipboardList className="h-14 w-14 mb-4 opacity-25" />
                <p className="text-sm font-medium">Belum ada asesmen</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-none divide-y divide-border/30">
            {filtered.map(asgn => (
                <AssignmentCard key={asgn.id} asgn={asgn} />
            ))}
        </div>
    );
}

export default function Assignments({ assignments, grouped_assignments, teacher_grouped, active_year, active_semester, user_role }: AssignmentsProps) {
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
    const { flash } = usePage<{ flash: { success?: string; error?: string } }>().props;
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
            <Head title="Asesmen & Tugas – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-4 sm:gap-6 min-w-0 fade-in">
                {/* Header */}
                <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-6 sm:p-8 text-white shadow-xl shadow-primary/20 dark:shadow-none">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md flex-shrink-0">
                                <ClipboardList className="h-8 w-8 sm:h-10 sm:w-10" />
                            </div>
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <h1 className="text-xl sm:text-2xl font-black">
                                        {user_role === 'student' ? 'Asesmen & Tugas Siswa' : 'Bank Asesmen'}
                                    </h1>
                                    {active_year && (
                                        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-widest mt-1 sm:mt-0">
                                            {active_year} • {active_semester}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm font-medium text-white/80 mt-1">
                                    {user_role === 'student'
                                        ? 'Pantau dan kerjakan tugas serta asesmen belajarmu tepat waktu'
                                        : 'Kelola asesmen awal, formatif, dan sumatif pembelajaran'}
                                </p>
                            </div>
                        </div>
                        {user_role === 'teacher' && (
                            <button
                                id="btn-add-assignment"
                                onClick={() => router.visit(route('assignments.create'))}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-lg transition hover:bg-white/90 cursor-pointer"
                            >
                                <Plus className="h-4 w-4" />
                                Tambah Asesmen
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter & Search */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
                    {user_role === 'student' ? (
                        <div className="flex p-1 bg-muted/70 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-hide border border-border/50">
                            {[
                                { id: 'all', label: 'Semua Status' },
                                { id: 'pending', label: 'Perlu Dikerjakan' },
                                { id: 'submitted', label: 'Menunggu Penilaian' },
                                { id: 'graded', label: 'Selesai Dinilai' },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setStudentStatusFilter(f.id as any)}
                                    className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                                        studentStatusFilter === f.id
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex p-1 bg-muted rounded-xl w-full sm:w-fit overflow-x-auto scrollbar-hide">
                            {[
                                { id: 'all', label: 'Semua' },
                                { id: 'initial', label: 'Awal' },
                                { id: 'formative', label: 'Formatif' },
                                { id: 'summative', label: 'Sumatif' },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilterType(f.id)}
                                    className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${filterType === f.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="relative max-w-xs flex-1">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            id="input-search-assignment"
                            type="text"
                            placeholder="Cari tugas / mata pelajaran..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-2xl border border-border bg-background py-2.5 pl-11 pr-4 text-xs sm:text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover transition"
                        />
                    </div>
                </div>

                {/* Content */}
                {user_role === 'teacher' ? (
                    <TeacherGroupedView groups={teacher_grouped ?? []} search={search} filterType={filterType} />
                ) : user_role === 'student' ? (
                    <StudentAssignmentsView
                        groups={grouped_assignments ?? []}
                        search={search}
                        studentStatusFilter={studentStatusFilter}
                        setStudentStatusFilter={setStudentStatusFilter}
                    />
                ) : (
                    <FlatView assignments={assignments ?? []} search={search} filterType={filterType} />
                )}
            </div>

            {user_role === 'teacher' && (
                <MobileFab href={route('assignments.create')} label="Asesmen Baru" />
            )}

            {/* Floating Premium Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[999] flex max-w-md items-center gap-3 rounded-2xl border px-5 py-3 shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
                    toast.type === 'success' 
                    ? 'border-emerald-500/20 bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100' 
                    : 'border-red-500/20 bg-red-50/95 dark:bg-red-950/90 text-red-900 dark:text-red-100'
                }`}>
                    {toast.type === 'success' ? (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#3dd68c] text-white shadow-sm shadow-[#3dd68c]/30">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    ) : (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white shadow-sm shadow-red-500/30">
                            <span className="font-black text-sm">!</span>
                        </div>
                    )}
                    <span className="text-[12px] font-black tracking-tight leading-none uppercase">{toast.message}</span>
                </div>
            )}
        </AppLayout>
    );
}
