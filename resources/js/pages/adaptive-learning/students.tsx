import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, Brain, User, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Diagnostik Adaptif', href: '/adaptive-learning' },
    { title: 'Pilih Siswa', href: '#' },
];

interface Student {
    id: number;
    name: string;
    nis: string;
}

interface StudentsProps {
    subject: { id: number; name: string };
    kelas: string;
    students: Student[];
}

export default function AdaptiveStudents({ subject, kelas, students }: StudentsProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Pilih Siswa – ${subject.name} – LMS Mokopani`} />

            <div className="flex h-full flex-1 flex-col gap-6 min-w-0">
                <Link
                    href={route('adaptive-learning.index')}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition w-fit"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Kembali
                </Link>

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                            <Brain className="h-7 w-7" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">{subject.name}</h2>
                            <p className="text-sm text-muted-foreground">Kelas {kelas}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card shadow-sm">
                    <div className="flex items-center gap-2 border-b border-border px-6 py-4">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-foreground">Pilih Siswa</h3>
                        <span className="text-xs text-muted-foreground/60">({students.length} siswa)</span>
                    </div>
                    <div className="divide-y divide-border">
                        {students.map((s) => (
                            <Link
                                key={s.id}
                                href={route('adaptive-learning.summary', [subject.id, s.id])}
                                className="flex items-center gap-4 px-6 py-4 transition hover:bg-muted/30"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-xs font-bold text-muted-foreground">
                                    {s.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                                    <p className="text-[11px] text-muted-foreground/60">{s.nis}</p>
                                </div>
                                <User className="h-4 w-4 text-muted-foreground/40" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}