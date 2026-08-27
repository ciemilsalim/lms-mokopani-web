import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
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
}

export default function CreateAssignment({
    teachings,
    objectives,
    assessment_types,
    instruments,
    holidays,
    scoring_tools,
}: CreateAssignmentProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Buat Asesmen Baru – LMS Mokopani" />

            <div className="space-y-4 max-w-4xl mx-auto px-4 sm:px-6 pt-2 pb-12 fade-in">
                {/* Back Button Header */}
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => router.visit(route('assignments.index'))}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition min-h-[44px]"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Kembali ke Daftar Asesmen</span>
                    </button>
                </div>

                {/* Modular Assessment Form Wizard */}
                <AssessmentForm
                    mode="create"
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
