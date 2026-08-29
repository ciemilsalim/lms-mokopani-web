import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { AssessmentForm } from '@/components/assignments';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Asesmen', href: '/assignments' },
    { title: 'Edit Asesmen', href: '#' },
];

interface EditAssignmentProps {
    assignment: any;
    teachings: any[];
    objectives: any[];
    assessment_types: any[];
    instruments: Record<string, any[]>;
    holidays: any[];
    scoring_tools: any[];
}

export default function EditAssignment({
    assignment,
    teachings,
    objectives,
    assessment_types,
    instruments,
    holidays,
    scoring_tools,
}: EditAssignmentProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs} hideBottomNav={true}>
            <Head title={`Edit ${assignment.title} – LMS Mokopani`} />

            <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-2 pb-28 sm:pb-32 w-full min-w-0">
                {/* 56px Header with 44x44px Back button (Prompt 18B Header) */}
                <div className="h-14 flex items-center justify-between gap-2 border-b border-border/70 mb-4 pb-1 w-full">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                            type="button"
                            onClick={() => router.visit(route('assignments.show', assignment.id))}
                            className="h-11 w-11 rounded-2xl border border-border bg-card text-foreground hover:bg-muted transition flex items-center justify-center cursor-pointer shrink-0"
                            title="Batal & Kembali"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight truncate">
                                Edit Asesmen
                            </h1>
                            <p className="text-xs text-muted-foreground truncate">
                                {assignment.title}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Modular Assessment Form Wizard */}
                <AssessmentForm
                    mode="edit"
                    initialAssignment={assignment}
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
