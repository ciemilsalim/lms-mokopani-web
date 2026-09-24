import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { AssessmentForm } from '@/components/assignments';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Asesmen', href: '/assignments' },
    { title: 'Buat Asesmen Baru', href: '/assignments/create' },
];

interface CreateAssignmentProps {
    teachings: any[];
    objectives: any[];
    assessment_types: any[];
    instruments: Record<string, any[]>;
    holidays: any[];
    scoring_tools: any[];
    initial_class_id?: number | null;
}

export default function CreateAssignment({
    teachings,
    objectives,
    assessment_types,
    instruments,
    holidays,
    scoring_tools,
    initial_class_id,
}: CreateAssignmentProps) {
    // Find class info if initial_class_id provided
    const teachingItem = initial_class_id 
        ? teachings.find(t => t.class_id === initial_class_id)
        : null;
    const targetClassName = teachingItem ? teachingItem.class_name : null;

    const backUrl = initial_class_id 
        ? `/classes/${initial_class_id}?tab=assignments` 
        : route('assignments.index');

    const breadcrumbs: BreadcrumbItem[] = initial_class_id ? [
        { title: 'Daftar Kelas', href: '/classes' },
        { title: targetClassName || 'Detail Kelas', href: `/classes/${initial_class_id}?tab=assignments` },
        { title: 'Buat Asesmen Baru', href: `/assignments/create?class_id=${initial_class_id}` },
    ] : [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Asesmen', href: '/assignments' },
        { title: 'Buat Asesmen Baru', href: '/assignments/create' },
    ];

    // Compute initial assignment state if initial_class_id is present
    const initialAssignment = initial_class_id ? {
        id: 0,
        title: '',
        description: '',
        subject_id: teachingItem ? teachingItem.subject_id : 0,
        school_classes: [initial_class_id],
        learning_objective_id: null,
        assessment_type: 'formative',
        instrument_type: 'formative_quiz',
        instrument_config: {},
        scoring_tool: null,
        scoring_tool_config: {},
        due_date: '',
        max_points: 100,
        passing_grade: 75,
    } : undefined;

    return (
        <AppLayout breadcrumbs={breadcrumbs} hideBottomNav={true}>
            <Head title="Buat Asesmen Baru – LMS Mokopani" />

            <div className="space-y-4 sm:space-y-5 fade-in pb-28 sm:pb-32 max-w-7xl mx-auto w-full min-w-0">
                {/* 56px Header with 44x44px Back button (Prompt 18B Header) */}
                <div className="h-14 flex items-center justify-between gap-2 border-b border-border/70 mb-4 pb-1 w-full">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                            type="button"
                            onClick={() => router.visit(backUrl)}
                            className="h-11 w-11 rounded-2xl border border-border bg-card text-foreground hover:bg-muted transition flex items-center justify-center cursor-pointer shrink-0"
                            title="Kembali"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight truncate">
                                Buat Asesmen Baru
                            </h1>
                            <p className="text-xs text-muted-foreground truncate">
                                {targetClassName ? `Perancangan asesmen untuk kelas ${targetClassName}` : 'Wizard perancangan asesmen kurikulum merdeka'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Modular Assessment Form Wizard */}
                <AssessmentForm
                    mode="create"
                    initialAssignment={initialAssignment}
                    teachings={teachings}
                    objectives={objectives}
                    assessment_types={assessment_types}
                    instruments={instruments}
                    holidays={holidays}
                    scoring_tools={scoring_tools}
                />
            </div>
        </AppLayout>
    );
}
