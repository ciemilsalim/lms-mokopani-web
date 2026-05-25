import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { BookOpen, CheckCircle2, Brain } from 'lucide-react';
import AdaptiveBanner from '@/components/subjects/AdaptiveBanner';
import LearningPathMap from '@/components/subjects/LearningPathMap';

interface LearningItem {
    id: number;
    title: string;
    type: 'material' | 'assignment';
    file_type?: string | null;
    assessment_type?: string;
    is_submitted?: boolean;
    is_graded?: boolean;
    is_passed?: boolean;
    is_completed?: boolean;
    score?: number | null;
    attempts?: number;
}

interface LearningObjective {
    id: number;
    code: string;
    description: string;
    items: LearningItem[];
    is_completed: boolean;
}

interface Subject {
    id: number;
    name: string;
    description: string | null;
}

interface DiagnosticResult {
    id: number;
    assignment_id: number;
    learning_objective_id: number | null;
    total_score: number;
    is_passed: boolean;
    topic_breakdown: { topic: string; score: number; max_score: number; mastery_pct: number; mastery_level: string }[] | null;
    recommendations: { type: string; message: string; icon?: string; topic?: string }[] | null;
}

interface DiagnosticSummary {
    has_diagnostic: boolean;
    mastered_tp_ids: number[];
    average_score: number | null;
    results: DiagnosticResult[];
}

interface SubjectShowProps {
    subject: Subject;
    learning_path: LearningObjective[];
    diagnostic_summary: DiagnosticSummary | null;
}

export default function SubjectShow({ subject, learning_path, diagnostic_summary }: SubjectShowProps) {
    const { user_role } = usePage().props;
    const isStudent = user_role === 'student';
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Mata Pelajaran', href: '/subjects' },
        { title: subject.name, href: '#' },
    ];

    const masteredTpIds = diagnostic_summary?.mastered_tp_ids ?? [];
    const allAssignments = learning_path.flatMap(tp => tp.items).filter(item => item.type === 'assignment');
    const totalAssignments = allAssignments.length;
    const completedAssignments = allAssignments.filter(item => item.is_submitted).length;

    const progressPercentage = totalAssignments > 0
        ? Math.round((completedAssignments / totalAssignments) * 100)
        : (learning_path.length > 0
            ? Math.round((learning_path.filter(tp => tp.is_completed || masteredTpIds.includes(tp.id)).length / learning_path.length) * 100)
            : 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${subject.name} – Learning Journey`} />

            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Subject Header */}
                <div className="mb-12 text-center">
                    <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary/70 text-white shadow-xl shadow-primary/20 dark:shadow-none">
                        <BookOpen className="h-8 w-8" />
                    </div>
                    <h1 className="text-3xl font-black text-foreground">{subject.name}</h1>
                    <p className="mt-2 text-muted-foreground">{subject.description}</p>

                    <div className="mx-auto mt-8 max-w-xs">
                        <div className="mb-2 flex items-end justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Progres Belajar</span>
                            <span className="text-sm font-black text-primary">{progressPercentage}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Alur Belajar Terstruktur
                        </span>
                        {diagnostic_summary?.has_diagnostic && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                                <Brain className="h-3.5 w-3.5" />
                                Adaptif
                            </span>
                        )}
                    </div>
                </div>

                {/* Adaptive Diagnostic Banner */}
                {isStudent && <AdaptiveBanner summary={diagnostic_summary} />}

                {/* Learning Path */}
                <LearningPathMap
                    learningPath={learning_path}
                    diagnosticSummary={diagnostic_summary}
                    isStudent={isStudent}
                />
            </div>
        </AppLayout>
    );
}
