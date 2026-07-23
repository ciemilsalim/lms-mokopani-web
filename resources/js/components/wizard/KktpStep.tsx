import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TpItem } from './TpStep';

interface KktpStepProps {
    atpOrder: TpItem[];
    kktpApproach: string;
    setKktpApproach: (approach: string) => void;
    masteryThreshold: string;
    setMasteryThreshold: (threshold: string) => void;
    rubricLevels: {
        baru_berkembang: string;
        layak: string;
        cakap: string;
        mahir: string;
    };
    setRubricLevels: React.Dispatch<React.SetStateAction<{
        baru_berkembang: string;
        layak: string;
        cakap: string;
        mahir: string;
    }>>;
    checklistItems: string[];
    setChecklistItems: React.Dispatch<React.SetStateAction<string[]>>;
    onBack: () => void;
    onSubmit: () => void;
    submitting: boolean;
}

const APPROACHES = [
    { id: 'rubric', name: 'Rubrik (Default)', desc: 'Deskripsi kualitatif bertingkat (4 tahap capaian).' },
    { id: 'checklist', name: 'Lembar Pengamatan (Ceklis)', desc: 'Indikator memadai / tidak memadai saat observasi.' },
    { id: 'interval', name: 'Interval Nilai', desc: 'Pengelompokan interval skor (mis: 0-60, 61-75, 76-85, 86-100).' },
    { id: 'percentage', name: 'Persentase', desc: 'Ketercapaian persentase indikator yang dikuasai murid.' }
];

export const KktpStep: React.FC<KktpStepProps> = ({
    atpOrder,
    kktpApproach,
    setKktpApproach,
    masteryThreshold,
    setMasteryThreshold,
    rubricLevels,
    setRubricLevels,
    checklistItems,
    setChecklistItems,
    onBack,
    onSubmit,
    submitting
}) => {
    const [loadingAi, setLoadingAi] = useState(false);
    const [aiSource, setAiSource] = useState<'ai' | 'cache' | 'fallback' | null>(null);
    const [newChecklist, setNewChecklist] = useState('');

    const mainTpText = atpOrder.map((tp) => tp.title).join('; ');

    const handleGenerateRubric = async () => {
        if (!mainTpText) return;
        setLoadingAi(true);

        try {
            const res = await axios.post('/api/ai/generate-kktp', {
                tp_text: mainTpText
            });

            if (res.data.status === 'success') {
                setAiSource(res.data.source || 'ai');
                const levels = res.data.data?.rubric_levels;
                if (levels) {
                    setRubricLevels({
                        baru_berkembang: levels.baru_berkembang || '',
                        layak: levels.layak || '',
                        cakap: levels.cakap || '',
                        mahir: levels.mahir || ''
                    });
                }
            }
        } catch (err) {
            // Error handling
        } finally {
            setLoadingAi(false);
        }
    };

    const handleAddChecklist = () => {
        if (!newChecklist.trim()) return;
        setChecklistItems([...checklistItems, newChecklist.trim()]);
        setNewChecklist('');
    };

    return (
        <div className="space-y-6">
            {/* Approach Selection Card */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                        <span>3. Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)</span>
                        <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                            PPA 2025
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Susun kriteria untuk menentukan ketercapaian kompetensi murid pada TP yang dituju.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {APPROACHES.map((app) => (
                            <div
                                key={app.id}
                                onClick={() => setKktpApproach(app.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                    kktpApproach === app.id
                                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                            >
                                <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{app.name}</p>
                                <p className="text-[11px] text-slate-500 mt-1">{app.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Standar Ketuntasan Minimal:
                            </span>
                            <select
                                value={masteryThreshold}
                                onChange={(e) => setMasteryThreshold(e.target.value)}
                                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-indigo-600"
                            >
                                <option value="Layak">Layak</option>
                                <option value="Cakap">Cakap (Rekomendasi PPA)</option>
                                <option value="Mahir">Mahir</option>
                            </select>
                        </div>

                        {kktpApproach === 'rubric' && (
                            <Button
                                onClick={handleGenerateRubric}
                                disabled={loadingAi}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-1.5 px-4 rounded-lg shadow"
                            >
                                {loadingAi ? 'Menyusun Rubrik (AI)...' : '✨ Generate Rubrik (AI)'}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {aiSource && (
                <Alert className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300">
                    <AlertTitle className="font-bold text-xs">
                        {aiSource === 'cache' ? '⚡ Rubrik dari Cache' : '🤖 Rubrik KKTP dari OpenRouter AI'}
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                        Periksa deskripsi tiap tahapan di bawah dan sesuaikan jika diperlukan.
                    </AlertDescription>
                </Alert>
            )}

            {/* Rubric Approach Details */}
            {kktpApproach === 'rubric' && (
                <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Deskripsi Performa Rubrik (4 Tahap)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
                                    1. Baru Berkembang
                                </label>
                                <textarea
                                    rows={2}
                                    value={rubricLevels.baru_berkembang}
                                    onChange={(e) => setRubricLevels({ ...rubricLevels, baru_berkembang: e.target.value })}
                                    placeholder="Deskripsi murid belum mampu dan butuh bimbingan penuh..."
                                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">
                                    2. Layak
                                </label>
                                <textarea
                                    rows={2}
                                    value={rubricLevels.layak}
                                    onChange={(e) => setRubricLevels({ ...rubricLevels, layak: e.target.value })}
                                    placeholder="Deskripsi murid mampu menerapkan sebagian dasar secara parsial..."
                                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                                    3. Cakap (Standar Ketercapaian)
                                </label>
                                <textarea
                                    rows={2}
                                    value={rubricLevels.cakap}
                                    onChange={(e) => setRubricLevels({ ...rubricLevels, cakap: e.target.value })}
                                    placeholder="Deskripsi murid mampu menerapkan kompetensi dengan logis & mandiri..."
                                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                                    4. Mahir
                                </label>
                                <textarea
                                    rows={2}
                                    value={rubricLevels.mahir}
                                    onChange={(e) => setRubricLevels({ ...rubricLevels, mahir: e.target.value })}
                                    placeholder="Deskripsi murid mensinergikan seluruh kompetensi secara optimal..."
                                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Checklist Approach Details */}
            {kktpApproach === 'checklist' && (
                <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Indikator Lembar Pengamatan (Ceklis)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            {checklistItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800 border text-xs">
                                    <span>{idx + 1}. {item}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== idx))}
                                        className="text-rose-500 h-6 text-[11px]"
                                    >
                                        Hapus
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Input
                                placeholder="Tambah indikator ketercapaian..."
                                value={newChecklist}
                                onChange={(e) => setNewChecklist(e.target.value)}
                                className="text-xs"
                            />
                            <Button onClick={handleAddChecklist} className="text-xs bg-slate-800 text-white">
                                Tambah
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={onBack} className="text-xs">
                    ← Kembali ke ATP
                </Button>
                <Button
                    onClick={onSubmit}
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-8 py-2.5 rounded-lg shadow-lg transition-all text-sm"
                >
                    {submitting ? 'Menyimpan Modul Ajar...' : '💾 Simpan Modul Ajar'}
                </Button>
            </div>
        </div>
    );
};
