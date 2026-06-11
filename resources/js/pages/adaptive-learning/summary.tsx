import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { ChevronLeft, Brain, User, BookOpen, Target, Zap, Star, AlertCircle, CheckCircle2, TrendingUp, Palette, Music, Activity, Heart, Layers, Video, RefreshCw, Loader2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Diagnostik Adaptif', href: '/adaptive-learning' },
    { title: 'Ringkasan', href: '#' },
];

interface TopicBreakdown {
    topic: string;
    score: number;
    max_score: number;
    mastery_pct: number;
    mastery_level: string;
}

interface Recommendation {
    type: string;
    message: string;
    icon: string;
    topic?: string;
}

interface DiagnosticResult {
    id: number;
    assignment_id: number;
    learning_objective_id: number | null;
    total_score: number;
    is_passed: boolean;
    topic_breakdown: TopicBreakdown[];
    recommendations: Recommendation[];
}

interface Summary {
    has_diagnostic: boolean;
    mastered_tp_ids: number[];
    average_score: number | null;
    results: DiagnosticResult[];
}

interface NonCognitive {
    learning_style: string | null;
    learning_style_detail: string[] | null;
    motivation_level: string[] | null;
    interests: string[] | null;
    family_background: string[] | null;
    notes: string | null;
}

interface DifferentiatedStrategy {
    content: string[];
    process: string[];
    product: string[];
}

interface AdaptiveSummaryProps {
    subject: { id: number; name: string };
    student: { id: number; name: string; nis: string; class_name: string };
    summary: Summary;
    non_cognitive: NonCognitive | null;
    differentiated_strategy: DifferentiatedStrategy | null;
}

const masteryColors: Record<string, string> = {
    tinggi: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    sedang: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    rendah: 'text-red-600 bg-red-50 dark:bg-red-900/20',
};

const masteryBars: Record<string, string> = {
    tinggi: 'bg-emerald-500',
    sedang: 'bg-amber-500',
    rendah: 'bg-red-500',
};

const recommendationIcons: Record<string, any> = {
    zap: Zap,
    star: Star,
    'book-open': BookOpen,
    target: Target,
};

const getStyleIcon = (style: string | null) => {
    const s = (style || 'visual').toLowerCase();
    if (s.includes('auditor')) return <Music className="h-5 w-5" />;
    if (s.includes('kinestetik') || s.includes('kinesthetic')) return <Activity className="h-5 w-5" />;
    return <Palette className="h-5 w-5" />;
};

const getMotivationDisplay = (motivation: any) => {
    if (!motivation) return '-';
    const intrinsic = motivation.intrinsik || motivation.intrinsic || '-';
    const extrinsic = motivation.ekstrinsik || motivation.extrinsic || '-';
    return `Intrinsik: ${intrinsic} | Ekstrinsik: ${extrinsic}`;
};

const getInterestsArray = (interests: any): string[] => {
    if (!interests) return [];
    if (Array.isArray(interests)) return interests;
    let list: string[] = [];
    if (Array.isArray(interests.daftar)) {
        list = [...interests.daftar];
    }
    if (interests.lainnya) {
        list.push(interests.lainnya);
    }
    return list;
};

const getFamilyBackgroundDisplay = (family: any) => {
    if (!family) return '-';
    const parts: string[] = [];

    if (family.pekerjaan_ayah) parts.push(`Ayah: ${family.pekerjaan_ayah}`);
    if (family.pekerjaan_ibu) parts.push(`Ibu: ${family.pekerjaan_ibu}`);
    if (family.jumlah_saudara) parts.push(`Saudara: ${family.jumlah_saudara}`);
    if (family.status_tinggal) {
        const tinggalMap: Record<string, string> = {
            orang_tua: 'Orang Tua',
            wali: 'Wali',
            saudara: 'Saudara',
            pondok: 'Pondok/Asrama',
            lainnya: 'Lainnya',
        };
        parts.push(`Tinggal: ${tinggalMap[family.status_tinggal] || family.status_tinggal}`);
    }

    if (parts.length === 0) {
        if (family.parent_education) {
            const edu = family.parent_education;
            parts.push(`Pendidikan Ayah: ${edu.Ayah || '-'}, Ibu: ${edu.Ibu || '-'}`);
        }
        if (family.economic_status) parts.push(`Ekonomi: ${family.economic_status}`);
        if (family.study_support) parts.push(`Dukungan Belajar: ${family.study_support}`);
    }

    return parts.length > 0 ? parts.join(' | ') : '-';
};

export default function AdaptiveSummary({ subject, student, summary, non_cognitive, differentiated_strategy }: AdaptiveSummaryProps) {
    const { user_role } = usePage<any>().props;
    const canGenerate = user_role === 'teacher' || user_role === 'admin';
    const [loading, setLoading] = useState(false);

    const handleGenerate = () => {
        setLoading(true);
        router.get(
            route('adaptive-learning.summary', [subject.id, student.id]),
            { regenerate: 'true' },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setLoading(false),
            }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Diagnostik ${subject.name} – LMS Mokopani`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6 fade-in">
                <Link
                    href={route('adaptive-learning.index')}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition w-fit"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Kembali
                </Link>

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm border-l-4 border-l-violet-500">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                            <Brain className="h-7 w-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold text-foreground">Diagnostik {subject.name}</h2>
                                {summary.average_score !== null && (
                                    <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                        summary.average_score >= 70 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                                    }`}>
                                        Rata-rata: {summary.average_score}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">{student.name} &middot; {student.nis} &middot; {student.class_name}</p>
                        </div>
                    </div>
                </div>

                {!summary.has_diagnostic ? (
                    <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
                        <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                        <h3 className="text-lg font-bold text-muted-foreground">Belum ada diagnostik</h3>
                        <p className="text-sm text-muted-foreground mt-2">Siswa belum mengerjakan asesmen diagnostik untuk mata pelajaran ini.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {summary.results.map((result, idx) => (
                            <div key={result.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                            result.is_passed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                        }`}>
                                            {result.is_passed ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">Diagnostik {idx + 1}</p>
                                            <p className="text-[10px] text-muted-foreground">Skor: {result.total_score}</p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                        result.is_passed ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                                    }`}>
                                        {result.is_passed ? 'Lulus' : 'Belum Lulus'}
                                    </span>
                                </div>

                                {result.topic_breakdown.length > 0 && (
                                    <div className="mb-4 space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rincian Topik</p>
                                        {result.topic_breakdown.map((topic, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <span className="w-24 text-xs font-medium text-foreground truncate">{topic.topic}</span>
                                                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${masteryBars[topic.mastery_level] || 'bg-gray-400'}`}
                                                        style={{ width: `${topic.mastery_pct}%` }}
                                                    />
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${masteryColors[topic.mastery_level] || ''}`}>
                                                    {topic.mastery_pct}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {result.recommendations.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rekomendasi</p>
                                        {result.recommendations.map((rec, i) => {
                                            const RecIcon = recommendationIcons[rec.icon] || Target;
                                            return (
                                                <div key={i} className="flex items-start gap-3 rounded-2xl bg-muted/50 p-3 border border-border">
                                                    <RecIcon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                                    <p className="text-xs text-muted-foreground leading-relaxed">{rec.message}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Profil Non-Kognitif */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm mt-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 text-pink-600">
                            <Heart className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Profil Belajar Siswa (Non-Kognitif)</h3>
                            <p className="text-xs text-muted-foreground">Karakteristik dan gaya belajar siswa</p>
                        </div>
                    </div>

                    {!non_cognitive ? (
                        <div className="text-center py-6 text-sm text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border">
                            Belum ada data diagnostik non-kognitif untuk siswa ini.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-border p-4 bg-background">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Gaya Belajar</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        {getStyleIcon(non_cognitive.learning_style)}
                                    </div>
                                    <div className="font-semibold text-sm capitalize">
                                        {non_cognitive.learning_style || 'Belum diatur'}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="rounded-2xl border border-border p-4 bg-background">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Tingkat Motivasi</p>
                                <div className="font-semibold text-sm capitalize">
                                    {getMotivationDisplay(non_cognitive.motivation_level)}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border p-4 bg-background">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Minat & Hobi</p>
                                <div className="flex flex-wrap gap-2">
                                    {getInterestsArray(non_cognitive.interests).length > 0 ? (
                                        getInterestsArray(non_cognitive.interests).map((interest, i) => (
                                            <span key={i} className="inline-flex rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground capitalize">
                                                {interest.replace('_', ' ')}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-sm text-muted-foreground">-</span>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border p-4 bg-background">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Latar Belakang</p>
                                <div className="text-sm text-muted-foreground">
                                    {getFamilyBackgroundDisplay(non_cognitive.family_background)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>                {/* Strategi Diferensiasi PPA 2026 */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm mt-2 mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                <Layers className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Strategi Pembelajaran Terdiferensiasi</h3>
                                <p className="text-xs text-muted-foreground">Rekomendasi AI berbasis PPA 2026</p>
                            </div>
                        </div>
                        {canGenerate && differentiated_strategy && (
                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted transition duration-150 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-3.5 w-3.5" />
                                )}
                                {loading ? 'Meregenerasi...' : 'Generate Ulang'}
                            </button>
                        )}
                    </div>

                    {!differentiated_strategy ? (
                        canGenerate ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 border border-dashed border-border rounded-2xl">
                                <Brain className="h-12 w-12 text-primary/50 mb-3 animate-pulse" />
                                <h4 className="font-bold text-sm text-foreground mb-1">Strategi Belum Dihasilkan</h4>
                                <p className="text-xs text-muted-foreground max-w-md mb-4 leading-relaxed">
                                    Strategi pembelajaran terdiferensiasi (Konten, Proses, Produk) belum digenerate untuk profil siswa ini. Silakan klik tombol di bawah untuk menghasilkan rekomendasi AI berbasis PPA 2026.
                                </p>
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/95 transition duration-150 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                            Menganalisis & Menghasilkan...
                                        </>
                                    ) : (
                                        <>
                                            <Brain className="h-3.5 w-3.5 mr-1" />
                                            Generate dengan AI
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 border border-dashed border-border rounded-2xl">
                                <Brain className="h-12 w-12 text-muted-foreground/30 mb-3" />
                                <h4 className="font-bold text-sm text-foreground mb-1">Strategi Belum Tersedia</h4>
                                <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                                    Strategi pembelajaran terdiferensiasi belum digenerate oleh Guru Anda untuk mata pelajaran ini. Silakan hubungi Guru untuk informasi lebih lanjut.
                                </p>
                            </div>
                        )
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 border-b border-border pb-2">
                                    <BookOpen className="h-4 w-4 text-emerald-600" />
                                    <h4 className="font-bold text-sm text-foreground">Diferensiasi Konten</h4>
                                </div>
                                <ul className="space-y-2">
                                    {differentiated_strategy.content.map((item, i) => (
                                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 border-b border-border pb-2">
                                    <Activity className="h-4 w-4 text-amber-600" />
                                    <h4 className="font-bold text-sm text-foreground">Diferensiasi Proses</h4>
                                </div>
                                <ul className="space-y-2">
                                    {differentiated_strategy.process.map((item, i) => (
                                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 border-b border-border pb-2">
                                    <Video className="h-4 w-4 text-purple-600" />
                                    <h4 className="font-bold text-sm text-foreground">Diferensiasi Produk</h4>
                                </div>
                                <ul className="space-y-2">
                                    {differentiated_strategy.product.map((item, i) => (
                                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </AppLayout>
    );
}
