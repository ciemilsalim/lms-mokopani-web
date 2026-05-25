import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { BookOpen, ClipboardList, Users, TrendingUp, ChevronRight, GraduationCap, Calendar } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Anak Saya', href: '/parent/dashboard' },
];

interface ChildData {
    id: number;
    name: string;
    nis: string;
    class_name: string;
    total_assignments: number;
    submitted: number;
    pending: number;
    avg_score: number | null;
    attendance_pct: number | null;
}

interface ParentDashboardProps {
    children: ChildData[];
}

export default function ParentDashboard({ children }: ParentDashboardProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Anak Saya – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Anak Saya</h1>
                    <p className="text-sm text-muted-foreground">
                        Pantau perkembangan belajar anak Anda
                    </p>
                </div>

                {children.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                        <Users className="mb-4 h-16 w-16 opacity-20" />
                        <p className="text-lg font-medium">Belum ada data anak</p>
                        <p className="text-sm">Hubungi admin untuk menghubungkan akun Anda.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {children.map((child) => (
                            <Link
                                key={child.id}
                                href={route('parent.child', child.id)}
                                className="group rounded-2xl border bg-card p-6 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                                            <Users className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{child.name}</h2>
                                            <p className="text-xs font-bold text-muted-foreground">
                                                {child.class_name} &middot; NIS: {child.nis}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-4">
                                    <div className="rounded-xl border bg-muted/30 p-3">
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                                            <ClipboardList className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Tugas</span>
                                        </div>
                                        <span className="text-lg font-black text-foreground">
                                            {child.submitted}/{child.total_assignments}
                                        </span>
                                        {child.pending > 0 && (
                                            <p className="text-[10px] font-bold text-rose-500">{child.pending} tertunda</p>
                                        )}
                                    </div>

                                    <div className="rounded-xl border bg-muted/30 p-3">
                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                                            <TrendingUp className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Rata-rata</span>
                                        </div>
                                        <span className={`text-lg font-black ${
                                            (child.avg_score ?? 0) >= 70 ? 'text-emerald-600' :
                                            (child.avg_score ?? 0) >= 40 ? 'text-amber-600' : 'text-muted-foreground'
                                        }`}>{child.avg_score ?? '-'}</span>
                                    </div>

                                    <div className="rounded-xl border bg-muted/30 p-3">
                                        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Kehadiran</span>
                                        </div>
                                        <span className={`text-lg font-black ${
                                            (child.attendance_pct ?? 100) >= 75 ? 'text-emerald-600' : 'text-rose-600'
                                        }`}>{child.attendance_pct ?? '-'}%</span>
                                    </div>

                                    <div className="rounded-xl border bg-muted/30 p-3">
                                        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
                                            <GraduationCap className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Kelas</span>
                                        </div>
                                        <span className="text-lg font-black text-foreground">{child.class_name}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
