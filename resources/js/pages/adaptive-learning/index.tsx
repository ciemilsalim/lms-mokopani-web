import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Brain, ChevronRight, BookOpen, Users, TrendingUp } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Diagnostik Adaptif', href: '/adaptive-learning' },
];

interface Teaching {
    subject_id: number;
    subject_name: string;
    class_id: number;
    class_name: string;
}

interface StudentSubject {
    id: number;
    name: string;
}

interface AdaptiveLearningIndexProps {
    teachings?: Teaching[];
    subjects?: StudentSubject[];
    student_id?: number;
}

export default function AdaptiveLearningIndex({ teachings, subjects, student_id }: AdaptiveLearningIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Diagnostik Adaptif – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-foreground">Diagnostik Adaptif</h1>
                    <p className="text-sm text-muted-foreground">
                        {student_id ? 'Lihat hasil diagnostik dan rekomendasi belajarmu' : 'Pantau hasil diagnostik siswa'}
                    </p>
                </div>

                {student_id && subjects ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {subjects.map((s) => (
                            <Link
                                key={s.id}
                                href={route('adaptive-learning.summary', [s.id, student_id])}
                                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-violet-400 hover:shadow-xl hover:shadow-violet-500/10"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 transition-colors group-hover:bg-violet-600 group-hover:text-white">
                                        <Brain className="h-6 w-6" />
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-violet-500 transition-colors" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground group-hover:text-violet-600 transition-colors">
                                    {s.name}
                                </h3>
                            </Link>
                        ))}
                    </div>
                ) : teachings ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {teachings.map((t) => (
                            <Link
                                key={`${t.subject_id}-${t.class_id}`}
                                href={route('adaptive-learning.students', [t.subject_id, t.class_id])}
                                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-violet-400 hover:shadow-xl hover:shadow-violet-500/10"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 transition-colors group-hover:bg-violet-600 group-hover:text-white">
                                        <Brain className="h-6 w-6" />
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-violet-500 transition-colors" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-foreground group-hover:text-violet-600 transition-colors">
                                        {t.subject_name}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Users className="h-3 w-3" />
                                        <span>Kelas {t.class_name}</span>
                                    </div>
                                </div>
                                <TrendingUp className="absolute -right-4 -bottom-4 h-24 w-24 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity" />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center text-muted-foreground">
                        <Brain className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <p>Tidak ada data tersedia.</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
