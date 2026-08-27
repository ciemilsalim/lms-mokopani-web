import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import { MaterialForm } from '@/components/materials';

interface EditMaterialProps {
    material: {
        id: number;
        title: string;
        content: string | null;
        thumbnail: string | null;
        subject_id: number;
        school_classes: number[];
        learning_objective_id: number | null;
        resources: Array<{
            id: number;
            type: string;
            title: string | null;
            path: string;
            file_type: string | null;
        }>;
    };
    teachings: any[];
    objectives: any[];
    errors?: Record<string, string>;
}

export default function EditMaterial({ material, teachings, objectives, errors = {} }: EditMaterialProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Bahan Materi', href: '/materials' },
        { title: 'Edit Materi', href: '#' },
    ];

    // Filter out image type resources for the main resource editor (handled in image modal)
    const nonImageResources = material.resources.filter(r => r.type !== 'image');

    // Format existing images and thumbnail for the image modal
    const existingImages = material.resources
        .filter(r => r.type === 'image')
        .map(r => ({
            id: r.id,
            path: r.path.startsWith('http') ? r.path : `/storage/${r.path}`,
            type: 'existing' as const
        }));

    const legacyThumb = material.thumbnail
        ? [{ id: -1, path: material.thumbnail, type: 'legacy' as const }]
        : [];

    const allExistingImages = [...legacyThumb, ...existingImages];

    const initialData = {
        subject_id: material.subject_id.toString(),
        school_classes: material.school_classes,
        learning_objective_id: material.learning_objective_id ? material.learning_objective_id.toString() : '',
        title: material.title,
        content: material.content || '',
        thumbnail: material.thumbnail,
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${material.title} – LMS Mokopani`} />

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
                    <h1 className="text-xl sm:text-2xl font-black text-foreground">Edit Materi</h1>
                    <p className="text-sm text-muted-foreground">Sesuaikan informasi materi pembelajaran</p>
                </div>

                {/* Form */}
                <MaterialForm
                    mode="edit"
                    materialId={material.id}
                    teachings={teachings}
                    objectives={objectives}
                    initialData={initialData}
                    existingResources={nonImageResources}
                    existingImages={allExistingImages}
                    errors={errors}
                />
            </div>
        </AppLayout>
    );
}
