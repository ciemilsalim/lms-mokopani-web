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
        <AppLayout breadcrumbs={breadcrumbs} hideBottomNav={true}>
            <Head title="Buat Asesmen Baru – LMS Mokopani" />

            <div className="max-w-4xl mx-auto fade-in pb-28 md:pb-12 w-full min-w-0">
                {/* Header Section (Consistent with Dashboard & Materials) */}
                <div className="mb-3.5 sm:mb-5 pt-1 flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <button
                            type="button"
                            onClick={() => router.visit(route('assignments.index'))}
                            className="p-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition h-9 w-9 flex items-center justify-center cursor-pointer shrink-0"
                            title="Kembali ke Daftar Asesmen"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight leading-tight truncate">
                                Buat Asesmen Baru
                            </h1>
                            <p className="text-xs text-muted-foreground font-medium truncate">
                                Formulir pembuatan tugas & asesmen pembelajaran
                            </p>
                        </div>
                    </div>
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
