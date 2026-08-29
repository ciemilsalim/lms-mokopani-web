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

            <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-2 pb-28 sm:pb-32 w-full min-w-0">
                {/* 56px Header with 44x44px Back button (Prompt 18B Header) */}
                <div className="h-14 flex items-center justify-between gap-2 border-b border-border/70 mb-4 pb-1 w-full">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                            type="button"
                            onClick={() => router.visit(route('assignments.index'))}
                            className="h-11 w-11 rounded-2xl border border-border bg-card text-foreground hover:bg-muted transition flex items-center justify-center cursor-pointer shrink-0"
                            title="Kembali ke Daftar Asesmen"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight truncate">
                                Buat Asesmen Baru
                            </h1>
                            <p className="text-xs text-muted-foreground truncate">
                                Wizard perancangan asesmen kurikulum merdeka
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
