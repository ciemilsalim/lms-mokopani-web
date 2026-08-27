import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import { MaterialForm } from '@/components/materials';

interface Objective {
    id: number;
    code: string;
    description: string;
    subject_id: number;
}

interface Teaching {
    id: number;
    subject_id: number;
    school_class_id: number;
    subject: { id: number; name: string };
    school_class: { id: number; name: string };
}

interface CreateMaterialProps {
    teachings: Teaching[];
    objectives: Objective[];
    errors?: Record<string, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Bahan Materi', href: '/materials' },
    { title: 'Tambah Materi', href: '/materials/create' },
];

export default function CreateMaterial({ teachings, objectives, errors = {} }: CreateMaterialProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tambah Materi – LMS Mokopani" />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 fade-in">
                {/* Page Header */}
                <div className="space-y-1 mb-6 sm:mb-8">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition mb-3 min-h-[44px] -ml-1 px-1"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Kembali
                    </button>
                    <h1 className="text-xl sm:text-2xl font-black text-foreground">Tambah Materi</h1>
                    <p className="text-sm text-muted-foreground">Lengkapi informasi materi pembelajaran</p>
                </div>

                {/* Form */}
                <MaterialForm
                    mode="create"
                    teachings={teachings}
                    objectives={objectives}
                    errors={errors}
                />
            </div>
        </AppLayout>
    );
}
