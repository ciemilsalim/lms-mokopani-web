import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, User, AlertTriangle, GraduationCap, Clock, BookOpen, Users, AlertCircle } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Early Warning', href: '/early-warning' },
    { title: 'Detail Siswa', href: '#' },
];

interface Flag {
    type: string;
    level: string;
    label: string;
    message: string;
    icon: string;
}

interface EarlyWarningStudentProps {
    student: { id: number; name: string; nis: string; class_name: string };
    subject: { id: number; name: string };
    flags: Flag[];
}

const iconMap: Record<string, any> = {
    'graduation-cap': GraduationCap,
    'clock': Clock,
    'book-open': BookOpen,
    'users': Users,
    'alert-triangle': AlertCircle,
};

const levelConfig: Record<string, { label: string; class: string }> = {
    high:   { label: 'Tinggi', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900' },
    medium: { label: 'Sedang', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-900' },
    low:    { label: 'Rendah', class: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-900' },
};

export default function EarlyWarningStudent({ student, subject, flags }: EarlyWarningStudentProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Early Warning – ${student.name} – LMS Mokopani`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <Link
                    href={route('early-warning.index')}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition w-fit"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Kembali
                </Link>

                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <User className="h-7 w-7" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">{student.name}</h2>
                            <p className="text-sm text-muted-foreground">{student.nis} &middot; {student.class_name} &middot; {subject.name}</p>
                        </div>
                    </div>
                </div>

                {flags.length === 0 ? (
                    <div className="rounded-3xl border border-border bg-card p-12 text-center shadow-sm">
                        <GraduationCap className="h-16 w-16 mx-auto mb-4 text-emerald-500 opacity-50" />
                        <h3 className="text-lg font-bold text-emerald-600">Siswa dalam kondisi baik</h3>
                        <p className="text-sm text-muted-foreground mt-2">Tidak ada indikator risiko yang terdeteksi untuk siswa ini.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {flags.map((f, i) => {
                            const cfg = levelConfig[f.level] || levelConfig.low;
                            const Icon = iconMap[f.icon] || AlertTriangle;
                            return (
                                <div key={i} className={`rounded-3xl border-2 p-6 shadow-sm ${cfg.class}`}>
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/50">
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-bold text-foreground">{f.label}</h3>
                                                <span className="inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white/50">
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-foreground/80">{f.message}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
