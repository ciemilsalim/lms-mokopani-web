import React from 'react';
import { 
    Target, Compass, Sparkles, Loader2, MessageSquare, ClipboardCheck, Eye 
} from 'lucide-react';
import { Instrument, ScoringTool } from './types';
import QuizBuilder from './QuizBuilder';
import ObservationBuilder from './ObservationBuilder';
import KKTPSection from './KKTPSection';

interface StepAssessmentInitialProps {
    data: any;
    setData: (key: any, value?: any) => void;
    instruments: Instrument[];
    scoringTools: ScoringTool[];
    processing: boolean;
    isSuggesting: boolean;
    handleAssessmentSuggest: (key: 'initial' | 'formative' | 'summative', type: string) => void;
    getDefaultKKTPApproach: (key: 'initial' | 'formative' | 'summative', type: string) => string;
    localErrors?: Record<string, string>;
}

export default function StepAssessmentInitial({
    data,
    setData,
    instruments,
    scoringTools,
    processing,
    isSuggesting,
    handleAssessmentSuggest,
    getDefaultKKTPApproach,
    localErrors,
}: StepAssessmentInitialProps) {
    
    const initialConfig = data.initial?.instrument_config || {};

    const updateInitialConfig = (field: string, value: any) => {
        setData('initial', {
            ...data.initial,
            instrument_config: {
                ...initialConfig,
                [field]: value
            }
        });
    };

    const handleEnableToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData('initial', {
            ...data.initial,
            enabled: e.target.checked
        });
    };

    return (
        <div className="bg-card text-card-foreground p-6 rounded-xl border border-border space-y-6">
            {/* Header with Switch */}
            <div className="flex items-start gap-4 pb-4 border-b border-border">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Target className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground">Asesmen Awal (Diagnostik)</h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={data.initial.enabled}
                                onChange={handleEnableToggle}
                            />
                            <div className="w-9 h-5 bg-border/40 dark:bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Pemetaan kesiapan murid sebelum memulai materi baru.</p>
                </div>
            </div>

            {!data.initial.enabled ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/50 dark:bg-card/30 rounded-lg border border-dashed border-border">
                    <div className="h-12 w-12 rounded-full bg-border/50 dark:bg-border/50 flex items-center justify-center mb-4">
                        <Target className="h-6 w-6 opacity-20" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em]">Asesmen Awal Dinonaktifkan</p>
                    <p className="text-[10px] mt-1 opacity-50">Aktifkan switch di atas untuk mulai merancang.</p>
                </div>
            ) : (
                <div className="grid gap-8 lg:grid-cols-12">
                    {/* Left Column: Instrument Selection */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="space-y-3">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">
                                Pilih Instrumen
                            </label>
                            <div className="grid gap-2">
                                {instruments.map((type) => {
                                    const Icon = type.icon === 'message-square' 
                                        ? MessageSquare 
                                        : (type.icon === 'clipboard-check' ? ClipboardCheck : Eye);
                                    
                                    const isSelected = data.initial.instrument_type === type.id;

                                    return (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => {
                                                const defaultApproach = getDefaultKKTPApproach('initial', type.id);
                                                setData('initial', { 
                                                    ...data.initial, 
                                                    instrument_type: type.id,
                                                    instrument_config: {
                                                        ...initialConfig,
                                                        kktp: {
                                                            ...initialConfig?.kktp,
                                                            approach: defaultApproach
                                                        }
                                                    }
                                                });
                                                handleAssessmentSuggest('initial', type.id);
                                            }}
                                            className={`flex items-center gap-3 p-3 rounded-md border transition-all duration-150 ${
                                                isSelected 
                                                ? 'border-primary/50 bg-primary/10 shadow-[0_0_12px_rgba(94,106,210,0.15)]' 
                                                : localErrors?.['initial.instrument_type']
                                                ? 'border-red-500 bg-red-500/5 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
                                                : 'border-border bg-card dark:bg-popover hover:border-[#8A8F98]/30'
                                            }`}
                                        >
                                            <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                                                isSelected ? 'bg-primary text-white shadow-[0_0_12px_rgba(94,106,210,0.15)]' : 'bg-muted/50 dark:bg-border/60 text-muted-foreground'
                                            }`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="text-left">
                                                <p className={`text-[12px] font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {type.name}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Judul Asesmen</label>
                                <input 
                                    value={data.initial.title || ''}
                                    onChange={e => setData('initial', { ...data.initial, title: e.target.value })}
                                    placeholder="Contoh: Pemetaan Mandiri Array"
                                    className={`h-8 w-full bg-card text-card-foreground border rounded-md px-3 text-[12px] text-foreground outline-none transition ${localErrors?.['initial.title'] ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' : 'border-border focus:border-primary'}`}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Batas Waktu</label>
                                <input 
                                    type="date"
                                    value={data.initial.due_date || ''}
                                    onChange={e => setData('initial', { ...data.initial, due_date: e.target.value })}
                                    className={`h-8 w-full bg-card text-card-foreground border rounded-md px-3 text-[12px] text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark] transition ${localErrors?.['initial.due_date'] ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' : 'border-border focus:border-primary'}`}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Alat Penskoran (Opsional)</label>
                                <select 
                                    value={data.initial.scoring_tool || ''}
                                    onChange={e => setData('initial', { ...data.initial, scoring_tool: e.target.value || null })}
                                    className="h-8 w-full bg-card text-card-foreground border border-border rounded-md px-3 text-[12px] text-foreground outline-none focus:border-primary transition"
                                >
                                    <option value="">-- Tanpa Alat Penskoran --</option>
                                    {scoringTools.map(tool => (
                                        <option key={tool.id} value={tool.id}>{tool.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleAssessmentSuggest('initial', data.initial.instrument_type)}
                                disabled={!data.initial.instrument_type || isSuggesting}
                                className="w-full flex items-center justify-center gap-2 h-9 rounded bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-[0.05em] hover:bg-primary/20 transition-all disabled:opacity-50 border border-primary/20"
                            >
                                {isSuggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                Saran AI
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Config Area */}
                    <div className="lg:col-span-8 bg-popover/30 rounded-md p-4 sm:p-6 border border-border">
                        {!data.initial.instrument_type ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 py-12">
                                <Compass className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-[11px] font-semibold uppercase tracking-[0.05em]">Pilih instrumen di kiri</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-primary">
                                        Konfigurasi: {instruments.find(i => i.id === data.initial.instrument_type)?.name}
                                    </h4>
                                    <div className="h-px flex-1 bg-border"></div>
                                </div>

                                {data.initial.instrument_type === 'oral_qa' && (
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">
                                            Stimulus / Pertanyaan Lisan
                                        </label>
                                        <textarea 
                                            value={initialConfig.stimulus || ''}
                                            onChange={e => updateInitialConfig('stimulus', e.target.value)}
                                            rows={6}
                                            placeholder="Tuliskan daftar pertanyaan pemantik atau skenario tanya jawab di sini..."
                                            className="w-full bg-card text-card-foreground rounded-md p-4 text-[13px] text-foreground border border-border focus:border-primary outline-none resize-none leading-relaxed transition-all duration-150"
                                        />
                                    </div>
                                )}

                                {data.initial.instrument_type === 'quiz_survey' && (
                                    <QuizBuilder
                                        assessmentKey="initial"
                                        instIdx={null}
                                        data={data}
                                        updateInitialConfig={updateInitialConfig}
                                        updateFormativeConfig={() => {}}
                                        updateSummativeConfig={() => {}}
                                    />
                                )}

                                {data.initial.instrument_type === 'observation_checklist' && (
                                    <ObservationBuilder
                                        assessmentKey="initial"
                                        instIdx={null}
                                        data={data}
                                        updateInitialConfig={updateInitialConfig}
                                        updateFormativeConfig={() => {}}
                                        updateSummativeConfig={() => {}}
                                    />
                                )}

                                <KKTPSection
                                    assessmentKey="initial"
                                    instIdx={null}
                                    data={data}
                                    updateInitialConfig={updateInitialConfig}
                                    updateFormativeConfig={() => {}}
                                    updateSummativeConfig={() => {}}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
