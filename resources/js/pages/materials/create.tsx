import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
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

export default function CreateMaterial({
    teachings,
    objectives,
    initial_class_id,
    initial_subject_id,
    errors = {},
}: CreateMaterialProps) {
    // Find class or subject name if initial ID is provided
    const teachingClass = initial_class_id 
        ? teachings.find(t => t.school_class_id === initial_class_id)?.school_class?.name 
        : null;
    const teachingSubject = initial_subject_id
        ? teachings.find(t => t.subject_id === initial_subject_id)?.subject?.name
        : null;

    const backUrl = initial_class_id 
        ? `/classes/${initial_class_id}?tab=materials` 
        : initial_subject_id
            ? `/subjects/${initial_subject_id}`
            : route('materials.index');

    const breadcrumbs: BreadcrumbItem[] = initial_class_id ? [
        { title: 'Daftar Kelas', href: '/classes' },
        { title: teachingClass || 'Detail Kelas', href: `/classes/${initial_class_id}?tab=materials` },
        { title: 'Tambah Materi', href: `/materials/create?class_id=${initial_class_id}` },
    ] : initial_subject_id ? [
        { title: 'Mata Pelajaran', href: '/subjects' },
        { title: teachingSubject || 'Detail Mapel', href: `/subjects/${initial_subject_id}` },
        { title: 'Tambah Materi', href: `/materials/create?subject_id=${initial_subject_id}` },
    ] : [
        { title: 'Bahan Materi', href: '/materials' },
        { title: 'Tambah Materi', href: '/materials/create' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs} hideBottomNav={true}>
            <Head title="Tambah Materi – LMS Mokopani" />

            <div className="max-w-4xl mx-auto fade-in pb-28 md:pb-12 w-full min-w-0">
                {/* 56px Header with Back button */}
                <div className="flex items-center gap-2.5 mb-4 sm:mb-6 pt-1">
                    <button
                        type="button"
                        onClick={() => router.visit(backUrl)}
                        className="h-11 w-11 rounded-2xl border border-border bg-card text-foreground hover:bg-muted transition flex items-center justify-center cursor-pointer shrink-0"
                        title="Kembali"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">
                            Tambah Materi
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5 truncate">
                            {teachingClass ? `Materi pembelajaran untuk kelas ${teachingClass}` : 'Lengkapi informasi dan materi pembelajaran untuk siswa'}
                        </p>
                    </div>
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
