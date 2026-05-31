import React from 'react';
import { Trash2, CheckSquare, Square } from 'lucide-react';

interface ObservationBuilderProps {
    assessmentKey: 'initial' | 'formative' | 'summative';
    instIdx: number | null;
    data: any;
    updateInitialConfig: (field: string, value: any) => void;
    updateFormativeConfig: (idx: number, field: string, value: any) => void;
    updateSummativeConfig: (idx: number, field: string, value: any) => void;
    observationMode?: 'checklist' | 'anecdotal';
}

export default function ObservationBuilder({
    assessmentKey,
    instIdx,
    data,
    updateInitialConfig,
    updateFormativeConfig,
    updateSummativeConfig,
    observationMode = 'checklist',
}: ObservationBuilderProps) {
    const inst = assessmentKey === 'initial'
        ? data.initial
        : (data as any)[assessmentKey].instruments[instIdx as number];

    const config = inst.instrument_config || {};
    const indicators = config.indicators || [];

    const updateConfig = (field: string, value: any) => {
        if (assessmentKey === 'initial') {
            updateInitialConfig(field, value);
        } else if (assessmentKey === 'formative') {
            updateFormativeConfig(instIdx as number, field, value);
        } else {
            updateSummativeConfig(instIdx as number, field, value);
        }
    };

    const addIndicator = () => {
        if (indicators.length >= 8) return;
        const newInd = observationMode === 'anecdotal'
            ? { name: '', note: '' }
            : observationMode === 'simple_rubric'
            ? { name: '', selected_level: '' }
            : { name: '', checked: false };
        const newInds = [...indicators, newInd];
        updateConfig('indicators', newInds);
    };

    const removeIndicator = (indIdx: number) => {
        const newInds = indicators.filter((_: any, idx: number) => idx !== indIdx);
        updateConfig('indicators', newInds);
    };

    const updateIndicatorField = (indIdx: number, field: string, value: any) => {
        const newInds = [...indicators];
        newInds[indIdx] = { ...newInds[indIdx], [field]: value };
        updateConfig('indicators', newInds);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">
                    {observationMode === 'anecdotal' ? 'Panduan Indikator & Catatan' : observationMode === 'simple_rubric' ? 'Indikator & Rubrik Sederhana' : 'Indikator Observasi'}
                </label>
                <button
                    type="button"
                    onClick={addIndicator}
                    disabled={indicators.length >= 8}
                    className="h-6 px-2 text-[10px] font-semibold text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
                >
                    + Tambah Indikator
                </button>
            </div>

            <div className="grid gap-3">
                {indicators.map((ind: any, indIdx: number) => (
                    <div
                        key={indIdx}
                        className="bg-card text-card-foreground rounded border border-border border-l-2 border-l-primary group relative transition-all"
                    >
                        {observationMode === 'checklist' ? (
                            <div className="flex items-center gap-3 p-3">
                                <button
                                    type="button"
                                    onClick={() => updateIndicatorField(indIdx, 'checked', !ind.checked)}
                                    className="shrink-0 text-primary hover:text-primary/80 transition-colors"
                                >
                                    {ind.checked ? (
                                        <CheckSquare className="h-5 w-5" />
                                    ) : (
                                        <Square className="h-5 w-5" />
                                    )}
                                </button>
                                <input
                                    type="text"
                                    value={ind.name || ''}
                                    onChange={(e) => updateIndicatorField(indIdx, 'name', e.target.value)}
                                    placeholder="Contoh: Murid berkontribusi aktif dalam diskusi..."
                                    className="flex-1 bg-transparent text-[12px] text-foreground outline-none border-none p-0 focus:ring-0"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeIndicator(indIdx)}
                                    className="text-muted-foreground/40 hover:text-[#EB5757] transition-colors p-1 opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        ) : observationMode === 'simple_rubric' ? (
                            <div className="space-y-2 p-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-5 rounded bg-muted/50 dark:bg-border/60 text-muted-foreground flex items-center justify-center text-[10px] font-mono shrink-0">
                                        {indIdx + 1}
                                    </div>
                                    <input
                                        type="text"
                                        value={ind.name || ''}
                                        onChange={(e) => updateIndicatorField(indIdx, 'name', e.target.value)}
                                        placeholder="Nama indikator yang dinilai..."
                                        className="flex-1 bg-transparent text-[12px] font-semibold text-foreground outline-none border-none p-0 focus:ring-0"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeIndicator(indIdx)}
                                        className="text-muted-foreground/40 hover:text-[#EB5757] transition-colors p-1 opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                                <div className="flex gap-1.5">
                                    {['Perlu Bimbingan', 'Cukup', 'Baik', 'Sangat Baik'].map((level, lvlIdx) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => updateIndicatorField(indIdx, 'selected_level', level)}
                                            className={`flex-1 py-1.5 px-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all border ${
                                                ind.selected_level === level
                                                    ? lvlIdx === 0 ? 'bg-red-500/10 border-red-500/30 text-red-600'
                                                      : lvlIdx === 1 ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                                                      : lvlIdx === 2 ? 'bg-blue-500/10 border-blue-500/30 text-blue-600'
                                                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                                                    : 'bg-card text-muted-foreground border-border hover:border-primary/30'
                                            }`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2 p-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-5 rounded bg-muted/50 dark:bg-border/60 text-muted-foreground flex items-center justify-center text-[10px] font-mono shrink-0">
                                        {indIdx + 1}
                                    </div>
                                    <input
                                        type="text"
                                        value={ind.name || ''}
                                        onChange={(e) => updateIndicatorField(indIdx, 'name', e.target.value)}
                                        placeholder="Nama indikator keterlibatan/perilaku..."
                                        className="flex-1 bg-transparent text-[12px] font-semibold text-foreground outline-none border-none p-0 focus:ring-0"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeIndicator(indIdx)}
                                        className="text-muted-foreground/40 hover:text-[#EB5757] transition-colors p-1 opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                                <textarea
                                    value={ind.note || ''}
                                    onChange={(e) => updateIndicatorField(indIdx, 'note', e.target.value)}
                                    rows={3}
                                    placeholder="Contoh catatan anekdotal: 'Pada menit ke-15, Budi terlihat aktif bertanya kepada teman sebangkunya tentang langkah penyelesaian soal...'"
                                    className="w-full bg-popover/50 text-[11px] text-muted-foreground rounded border border-border p-2.5 focus:border-primary outline-none resize-none leading-relaxed italic"
                                />
                            </div>
                        )}
                    </div>
                ))}

                {indicators.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-border rounded-lg bg-muted/10">
                        <p className="text-[11px] text-muted-foreground font-medium">
                            {observationMode === 'anecdotal'
                                ? 'Belum ada panduan indikator. Tambahkan indikator untuk mulai mengamati.'
                                : 'Belum ada indikator. Silakan tambahkan indikator baru.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
