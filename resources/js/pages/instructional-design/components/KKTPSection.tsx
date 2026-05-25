import {
    CheckSquare,
    AlignLeft,
    Layers,
    Activity,
    Zap,
    Info,
    CheckCircle2,
} from 'lucide-react';
import { assessmentColors } from './types';

interface KKTPSectionProps {
    assessmentKey: 'initial' | 'formative' | 'summative';
    instIdx: number | null;
    data: any;
    updateInitialConfig: (field: string, value: any) => void;
    updateFormativeConfig: (idx: number, field: string, value: any) => void;
    updateSummativeConfig: (idx: number, field: string, value: any) => void;
}

export default function KKTPSection({
    assessmentKey,
    instIdx,
    data,
    updateInitialConfig,
    updateFormativeConfig,
    updateSummativeConfig,
}: KKTPSectionProps) {
    const inst = assessmentKey === 'initial' 
        ? data.initial 
        : (data as any)[assessmentKey]?.instruments?.[instIdx as number];
        
    const config = inst?.instrument_config || {};
    const kktp = config.kktp || { approach: 'rubric' };
    const colors = assessmentColors[assessmentKey];
    
    const updateConfig = (field: string, value: any) => {
        if (assessmentKey === 'initial') updateInitialConfig(field, value);
        else if (assessmentKey === 'formative') updateFormativeConfig(instIdx as number, field, value);
        else updateSummativeConfig(instIdx as number, field, value);
    };

    const updateKKTP = (field: string, value: any) => {
        updateConfig('kktp', { ...kktp, [field]: value });
    };

    return (
        <div className="pt-6 mt-6 border-t border-border space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-md ${colors.bg} ${colors.text} border ${colors.border}`}>
                        <CheckSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h5 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground">Pendekatan KKTP</h5>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.05em]">Kriteria Ketercapaian</p>
                    </div>
                </div>
                
                <div className="flex bg-card text-card-foreground p-1 rounded-md border border-border overflow-x-auto no-scrollbar shrink-0">
                    {[
                        { id: 'criteria_description', name: 'Deskripsi', icon: AlignLeft },
                        { id: 'rubric', name: 'Rubrik', icon: Layers },
                        { id: 'score_interval', name: 'Interval', icon: Activity },
                        { id: 'percentage', name: 'Persentase', icon: Zap }
                    ].map(app => (
                        <button
                            key={app.id}
                            type="button"
                            onClick={() => updateKKTP('approach', app.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold transition-all whitespace-nowrap ${kktp.approach === app.id ? `text-black shadow-[0_0_8px_rgba(255,255,255,0.1)]` : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'}`}
                            style={kktp.approach === app.id ? { backgroundColor: colors.main } : {}}
                        >
                            <app.icon className="h-3 w-3" />
                            {app.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                {kktp.approach === 'criteria_description' && (
                    <div className="space-y-4">
                        <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                            <Info className={`h-4 w-4 ${colors.text} shrink-0 mt-0.5`} />
                            <p className="text-[12px] text-muted-foreground leading-relaxed">
                                <span className="font-semibold text-foreground">Deskripsi Kriteria:</span> Ketuntasan didasarkan pada jumlah indikator yang tercapai.
                            </p>
                        </div>
                        <div className="flex items-center gap-4 bg-card text-card-foreground p-4 rounded-md border border-border">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em]">Minimal Indikator:</label>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="number"
                                    min={1}
                                    max={(config.indicators?.length || config.questions?.length || 1)}
                                    value={kktp.min_criteria || 2}
                                    onChange={e => updateKKTP('min_criteria', parseInt(e.target.value))}
                                    className={`h-8 w-14 bg-popover border border-border rounded-md text-center font-mono text-[13px] text-foreground outline-none focus:border-[${colors.main}]`}
                                    style={kktp.min_criteria ? { borderColor: colors.main } : {}}
                                />
                                <span className="text-[11px] text-muted-foreground font-mono">/ {(config.indicators?.length || config.questions?.length || 0)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {kktp.approach === 'rubric' && (
                    <div className="space-y-4">
                        <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                            <Info className={`h-4 w-4 ${colors.text} shrink-0 mt-0.5`} />
                            <p className="text-[12px] text-muted-foreground leading-relaxed">
                                <span className="font-semibold text-foreground">Pendekatan Rubrik:</span> Tentukan level minimum pencapaian untuk dianggap tuntas.
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {config.levels?.map((lvl: any, lvlIdx: number) => (
                                <div 
                                    key={lvlIdx} 
                                    onClick={() => updateKKTP('passing_level', lvl.name)}
                                    className={`p-4 rounded-md border transition-all cursor-pointer relative group ${kktp.passing_level === lvl.name ? `bg-popover shadow-[0_0_12px_rgba(0,0,0,0.05)]` : 'bg-card text-card-foreground border-border hover:bg-muted/10 dark:hover:bg-muted/10'}`}
                                    style={kktp.passing_level === lvl.name ? { borderColor: colors.main } : {}}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <input 
                                            value={lvl.name}
                                            onChange={e => {
                                                const lvls = [...(config.levels || [])];
                                                lvls[lvlIdx] = { ...lvls[lvlIdx], name: e.target.value };
                                                updateConfig('levels', lvls);
                                            }}
                                            className={`w-full text-[11px] font-semibold uppercase tracking-wider bg-transparent border-none focus:ring-0 outline-none ${kktp.passing_level === lvl.name ? 'text-foreground' : 'text-muted-foreground'}`}
                                        />
                                        {kktp.passing_level === lvl.name && <CheckCircle2 className={`h-4 w-4 ${colors.text}`} />}
                                    </div>
                                    <textarea 
                                        value={lvl.desc}
                                        onChange={e => {
                                            const lvls = [...(config.levels || [])];
                                            lvls[lvlIdx] = { ...lvls[lvlIdx], desc: e.target.value };
                                            updateConfig('levels', lvls);
                                        }}
                                        rows={3}
                                        className="w-full bg-transparent text-[12px] text-muted-foreground leading-relaxed border-none focus:ring-0 outline-none resize-none p-0"
                                        placeholder="Deskripsi..."
                                    />
                                    {kktp.passing_level === lvl.name && (
                                        <div className={`absolute bottom-1.5 right-2.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${colors.text}`}>✓ Batas Tuntas</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {kktp.approach === 'score_interval' && (
                    <div className="space-y-4">
                        <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                            <Activity className={`h-4 w-4 ${colors.text} shrink-0 mt-0.5`} />
                            <p className="text-[12px] text-muted-foreground leading-relaxed">
                                <span className="font-semibold text-foreground">Interval Nilai:</span> Tetapkan rentang skor (0-100) untuk tindak lanjut.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            {(kktp.intervals || [
                                { min: 0, max: 40, label: 'Belum Mencapai', desc: 'Remedial seluruhnya' },
                                { min: 41, max: 60, label: 'Hampir Mencapai', desc: 'Remedial bagian tertentu' },
                                { min: 61, max: 80, label: 'Sudah Mencapai', desc: 'Tuntas' },
                                { min: 81, max: 100, label: 'Sudah Mencapai', desc: 'Pengayaan' }
                            ]).map((iv: any, ivIdx: number) => (
                                <div key={ivIdx} className="flex items-center gap-4 p-3 bg-card text-card-foreground rounded-md border border-border group">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number"
                                            value={iv.min}
                                            onChange={e => {
                                                const ivs = [...(kktp.intervals || [])];
                                                ivs[ivIdx] = { ...ivs[ivIdx], min: parseInt(e.target.value) };
                                                updateKKTP('intervals', ivs);
                                            }}
                                            className={`h-7 w-12 bg-popover border border-border rounded text-center text-[11px] font-mono text-foreground outline-none focus:border-[${colors.main}]`}
                                            style={iv.min !== undefined ? { borderColor: colors.main } : {}}
                                        />
                                        <span className="text-muted-foreground">-</span>
                                        <input 
                                            type="number"
                                            value={iv.max}
                                            onChange={e => {
                                                const ivs = [...(kktp.intervals || [])];
                                                ivs[ivIdx] = { ...ivs[ivIdx], max: parseInt(e.target.value) };
                                                updateKKTP('intervals', ivs);
                                            }}
                                            className="h-7 w-12 bg-popover border border-border rounded text-center text-[11px] font-mono text-foreground outline-none"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <input 
                                            value={iv.label}
                                            onChange={e => {
                                                const ivs = [...(kktp.intervals || [])];
                                                ivs[ivIdx] = { ...ivs[ivIdx], label: e.target.value };
                                                updateKKTP('intervals', ivs);
                                            }}
                                            className="bg-transparent text-[12px] font-semibold text-foreground border-none focus:ring-0 p-0"
                                        />
                                        <input 
                                            value={iv.desc}
                                            onChange={e => {
                                                const ivs = [...(kktp.intervals || [])];
                                                ivs[ivIdx] = { ...ivs[ivIdx], desc: e.target.value };
                                                updateKKTP('intervals', ivs);
                                            }}
                                            className="bg-transparent text-[11px] text-muted-foreground border-none focus:ring-0 p-0"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {kktp.approach === 'percentage' && (
                    <div className="space-y-4">
                        <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                            <Zap className={`h-4 w-4 ${colors.text} shrink-0 mt-0.5`} />
                            <p className="text-[12px] text-muted-foreground leading-relaxed">
                                <span className="font-semibold text-foreground">Persentase:</span> Rasio kriteria yang dicapai terhadap total.
                            </p>
                        </div>
                        <div className="flex items-center gap-4 bg-card text-card-foreground p-4 rounded-md border border-border">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em]">Ambang Batas:</label>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={kktp.threshold || 75}
                                    onChange={e => updateKKTP('threshold', parseInt(e.target.value))}
                                    className={`h-8 w-14 bg-popover border border-border rounded-md text-center font-mono text-[13px] text-foreground outline-none focus:border-[${colors.main}]`}
                                    style={kktp.threshold ? { borderColor: colors.main } : {}}
                                />
                                <span className="text-[11px] text-muted-foreground font-mono">%</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
