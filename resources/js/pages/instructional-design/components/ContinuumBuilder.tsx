import React from 'react';
import { Trash2, TrendingUp } from 'lucide-react';

interface ContinuumBuilderProps {
    assessmentKey: 'initial' | 'formative' | 'summative';
    instIdx: number | null;
    data: any;
    updateInitialConfig: (field: string, value: any) => void;
    updateFormativeConfig: (idx: number, field: string, value: any) => void;
    updateSummativeConfig: (idx: number, field: string, value: any) => void;
}

const DEFAULT_DEVELOPMENT_LEVELS = [
    { name: 'Belum Mulai', desc: 'Murid belum menunjukkan pemahaman atau keterampilan dasar' },
    { name: 'Sedang Berkembang', desc: 'Murid mulai memahami namun masih memerlukan bimbingan' },
    { name: 'Berkembang Baik', desc: 'Murid mampu menerapkan secara mandiri dengan hasil memadai' },
    { name: 'Mandiri', desc: 'Murid mampu menerapkan secara kreatif dan menjelaskan prosesnya' },
];

const LEVEL_COLORS = [
    'bg-red-500',
    'bg-amber-500',
    'bg-blue-500',
    'bg-emerald-500',
];

const LEVEL_TEXT_COLORS = [
    'text-red-600 dark:text-red-400',
    'text-amber-600 dark:text-amber-400',
    'text-blue-600 dark:text-blue-400',
    'text-emerald-600 dark:text-emerald-400',
];

const LEVEL_BG_COLORS = [
    'bg-red-500/10 border-red-500/30',
    'bg-amber-500/10 border-amber-500/30',
    'bg-blue-500/10 border-blue-500/30',
    'bg-emerald-500/10 border-emerald-500/30',
];

export default function ContinuumBuilder({
    assessmentKey,
    instIdx,
    data,
    updateInitialConfig,
    updateFormativeConfig,
    updateSummativeConfig,
}: ContinuumBuilderProps) {
    const inst = assessmentKey === 'initial'
        ? data.initial
        : (data as any)[assessmentKey].instruments[instIdx as number];

    const config = inst.instrument_config || {};
    const indicators = config.indicators || [];
    const developmentLevels = config.development_levels?.length > 0
        ? config.development_levels
        : DEFAULT_DEVELOPMENT_LEVELS;

    const updateConfig = (field: string, value: any) => {
        if (assessmentKey === 'initial') updateInitialConfig(field, value);
        else if (assessmentKey === 'formative') updateFormativeConfig(instIdx as number, field, value);
        else updateSummativeConfig(instIdx as number, field, value);
    };

    const addIndicator = () => {
        if (indicators.length >= 8) return;
        const newInds = [...indicators, { name: '', current_level: 0 }];
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
                    Indikator Keterampilan
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

            <div className="grid gap-4">
                {indicators.map((ind: any, indIdx: number) => {
                    const currentLevel = ind.current_level ?? 0;
                    const progress = indicators.length > 0
                        ? ((currentLevel + 1) / developmentLevels.length) * 100
                        : 0;

                    return (
                        <div
                            key={indIdx}
                            className="bg-card rounded-lg border border-border p-4 space-y-3 group"
                        >
                            <div className="flex items-center gap-3">
                                <TrendingUp className={`h-4 w-4 shrink-0 ${LEVEL_TEXT_COLORS[currentLevel] || 'text-muted-foreground'}`} />
                                <input
                                    type="text"
                                    value={ind.name || ''}
                                    onChange={(e) => updateIndicatorField(indIdx, 'name', e.target.value)}
                                    placeholder="Nama keterampilan yang diamati..."
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
                                {developmentLevels.map((dl: any, dlIdx: number) => (
                                    <button
                                        key={dlIdx}
                                        type="button"
                                        onClick={() => updateIndicatorField(indIdx, 'current_level', dlIdx)}
                                        className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                            currentLevel === dlIdx
                                                ? `${LEVEL_BG_COLORS[dlIdx]} ${LEVEL_TEXT_COLORS[dlIdx]}`
                                                : 'bg-card text-muted-foreground border-border hover:border-primary/30'
                                        }`}
                                        title={dl.desc}
                                    >
                                        {dl.name}
                                    </button>
                                ))}
                            </div>

                            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${LEVEL_COLORS[currentLevel] || 'bg-muted'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            {developmentLevels[currentLevel] && (
                                <p className="text-[10px] text-muted-foreground italic">
                                    {developmentLevels[currentLevel].desc}
                                </p>
                            )}
                        </div>
                    );
                })}

                {indicators.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-border rounded-lg bg-muted/10">
                        <p className="text-[11px] text-muted-foreground font-medium">
                            Belum ada indikator keterampilan. Tambahkan untuk mulai memantau perkembangan.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
