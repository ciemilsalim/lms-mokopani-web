import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { MessageSquare, Search, ChevronRight, AlertCircle, CheckCircle2, RefreshCw, Clock } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Feedback & Revisi', href: '/feedback-revisions' },
];

interface Student {
    id: number;
    name: string;
    nis: string;
}

interface Assignment {
    id: number;
    title: string;
}

interface Submission {
    id: number;
    student: Student;
    assignment: Assignment;
    score: number | null;
}

interface Revision {
    id: number;
    feedback: string;
    status: 'pending_revision' | 'revised' | 'approved';
    revision_count: number;
    created_at: string;
    submission: Submission;
}

interface Pagination {
    data: Revision[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

interface FeedbackRevisionsProps {
    revisions: Pagination;
    filters: { status?: string; assignment_id?: string };
}

const statusConfig: Record<string, { label: string; icon: any; class: string }> = {
    pending_revision: { label: 'Menunggu Revisi', icon: Clock, class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    revised: { label: 'Sudah Direvisi', icon: RefreshCw, class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    approved: { label: 'Disetujui', icon: CheckCircle2, class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

export default function FeedbackRevisionsIndex({ revisions, filters }: FeedbackRevisionsProps) {
    const [statusFilter, setStatusFilter] = useState(filters.status || '');

    const filteredUrl = (status: string) => {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        const qs = params.toString();
        return route('feedback-revisions.index') + (qs ? `?${qs}` : '');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Feedback & Revisi – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 min-w-0">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Feedback & Revisi</h1>
                    <p className="text-sm text-muted-foreground">Pantau feedback dan permintaan revisi tugas siswa</p>
                </div>

                <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                    {[
                        { value: '', label: 'Semua Status' },
                        { value: 'pending_revision', label: 'Menunggu Revisi' },
                        { value: 'revised', label: 'Sudah Direvisi' },
                        { value: 'approved', label: 'Disetujui' },
                    ].map((opt) => (
                        <Link
                            key={opt.value}
                            href={filteredUrl(opt.value)}
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                                statusFilter === opt.value
                                    ? 'bg-primary text-white'
                                    : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                            }`}
                        >
                            {opt.label}
                        </Link>
                    ))}
                </div>

                <div className="space-y-4">
                    {revisions.data.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Belum ada feedback revisi.</p>
                        </div>
                    ) : (
                        revisions.data.map((r) => {
                            const cfg = statusConfig[r.status] || statusConfig.pending_revision;
                            const Icon = cfg.icon;
                            return (
                                <div key={r.id} className="rounded-3xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                    <MessageSquare className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-foreground truncate">
                                                        {r.submission.student.name}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {r.submission.student.nis} &middot; {r.submission.assignment.title}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl bg-muted/50 p-4 border border-border">
                                                <p className="text-xs text-muted-foreground italic leading-relaxed">
                                                    "{r.feedback}"
                                                </p>
                                            </div>

                                            {r.submission.score !== null && (
                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    Nilai: <span className="font-bold text-foreground">{r.submission.score}</span>
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${cfg.class}`}>
                                                <Icon className="h-3 w-3" />
                                                {cfg.label}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                Revisi ke-{r.revision_count + 1}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(r.created_at).toLocaleDateString('id-ID')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {revisions.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Menampilkan {revisions.from}-{revisions.to} dari {revisions.total}</span>
                        <div className="flex gap-2">
                            {Array.from({ length: revisions.last_page }, (_, i) => i + 1).map((page) => (
                                <Link
                                    key={page}
                                    href={route('feedback-revisions.index', { ...filters, page })}
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition ${
                                        page === revisions.current_page
                                            ? 'bg-primary text-white'
                                            : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                                    }`}
                                >
                                    {page}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
