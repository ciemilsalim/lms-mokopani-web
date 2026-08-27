import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
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

            <div className="w-full max-w-3xl mx-auto px-3.5 sm:px-6 pt-2 pb-24 space-y-3 fade-in overflow-x-hidden">
                {/* Header Bar with Unified Back Button */}
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <button
                            type="button"
                            onClick={() => router.visit(route('assignments.show', assignment.id))}
                            className="p-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground transition h-9 w-9 flex items-center justify-center cursor-pointer shrink-0"
                            title="Batal & Kembali"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-sm sm:text-base font-black text-foreground leading-tight truncate">
                                Edit Asesmen
                            </h1>
                            <p className="text-[11px] text-muted-foreground leading-tight truncate">
                                {assignment.title}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Unified 3-Step Assessment Form Wizard */}
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
