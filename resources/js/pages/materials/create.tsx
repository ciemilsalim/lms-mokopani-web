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
    initial_class_id?: number | null;
    initial_subject_id?: number | null;
    errors?: Record<string, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Bahan Materi', href: '/materials' },
    { title: 'Tambah Materi', href: '/materials/create' },
];

export default function CreateMaterial({
    teachings,
    objectives,
    initial_class_id,
    initial_subject_id,
    errors = {},
}: CreateMaterialProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs} hideBottomNav={true}>
            <Head title="Tambah Materi – LMS Mokopani" />

            <div className="max-w-4xl mx-auto fade-in pb-28 md:pb-12 w-full min-w-0">
                {/* Form Subtitle / Header */}
                <div className="mb-4 sm:mb-6 pt-1">
                    <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                        Tambah Materi
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
                        Lengkapi informasi dan materi pembelajaran untuk siswa
                    </p>
                </div>

                {/* Form */}
                <MaterialForm
                    mode="create"
                    teachings={teachings}
                    objectives={objectives}
                    initialClassId={initial_class_id}
                    initialSubjectId={initial_subject_id}
                    errors={errors}
                />
            </div>
        </AppLayout>
    );
}
