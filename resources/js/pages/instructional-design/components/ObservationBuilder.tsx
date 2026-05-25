import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { assessmentColors } from './types';

interface ObservationBuilderProps {
    assessmentKey: 'initial' | 'formative' | 'summative';
    instIdx: number | null; // null for initial assessment
    data: any;
    updateInitialConfig: (field: string, value: any) => void;
    updateFormativeConfig: (idx: number, field: string, value: any) => void;
    updateSummativeConfig: (idx: number, field: string, value: any) => void;
}

export default function ObservationBuilder({
    assessmentKey,
    instIdx,
    data,
    updateInitialConfig,
    updateFormativeConfig,
    updateSummativeConfig,
}: ObservationBuilderProps) {
    const inst = assessmentKey === 'initial'
        ? data.initial
        : (data as any)[assessmentKey].instruments[instIdx as number];

    const config = inst.instrument_config || {};
    const indicators = config.indicators || [];
    const colors = assessmentColors[assessmentKey];

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
        if (indicators.length >= 8) return; // Keep a reasonable limit
        const newInds = [...indicators, { name: '' }];
        updateConfig('indicators', newInds);
    };

    const removeIndicator = (indIdx: number) => {
        const newInds = indicators.filter((_: any, idx: number) => idx !== indIdx);
        updateConfig('indicators', newInds);
    };

    const updateIndicatorText = (indIdx: number, value: string) => {
        const newInds = [...indicators];
        newInds[indIdx] = { ...newInds[indIdx], name: value };
        updateConfig('indicators', newInds);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">
                    Indikator Observasi
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
            <div className="grid gap-2">
                {indicators.map((ind: any, indIdx: number) => (
                    <div
                        key={indIdx}
                        className="flex items-center gap-3 p-3 bg-card text-card-foreground rounded border border-border border-l-2 border-l-primary group relative focus-within:border-primary/50 transition-all"
                    >
                        <div className="h-5 w-5 rounded bg-muted/50 dark:bg-border/60 text-muted-foreground flex items-center justify-center text-[10px] font-mono shrink-0">
                            {indIdx + 1}
                        </div>
                        <input
                            type="text"
                            value={ind.name || ''}
                            onChange={(e) => updateIndicatorText(indIdx, e.target.value)}
                            placeholder="Contoh: Murid mampu menjelaskan langkah analisis..."
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
                ))}
                {indicators.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-border rounded-lg bg-muted/10">
                        <p className="text-[11px] text-muted-foreground font-medium">Belum ada indikator. Silakan tambahkan indikator baru.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
