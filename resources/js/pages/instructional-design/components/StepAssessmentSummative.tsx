import React, { useState } from 'react';
import { 
    Layers, Trash2, Plus, Sparkles, Loader2, Compass, Info,
    MessageSquare, ClipboardCheck, Eye, Star, Activity, Clock
} from 'lucide-react';
import { Instrument, ScoringTool } from './types';
import QuizBuilder from './QuizBuilder';
import ObservationBuilder from './ObservationBuilder';
import KKTPSection from './KKTPSection';

interface StepAssessmentSummativeProps {
    data: any;
    setData: (key: any, value?: any) => void;
    instruments: Instrument[];
    scoringTools: ScoringTool[];
    processing: boolean;
    isSuggesting: boolean;
    handleAssessmentSuggest: (key: 'initial' | 'formative' | 'summative', type: string, instIdx?: number) => void;
    getDefaultKKTPApproach: (key: 'initial' | 'formative' | 'summative', type: string) => string;
    localErrors?: Record<string, string>;
}

export default function StepAssessmentSummative({
    data,
    setData,
    instruments,
    scoringTools,
    processing,
    isSuggesting,
    handleAssessmentSuggest,
    getDefaultKKTPApproach,
    localErrors,
}: StepAssessmentSummativeProps) {
    const [activeTab, setActiveTab] = useState<number>(0);
    const sumInstances = data.summative?.instruments || [];

    const addInstrument = () => {
        const defaultType = instruments[0]?.id || 'written_test';
        const defaultApproach = getDefaultKKTPApproach('summative', defaultType);

        const newInst = {
            id: 'sum_' + Math.random().toString(36).substr(2, 9),
            title: 'Asesmen Sumatif ' + (sumInstances.length + 1),
            instrument_type: defaultType,
            scoring_tool: '',
            due_date: '',
            instrument_config: {
                stimulus: '',
                criteria: [
                    { id: 'c1', text: '', weight: 30, descriptions: {} as Record<string, string> },
                    { id: 'c2', text: '', weight: 40, descriptions: {} as Record<string, string> },
                    { id: 'c3', text: '', weight: 30, descriptions: {} as Record<string, string> }
                ],
                questions: [],
                indicators: [],
                teacher_notes: '',
                phase_planning: '',
                phase_execution: '',
                phase_product: '',
                levels: [
                    { id: 'l1', name: 'Perlu Bimbingan', desc: '', score: 25 },
                    { id: 'l2', name: 'Cukup', desc: '', score: 50 },
                    { id: 'l3', name: 'Baik', desc: '', score: 75 },
                    { id: 'l4', name: 'Sangat Baik', desc: '', score: 100 }
                ],
                kktp: {
                    approach: defaultApproach
                }
            }
        };

        setData('summative', {
            ...data.summative,
            instruments: [...sumInstances, newInst]
        });
        setActiveTab(sumInstances.length);
    };

    const removeInstrument = (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = sumInstances.filter((_: any, i: number) => i !== idx);
        setData('summative', {
            ...data.summative,
            instruments: updated
        });
        if (activeTab >= updated.length && updated.length > 0) {
            setActiveTab(updated.length - 1);
        }
    };

    const updateInstrumentField = (idx: number, field: string, value: any) => {
        const updated = [...sumInstances];
        updated[idx] = { ...updated[idx], [field]: value };
        setData('summative', {
            ...data.summative,
            instruments: updated
        });
    };

    const updateSummativeConfig = (idx: number, field: string, value: any) => {
        const updated = [...sumInstances];
        updated[idx] = {
            ...updated[idx],
            instrument_config: {
                ...updated[idx].instrument_config,
                [field]: value
            }
        };
        setData('summative', {
            ...data.summative,
            instruments: updated
        });
    };

    const activeInst = sumInstances[activeTab];
    const activeConfig = activeInst?.instrument_config || {};

    const getIconComponent = (iconName: string) => {
        switch (iconName) {
            case 'message-square': return MessageSquare;
            case 'clipboard-check': return ClipboardCheck;
            case 'eye': return Eye;
            case 'star': return Star;
            case 'clock': return Clock;
            default: return Layers;
        }
    };

    return (
        <div className="bg-card text-card-foreground p-6 rounded-xl border border-border space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Layers className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">Asesmen Sumatif</h3>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.05em]">Evaluasi Akhir Capaian Kompetensi Belajar</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={addInstrument}
                    className="h-7 px-3 rounded-lg bg-primary text-white text-[11px] font-bold uppercase tracking-wider shadow hover:bg-primary-hover flex items-center gap-1.5 transition-all"
                >
                    <Plus className="h-3.5 w-3.5" /> Tambah Instrumen
                </button>
            </div>

            {sumInstances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/50 dark:bg-card/30 rounded-lg border border-dashed border-border">
                    <Layers className="h-10 w-10 opacity-20 mb-3" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em]">Belum Ada Asesmen Sumatif</p>
                    <p className="text-[10px] mt-1 opacity-50">Klik tombol "Tambah Instrumen" untuk mulai membuat penilaian hasil akhir.</p>
                </div>
            ) : (
                <div className="grid gap-8 lg:grid-cols-12">
                    {/* Left Column: Instruments Tabs */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                            {sumInstances.map((inst: any, idx: number) => {
                                const selectedType = instruments.find(i => i.id === inst.instrument_type);
                                const Icon = getIconComponent(selectedType?.icon || '');
                                const hasError = !!(localErrors?.[`summative.instruments.${idx}.title`] || localErrors?.[`summative.instruments.${idx}.due_date`]);

                                return (
                                    <button
                                        key={inst.id}
                                        type="button"
                                        onClick={() => setActiveTab(idx)}
                                        className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                                            activeTab === idx 
                                            ? hasError 
                                                ? 'border-red-500 bg-red-500/10 shadow-sm'
                                                : 'border-primary/50 bg-primary/10 shadow-sm' 
                                            : hasError
                                                ? 'border-red-500/60 bg-red-500/5 hover:border-red-500/85'
                                                : 'border-border bg-card dark:bg-popover hover:border-primary/20'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`h-7 w-7 rounded flex items-center justify-center ${activeTab === idx ? (hasError ? 'bg-red-500 text-white' : 'bg-primary text-white') : (hasError ? 'bg-red-500/20 text-red-500' : 'bg-muted/50 dark:bg-border/60 text-muted-foreground')}`}>
                                                <Icon className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-[12px] font-bold truncate ${hasError ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{inst.title || 'Tanpa Judul'}</p>
                                                <p className={`text-[9px] font-semibold uppercase tracking-tight truncate ${hasError ? 'text-red-500/75 dark:text-red-400/75' : 'text-muted-foreground'}`}>
                                                    {selectedType?.name || 'Pilih Tipe'}
                                                </p>
                                            </div>
                                        </div>
                                        {sumInstances.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={(e) => removeInstrument(idx, e)}
                                                className={`transition-colors p-1 ${hasError ? 'text-red-500/55 hover:text-red-600' : 'text-muted-foreground/30 hover:text-red-500'}`}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Metadata inputs for Active Instrument */}
                        <div className="space-y-4 pt-4 border-t border-border">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Judul Asesmen</label>
                                <input
                                    value={activeInst.title || ''}
                                    onChange={e => updateInstrumentField(activeTab, 'title', e.target.value)}
                                    placeholder="Contoh: Tes Akhir Bab"
                                    className={`h-8 w-full bg-card text-card-foreground border rounded-md px-3 text-[12px] text-foreground outline-none transition ${localErrors?.[`summative.instruments.${activeTab}.title`] ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' : 'border-border focus:border-primary'}`}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Batas Waktu</label>
                                <input
                                    type="date"
                                    value={activeInst.due_date || ''}
                                    onChange={e => updateInstrumentField(activeTab, 'due_date', e.target.value)}
                                    className={`h-8 w-full bg-card text-card-foreground border rounded-md px-3 text-[12px] text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark] transition ${localErrors?.[`summative.instruments.${activeTab}.due_date`] ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' : 'border-border focus:border-primary'}`}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Alat Penskoran (Opsional)</label>
                                <select
                                    value={activeInst.scoring_tool || ''}
                                    onChange={e => updateInstrumentField(activeTab, 'scoring_tool', e.target.value || null)}
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
                                onClick={() => handleAssessmentSuggest('summative', activeInst.instrument_type, activeTab)}
                                disabled={!activeInst.instrument_type || isSuggesting}
                                className="w-full flex items-center justify-center gap-2 h-9 rounded bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-[0.05em] hover:bg-primary/20 transition-all disabled:opacity-50 border border-primary/20"
                            >
                                {isSuggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                Saran AI
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Instrument Form & Builder */}
                    <div className="lg:col-span-8 bg-popover/30 rounded-md p-4 sm:p-6 border border-border">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Jenis Asesmen Sumatif</label>
                                    <select
                                        value={activeInst.instrument_type || 'written_test'}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            const defaultApproach = getDefaultKKTPApproach('summative', type);
                                            updateInstrumentField(activeTab, 'instrument_type', type);
                                            updateSummativeConfig(activeTab, 'kktp', {
                                                ...activeConfig.kktp,
                                                approach: defaultApproach
                                            });
                                            handleAssessmentSuggest('summative', type, activeTab);
                                        }}
                                        className="h-8 rounded border border-border bg-popover text-foreground px-3 text-[12px] font-semibold outline-none focus:border-primary transition"
                                    >
                                        {instruments.map(i => (
                                            <option key={i.id} value={i.id}>{i.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="h-8 flex-1 border-b border-border self-end"></div>
                            </div>

                            {/* Dynamically render configuration inputs depending on instrument type */}
                            {activeInst.instrument_type === 'rubric' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Stimulus / Konteks Kasus</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateSummativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={4}
                                            placeholder="Tuliskan stimulus atau contoh kasus..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Nama Kriteria</label>
                                        <input
                                            value={activeConfig.criteria || ''}
                                            onChange={e => updateSummativeConfig(activeTab, 'criteria', e.target.value)}
                                            placeholder="Contoh: Kemampuan menulis kode program"
                                            className="w-full h-8 bg-card text-card-foreground rounded border border-border px-3 text-[12px] focus:border-primary outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeInst.instrument_type === 'oral_test' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Topik / Konteks Tes Lisan</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateSummativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={3}
                                            placeholder="Tuliskan topik atau konteks pertanyaan lisan..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em]">Daftar Pertanyaan Lisan</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const qs = [...(activeConfig.questions || [])];
                                                    qs.push({ text: '', answer_guide: '' });
                                                    updateSummativeConfig(activeTab, 'questions', qs);
                                                }}
                                                className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 rounded transition"
                                            >
                                                + Tambah Pertanyaan
                                            </button>
                                        </div>
                                        <div className="grid gap-3">
                                            {(activeConfig.questions || []).map((q: any, qIdx: number) => (
                                                <div key={qIdx} className="p-3 bg-card rounded border border-border space-y-2 group">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono text-muted-foreground">{qIdx + 1}.</span>
                                                        <input
                                                            value={q.text || ''}
                                                            onChange={e => {
                                                                const qs = [...(activeConfig.questions || [])];
                                                                qs[qIdx] = { ...qs[qIdx], text: e.target.value };
                                                                updateSummativeConfig(activeTab, 'questions', qs);
                                                            }}
                                                            placeholder="Tuliskan pertanyaan lisan..."
                                                            className="flex-1 bg-transparent text-[12px] font-semibold border-none outline-none focus:ring-0 p-0"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const qs = (activeConfig.questions || []).filter((_: any, idx: number) => idx !== qIdx);
                                                                updateSummativeConfig(activeTab, 'questions', qs);
                                                            }}
                                                            className="text-muted-foreground/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                    <input
                                                        value={q.answer_guide || ''}
                                                        onChange={e => {
                                                            const qs = [...(activeConfig.questions || [])];
                                                            qs[qIdx] = { ...qs[qIdx], answer_guide: e.target.value };
                                                            updateSummativeConfig(activeTab, 'questions', qs);
                                                        }}
                                                        placeholder="Kunci Jawaban / Pedoman Penskoran..."
                                                        className="w-full bg-popover/50 text-[11px] text-muted-foreground rounded border border-border px-3 py-2 focus:border-primary outline-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(activeInst.instrument_type === 'quiz_survey' || activeInst.instrument_type === 'written_test') && (
                                <QuizBuilder
                                    assessmentKey="summative"
                                    instIdx={activeTab}
                                    data={data}
                                    updateInitialConfig={() => {}}
                                    updateFormativeConfig={() => {}}
                                    updateSummativeConfig={updateSummativeConfig}
                                />
                            )}

                            {(activeInst.instrument_type === 'observation_checklist' || activeInst.instrument_type === 'performance') && (
                                <div className="space-y-4">
                                    {activeConfig.stimulus !== undefined && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Stimulus / Konteks Observasi</label>
                                            <textarea
                                                value={activeConfig.stimulus || ''}
                                                onChange={e => updateSummativeConfig(activeTab, 'stimulus', e.target.value)}
                                                rows={3}
                                                placeholder="Tuliskan stimulus atau konteks unjuk kerja..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                            />
                                        </div>
                                    )}
                                    <ObservationBuilder
                                        assessmentKey="summative"
                                        instIdx={activeTab}
                                        data={data}
                                        updateInitialConfig={() => {}}
                                        updateFormativeConfig={() => {}}
                                        updateSummativeConfig={updateSummativeConfig}
                                    />
                                    {activeConfig.teacher_notes !== undefined && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Catatan Tindak Lanjut Guru</label>
                                            <textarea
                                                value={activeConfig.teacher_notes || ''}
                                                onChange={e => updateSummativeConfig(activeTab, 'teacher_notes', e.target.value)}
                                                rows={2}
                                                placeholder="Tahapan evaluasi..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none italic"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeInst.instrument_type === 'project' && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Pertanyaan Utama (Driving Question)</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateSummativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={2}
                                            placeholder="Bagaimana kita bisa menggunakan..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] text-foreground focus:border-primary outline-none resize-none font-semibold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Alur & Instruksi</label>
                                        <textarea
                                            value={activeConfig.teacher_notes || ''}
                                            onChange={e => updateSummativeConfig(activeTab, 'teacher_notes', e.target.value)}
                                            rows={3}
                                            placeholder="Tahapan projek..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] text-foreground focus:border-primary outline-none resize-none italic"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="h-5 w-5 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px] font-mono">03</div>
                                            <h6 className="text-[11px] font-semibold uppercase text-foreground tracking-[0.05em]">Fokus Penilaian Tahapan</h6>
                                        </div>
                                        <div className="grid sm:grid-cols-3 gap-3">
                                            {[
                                                { key: 'phase_planning', label: 'Perencanaan', icon: Compass },
                                                { key: 'phase_execution', label: 'Pelaksanaan', icon: Activity },
                                                { key: 'phase_product', label: 'Produk/Hasil', icon: Star }
                                            ].map(phase => {
                                                const Icon = phase.icon;
                                                return (
                                                    <div key={phase.key} className="p-3.5 bg-card rounded-lg border border-border flex flex-col gap-2 relative">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center">
                                                                 <Icon className="h-3.5 w-3.5" />
                                                            </div>
                                                            <span className="text-[11px] font-bold text-foreground">{phase.label}</span>
                                                        </div>
                                                        <textarea
                                                            value={(activeConfig as any)?.[phase.key] || ''}
                                                            onChange={e => updateSummativeConfig(activeTab, phase.key, e.target.value)}
                                                            rows={3}
                                                            placeholder={`Fokus evaluasi tahap ${phase.label.toLowerCase()}...`}
                                                            className="w-full bg-transparent text-[11.5px] text-muted-foreground leading-relaxed border-none focus:ring-0 resize-none p-0"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeInst.instrument_type === 'concept_map' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Instruksi Penilaian</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateSummativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={4}
                                            placeholder="Tuliskan petunjuk penugasan peta konsep/portofolio..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                        />
                                    </div>
                                    {activeConfig.teacher_notes !== undefined && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Catatan Evaluasi / Rubrik Guru</label>
                                            <textarea
                                                value={activeConfig.teacher_notes || ''}
                                                onChange={e => updateSummativeConfig(activeTab, 'teacher_notes', e.target.value)}
                                                rows={2}
                                                placeholder="Langkah evaluasi dan pembobotan..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none italic"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeInst.instrument_type === 'portfolio' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Instruksi Pengumpulan Portofolio</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateSummativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={4}
                                            placeholder="Tuliskan instruksi pengumpulan portofolio: apa yang harus dikumpulkan, format, dan kriteria..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em]">Pertanyaan Refleksi</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const prompts = [...(activeConfig.reflection_prompts || [])];
                                                    prompts.push('');
                                                    updateSummativeConfig(activeTab, 'reflection_prompts', prompts);
                                                }}
                                                className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 rounded transition"
                                            >
                                                + Tambah Pertanyaan
                                            </button>
                                        </div>
                                        <div className="grid gap-2">
                                            {(activeConfig.reflection_prompts || []).map((prompt: string, pIdx: number) => (
                                                <div key={pIdx} className="flex gap-2 items-center p-2 bg-card rounded border border-border group">
                                                    <span className="text-[10px] font-mono text-muted-foreground">{pIdx + 1}.</span>
                                                    <input
                                                        value={prompt || ''}
                                                        onChange={e => {
                                                            const prompts = [...(activeConfig.reflection_prompts || [])];
                                                            prompts[pIdx] = e.target.value;
                                                            updateSummativeConfig(activeTab, 'reflection_prompts', prompts);
                                                        }}
                                                        placeholder="Pertanyaan refleksi (misal: Karya mana yang paling kamu banggakan dan mengapa?)"
                                                        className="flex-1 bg-transparent text-[12px] border-none outline-none focus:ring-0 p-0"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const prompts = (activeConfig.reflection_prompts || []).filter((_: string, idx: number) => idx !== pIdx);
                                                            updateSummativeConfig(activeTab, 'reflection_prompts', prompts);
                                                        }}
                                                        className="text-muted-foreground/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {activeConfig.teacher_notes !== undefined && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Catatan Evaluasi / Rubrik Guru</label>
                                            <textarea
                                                value={activeConfig.teacher_notes || ''}
                                                onChange={e => updateSummativeConfig(activeTab, 'teacher_notes', e.target.value)}
                                                rows={2}
                                                placeholder="Langkah evaluasi dan pembobotan..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none italic"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeInst.instrument_type === 'assignment' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Deskripsi Studi Kasus / Topik Laporan</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateSummativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={4}
                                            placeholder="Tuliskan deskripsi studi kasus atau topik laporan yang harus dianalisis siswa..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Indikator Penilaian</label>
                                    </div>
                                    <ObservationBuilder
                                        assessmentKey="summative"
                                        instIdx={activeTab}
                                        data={data}
                                        updateInitialConfig={() => {}}
                                        updateFormativeConfig={() => {}}
                                        updateSummativeConfig={updateSummativeConfig}
                                        observationMode="checklist"
                                    />

                                    {activeConfig.teacher_notes !== undefined && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Catatan Evaluasi / Rubrik Guru</label>
                                            <textarea
                                                value={activeConfig.teacher_notes || ''}
                                                onChange={e => updateSummativeConfig(activeTab, 'teacher_notes', e.target.value)}
                                                rows={2}
                                                placeholder="Langkah evaluasi dan pembobotan..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none italic"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <KKTPSection
                                assessmentKey="summative"
                                instIdx={activeTab}
                                data={data}
                                updateInitialConfig={() => {}}
                                updateFormativeConfig={() => {}}
                                updateSummativeConfig={updateSummativeConfig}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
