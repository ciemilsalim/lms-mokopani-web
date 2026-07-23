import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface AdminAiAnalyticsProps {
    analytics: {
        total_calls: number;
        cache_hits: number;
        hit_rate_percentage: number;
        estimated_tokens_saved: number;
        prompt_types_breakdown: {
            tp_formulation: number;
            atp_ordering: number;
            kktp_rubric: number;
            learning_steps: number;
            rapor_description: number;
        };
    };
    settings: {
        rapor_default_weights: number[];
        kktp_default_threshold: number;
    };
}

export default function AdminAiAnalyticsPage({ analytics, settings }: AdminAiAnalyticsProps) {
    const [weights, setWeights] = useState<number[]>(settings.rapor_default_weights || [0.2, 0.2, 0.2, 0.4]);
    const [threshold, setThreshold] = useState<number>(settings.kktp_default_threshold || 75.0);
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        router.post('/admin/ai-analytics/settings', {
            rapor_default_weights: weights,
            kktp_default_threshold: threshold,
        }, {
            onFinish: () => setIsSaving(false)
        });
    };

    return (
        <AppLayout title="Analitik Penggunaan AI & Konfigurasi Sekolah">
            <Head title="Analitik Penggunaan AI & Konfigurasi Sekolah" />

            <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">Analitik AI OpenRouter & Konfigurasi</h1>
                            <Badge className="bg-indigo-500 text-white text-xs font-bold">Admin Portal</Badge>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                            Monitoring efisiensi AI, cache hit-rate, dan konfigurasi bobot penilaian Rapor PPA 2025.
                        </p>
                    </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="py-3 px-4">
                            <CardDescription className="text-xs font-semibold text-slate-500">Total Panggilan AI</CardDescription>
                            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                                {analytics.total_calls}
                            </CardTitle>
                        </CardHeader>
                    </Card>

                    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="py-3 px-4">
                            <CardDescription className="text-xs font-semibold text-slate-500">Cache Hit Rate</CardDescription>
                            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {analytics.hit_rate_percentage}%
                            </CardTitle>
                        </CardHeader>
                    </Card>

                    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="py-3 px-4">
                            <CardDescription className="text-xs font-semibold text-slate-500">Estimasi Token Hemat</CardDescription>
                            <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                {analytics.estimated_tokens_saved.toLocaleString()}
                            </CardTitle>
                        </CardHeader>
                    </Card>

                    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader className="py-3 px-4">
                            <CardDescription className="text-xs font-semibold text-slate-500">Model AI Utama</CardDescription>
                            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                                OpenRouter AI
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                {/* Grid: Prompt Breakdown & Settings Form */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Prompt Types Breakdown */}
                    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Distribusi Penggunaan Fitur AI</CardTitle>
                            <CardDescription className="text-xs">
                                Pembagian jenis request prompt AI oleh guru-guru di sekolah.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { label: 'Perumusan TP dari CP', value: analytics.prompt_types_breakdown.tp_formulation, color: 'bg-indigo-600' },
                                { label: 'Pengurutan Logis ATP', value: analytics.prompt_types_breakdown.atp_ordering, color: 'bg-blue-600' },
                                { label: 'Penyusunan Rubrik KKTP', value: analytics.prompt_types_breakdown.kktp_rubric, color: 'bg-emerald-600' },
                                { label: 'Skenario Langkah Belajar (UAR)', value: analytics.prompt_types_breakdown.learning_steps, color: 'bg-amber-600' },
                                { label: 'Deskripsi Kualitatif Rapor', value: analytics.prompt_types_breakdown.rapor_description, color: 'bg-rose-600' },
                            ].map((item, idx) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                                        <span className="font-mono text-slate-900 dark:text-slate-100">{item.value} req</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-2 rounded-full ${item.color}`}
                                            style={{
                                                width: `${analytics.total_calls > 0 ? Math.min(100, (item.value / analytics.total_calls) * 100) : 0}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* School Weighting Settings Form */}
                    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Pengaturan Bobot & Threshold Default Sekolah</CardTitle>
                            <CardDescription className="text-xs">
                                Tentukan bobot pembobotan persentase dan threshold KKTP standar untuk seluruh guru.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSaveSettings} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                        Bobot Default Opsi Pembobotan Rapor (TP 1 - TP 4):
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {weights.map((w, idx) => (
                                            <div key={idx} className="text-center">
                                                <span className="text-[10px] text-slate-400 block mb-0.5">TP {idx + 1} (%)</span>
                                                <Input
                                                    type="number"
                                                    value={Math.round(w * 100)}
                                                    onChange={(e) => {
                                                        const updated = [...weights];
                                                        updated[idx] = Number(e.target.value) / 100;
                                                        setWeights(updated);
                                                    }}
                                                    className="text-xs text-center font-bold font-mono"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                        Ambang Batas Ketuntasan KKTP Default Sekolah:
                                    </label>
                                    <Input
                                        type="number"
                                        value={threshold}
                                        onChange={(e) => setThreshold(Number(e.target.value))}
                                        className="text-xs font-bold font-mono"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg shadow"
                                >
                                    {isSaving ? 'Menyimpan...' : '💾 Simpan Konfigurasi Sekolah'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
