import React, { useState } from 'react';
import { 
    Activity, Trash2, Plus, Sparkles, Loader2, Compass, Info,
    MessageSquare, ClipboardCheck, Eye, Star, Clock, FileText, Layers, TrendingUp
} from 'lucide-react';
import { Instrument, ScoringTool } from './types';
import QuizBuilder from './QuizBuilder';
import ObservationBuilder from './ObservationBuilder';
import ContinuumBuilder from './ContinuumBuilder';
import KKTPSection from './KKTPSection';

interface StepAssessmentFormativeProps {
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

export default function StepAssessmentFormative({
    data,
    setData,
    instruments,
    scoringTools,
    processing,
    isSuggesting,
    handleAssessmentSuggest,
    getDefaultKKTPApproach,
    localErrors,
}: StepAssessmentFormativeProps) {
    const [activeTab, setActiveTab] = useState<number>(0);
    const formInstances = data.formative?.instruments || [];

    const addInstrument = () => {
        const defaultType = instruments[0]?.id || 'formative_quiz';
        const defaultApproach = getDefaultKKTPApproach('formative', defaultType);

        const newInst = {
            id: 'form_' + Math.random().toString(36).substr(2, 9),
            title: 'Asesmen Formatif ' + (formInstances.length + 1),
            instrument_type: defaultType,
            scoring_tool: '',
            due_date: '',
            instrument_config: {
                stimulus: '',
                criteria: '',
                questions: [],
                indicators: [],
                levels: [
                    { name: 'Perlu Bimbingan', desc: '' },
                    { name: 'Cukup', desc: '' },
                    { name: 'Baik', desc: '' },
                    { name: 'Sangat Baik', desc: '' }
                ],
                kktp: {
                    approach: defaultApproach
                }
            }
        };

        setData('formative', {
            ...data.formative,
            instruments: [...formInstances, newInst]
        });
        setActiveTab(formInstances.length);
    };

    const removeInstrument = (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = formInstances.filter((_: any, i: number) => i !== idx);
        setData('formative', {
            ...data.formative,
            instruments: updated
        });
        if (activeTab >= updated.length && updated.length > 0) {
            setActiveTab(updated.length - 1);
        }
    };

    const updateInstrumentField = (idx: number, field: string, value: any) => {
        const updated = [...formInstances];
        updated[idx] = { ...updated[idx], [field]: value };
        setData('formative', {
            ...data.formative,
            instruments: updated
        });
    };

    const updateFormativeConfig = (idx: number, field: string, value: any) => {
        const updated = [...formInstances];
        updated[idx] = {
            ...updated[idx],
            instrument_config: {
                ...updated[idx].instrument_config,
                [field]: value
            }
        };
        setData('formative', {
            ...data.formative,
            instruments: updated
        });
    };

    const activeInst = formInstances[activeTab];
    const activeConfig = activeInst?.instrument_config || {};

    const getIconComponent = (iconName: string) => {
        switch (iconName) {
            case 'message-square': return MessageSquare;
            case 'clipboard-check': return ClipboardCheck;
            case 'eye': return Eye;
            case 'star': return Star;
            case 'clock': return Clock;
            default: return Activity;
        }
    };

    return (
        <div className="bg-card text-card-foreground p-6 rounded-xl border border-border space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Activity className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">Asesmen Formatif</h3>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.05em]">Evaluasi Proses & Pemantauan Belajar Berkala</p>
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

            {formInstances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/50 dark:bg-card/30 rounded-lg border border-dashed border-border">
                    <Activity className="h-10 w-10 opacity-20 mb-3" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em]">Belum Ada Asesmen Formatif</p>
                    <p className="text-[10px] mt-1 opacity-50">Klik tombol "Tambah Instrumen" untuk mulai membuat penilaian proses.</p>
                </div>
            ) : (
                <div className="grid gap-8 lg:grid-cols-12">
                    {/* Left Column: Instruments Tabs */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                             {formInstances.map((inst: any, idx: number) => {
                                const selectedType = instruments.find(i => i.id === inst.instrument_type);
                                const Icon = getIconComponent(selectedType?.icon || '');
                                const hasError = !!(localErrors?.[`formative.instruments.${idx}.title`] || localErrors?.[`formative.instruments.${idx}.due_date`]);

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
                                        {formInstances.length > 1 && (
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
                                    placeholder="Contoh: Kuis Logika Array"
                                    className={`h-8 w-full bg-card text-card-foreground border rounded-md px-3 text-[12px] text-foreground outline-none transition ${localErrors?.[`formative.instruments.${activeTab}.title`] ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' : 'border-border focus:border-primary'}`}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Batas Waktu</label>
                                <input
                                    type="date"
                                    value={activeInst.due_date || ''}
                                    onChange={e => updateInstrumentField(activeTab, 'due_date', e.target.value)}
                                    className={`h-8 w-full bg-card text-card-foreground border rounded-md px-3 text-[12px] text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark] transition ${localErrors?.[`formative.instruments.${activeTab}.due_date`] ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' : 'border-border focus:border-primary'}`}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => handleAssessmentSuggest('formative', activeInst.instrument_type, activeTab)}
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
                                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Jenis Asesmen Formatif</label>
                                    <select
                                        value={activeInst.instrument_type || 'rubric'}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            const defaultApproach = getDefaultKKTPApproach('formative', type);
                                            updateInstrumentField(activeTab, 'instrument_type', type);
                                            
                                            // Pre-populate default reflective questions if empty
                                            let defaultQuestions: any[] = [];
                                            if (type === 'reflective_journal') {
                                                defaultQuestions = [
                                                    { text: 'Apa konsep paling menarik yang saya pelajari bab ini?' },
                                                    { text: 'Di bagian mana saya merasa kesulitan atau melakukan kesalahan?' },
                                                    { text: 'Apa strategi yang akan saya lakukan untuk memperbaiki kesalahan tersebut?' }
                                                ];
                                            } else if (type === 'exit_ticket') {
                                                defaultQuestions = [
                                                    { text: 'Tuliskan 1 hal yang paling kamu pahami pada pelajaran hari ini.' },
                                                    { text: 'Tuliskan 1 hal yang masih membingungkan atau belum kamu pahami.' }
                                                ];
                                            }

                                            // Pre-populate default indicators if empty
                                            let defaultIndicators: any[] = [];
                                            if (type === 'self_assessment') {
                                                defaultIndicators = [
                                                    { name: 'Saya berkontribusi aktif mencari materi saat diskusi kelompok.' },
                                                    { name: 'Saya mendengarkan pendapat teman dengan menghargai.' },
                                                    { name: 'Saya fokus menyelesaikan tugas bagian saya tepat waktu.' }
                                                ];
                                            } else if (type === 'peer_assessment') {
                                                defaultIndicators = [
                                                    { name: 'Teman saya berkontribusi aktif mencari materi saat diskusi kelompok.' },
                                                    { name: 'Teman saya mendengarkan pendapat orang lain dengan menghargai.' },
                                                    { name: 'Teman saya bersedia membantu anggota kelompok lain yang kesulitan.' }
                                                ];
                                            }

                                            const updated = [...formInstances];
                                            updated[activeTab] = {
                                                ...updated[activeTab],
                                                instrument_type: type,
                                                instrument_config: {
                                                    ...updated[activeTab].instrument_config,
                                                    kktp: {
                                                        ...updated[activeTab].instrument_config?.kktp,
                                                        approach: defaultApproach
                                                    },
                                                    questions: (updated[activeTab].instrument_config?.questions?.length > 0) 
                                                        ? updated[activeTab].instrument_config.questions 
                                                        : defaultQuestions,
                                                    indicators: (updated[activeTab].instrument_config?.indicators?.length > 0)
                                                        ? updated[activeTab].instrument_config.indicators
                                                        : defaultIndicators
                                                }
                                            };
                                            setData('formative', {
                                                ...data.formative,
                                                instruments: updated
                                            });

                                            handleAssessmentSuggest('formative', type, activeTab);
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
                            {(activeInst.instrument_type === 'rubric' || activeInst.instrument_type === 'oral_qa') && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Stimulus / Konteks Kasus</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateFormativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={4}
                                            placeholder="Tuliskan stimulus atau contoh kasus..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Nama Kriteria</label>
                                        <input
                                            value={activeConfig.criteria || ''}
                                            onChange={e => updateFormativeConfig(activeTab, 'criteria', e.target.value)}
                                            placeholder="Contoh: Kemampuan menulis kode program"
                                            className="w-full h-8 bg-card text-card-foreground rounded border border-border px-3 text-[12px] focus:border-primary outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {(activeInst.instrument_type === 'quiz_survey' || activeInst.instrument_type === 'written_test') && (
                                <QuizBuilder
                                    assessmentKey="formative"
                                    instIdx={activeTab}
                                    data={data}
                                    updateInitialConfig={() => {}}
                                    updateFormativeConfig={updateFormativeConfig}
                                    updateSummativeConfig={() => {}}
                                />
                            )}

                            {activeInst.instrument_type === 'formative_quiz' && (
                                <div className="space-y-4">
                                    <div className="flex gap-1 p-1 bg-card rounded-lg border border-border">
                                        <button
                                            type="button"
                                            onClick={() => updateFormativeConfig(activeTab, 'assessment_mode', 'rubrik')}
                                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                (activeConfig.assessment_mode || 'rubrik') === 'rubrik'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <Layers className="h-3.5 w-3.5" /> Rubrik
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateFormativeConfig(activeTab, 'assessment_mode', 'checklist')}
                                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                activeConfig.assessment_mode === 'checklist'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <ClipboardCheck className="h-3.5 w-3.5" /> Ceklis Jawaban
                                        </button>
                                    </div>

                                    {(activeConfig.assessment_mode || 'rubrik') === 'rubrik' ? (
                                        <QuizBuilder
                                            assessmentKey="formative"
                                            instIdx={activeTab}
                                            data={data}
                                            updateInitialConfig={() => {}}
                                            updateFormativeConfig={updateFormativeConfig}
                                            updateSummativeConfig={() => {}}
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                                                <ClipboardCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                <p className="text-[12px] text-muted-foreground leading-relaxed">
                                                    <span className="font-semibold text-foreground">Ceklis Jawaban:</span> Buat daftar pertanyaan singkat. Siswa menandai apakah mereka bisa menjawab setiap pertanyaan.
                                                </p>
                                            </div>
                                            <ObservationBuilder
                                                assessmentKey="formative"
                                                instIdx={activeTab}
                                                data={data}
                                                updateInitialConfig={() => {}}
                                                updateFormativeConfig={updateFormativeConfig}
                                                updateSummativeConfig={() => {}}
                                                observationMode="checklist"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {(activeInst.instrument_type === 'observation_checklist') && (
                                <div className="space-y-4">
                                    {activeConfig.stimulus !== undefined && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Stimulus / Konteks Observasi</label>
                                            <textarea
                                                value={activeConfig.stimulus || ''}
                                                onChange={e => updateFormativeConfig(activeTab, 'stimulus', e.target.value)}
                                                rows={3}
                                                placeholder="Tuliskan stimulus atau konteks unjuk kerja..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                            />
                                        </div>
                                    )}
                                    <ObservationBuilder
                                        assessmentKey="formative"
                                        instIdx={activeTab}
                                        data={data}
                                        updateInitialConfig={() => {}}
                                        updateFormativeConfig={updateFormativeConfig}
                                        updateSummativeConfig={() => {}}
                                    />
                                    {activeConfig.teacher_notes !== undefined && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Catatan Tindak Lanjut Guru</label>
                                            <textarea
                                                value={activeConfig.teacher_notes || ''}
                                                onChange={e => updateFormativeConfig(activeTab, 'teacher_notes', e.target.value)}
                                                rows={2}
                                                placeholder="Tahapan evaluasi..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none italic"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeInst.instrument_type === 'guided_discussion' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Konteks Diskusi</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateFormativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={3}
                                            placeholder="Deskripsikan topik dan panduan diskusi yang akan berlangsung..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                        />
                                    </div>

                                    <div className="flex gap-2 p-1 bg-card rounded-lg border border-border">
                                        <button
                                            type="button"
                                            onClick={() => updateFormativeConfig(activeTab, 'observation_mode', 'checklist')}
                                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                (activeConfig.observation_mode || 'checklist') === 'checklist'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <ClipboardCheck className="h-3.5 w-3.5" /> Ceklis
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateFormativeConfig(activeTab, 'observation_mode', 'anecdotal')}
                                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                activeConfig.observation_mode === 'anecdotal'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <FileText className="h-3.5 w-3.5" /> Catatan Anekdotal
                                        </button>
                                    </div>

                                    {(activeConfig.observation_mode || 'checklist') === 'checklist' ? (
                                        <ObservationBuilder
                                            assessmentKey="formative"
                                            instIdx={activeTab}
                                            data={data}
                                            updateInitialConfig={() => {}}
                                            updateFormativeConfig={updateFormativeConfig}
                                            updateSummativeConfig={() => {}}
                                            observationMode="checklist"
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                                                <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                <p className="text-[12px] text-muted-foreground leading-relaxed">
                                                    <span className="font-semibold text-foreground">Catatan Anekdotal:</span> Tuliskan observasi naratif selama diskusi berlangsung: sebutkan nama siswa, keaktifan, keberanian berpendapat, dan kualitas argumen.
                                                </p>
                                            </div>
                                            <ObservationBuilder
                                                assessmentKey="formative"
                                                instIdx={activeTab}
                                                data={data}
                                                updateInitialConfig={() => {}}
                                                updateFormativeConfig={updateFormativeConfig}
                                                updateSummativeConfig={() => {}}
                                                observationMode="anecdotal"
                                            />
                                        </div>
                                    )}

                                    {activeConfig.teacher_notes !== undefined && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Catatan Tindak Lanjut Guru</label>
                                            <textarea
                                                value={activeConfig.teacher_notes || ''}
                                                onChange={e => updateFormativeConfig(activeTab, 'teacher_notes', e.target.value)}
                                                rows={2}
                                                placeholder="Evaluasi dan tindak lanjut berdasarkan hasil observasi diskusi..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none italic"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {(activeInst.instrument_type === 'self_assessment' || activeInst.instrument_type === 'peer_assessment') && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Stimulus / Instruksi</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateFormativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={3}
                                            placeholder={activeInst.instrument_type === 'self_assessment' ? "Instruksi untuk refleksi penilaian diri..." : "Instruksi untuk penilaian terhadap rekan..."}
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                        />
                                    </div>

                                    <div className="flex gap-1 p-1 bg-card rounded-lg border border-border">
                                        <button
                                            type="button"
                                            onClick={() => updateFormativeConfig(activeTab, 'assessment_mode', 'default')}
                                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                (activeConfig.assessment_mode || 'default') === 'default'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Form Standar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateFormativeConfig(activeTab, 'assessment_mode', 'checklist')}
                                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                activeConfig.assessment_mode === 'checklist'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <ClipboardCheck className="h-3.5 w-3.5" /> Ceklis
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateFormativeConfig(activeTab, 'assessment_mode', 'simple_rubric')}
                                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                activeConfig.assessment_mode === 'simple_rubric'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <Layers className="h-3.5 w-3.5" /> Rubrik Sederhana
                                        </button>
                                    </div>

                                    {(activeConfig.assessment_mode || 'default') === 'default' ? (
                                        <ObservationBuilder
                                            assessmentKey="formative"
                                            instIdx={activeTab}
                                            data={data}
                                            updateInitialConfig={() => {}}
                                            updateFormativeConfig={updateFormativeConfig}
                                            updateSummativeConfig={() => {}}
                                        />
                                    ) : (activeConfig.assessment_mode) === 'checklist' ? (
                                        <div className="space-y-4">
                                            <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                                                <ClipboardCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                <p className="text-[12px] text-muted-foreground leading-relaxed">
                                                    <span className="font-semibold text-foreground">Mode Ceklis:</span> Murid akan melihat daftar indikator dengan checkbox untuk menandai apakah indikator terpenuhi.
                                                </p>
                                            </div>
                                            <ObservationBuilder
                                                assessmentKey="formative"
                                                instIdx={activeTab}
                                                data={data}
                                                updateInitialConfig={() => {}}
                                                updateFormativeConfig={updateFormativeConfig}
                                                updateSummativeConfig={() => {}}
                                                observationMode="checklist"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                                                <Layers className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                <p className="text-[12px] text-muted-foreground leading-relaxed">
                                                    <span className="font-semibold text-foreground">Rubrik Sederhana:</span> Murid akan menilai setiap indikator dengan 4 level: Perlu Bimbingan, Cukup, Baik, Sangat Baik.
                                                </p>
                                            </div>
                                            <ObservationBuilder
                                                assessmentKey="formative"
                                                instIdx={activeTab}
                                                data={data}
                                                updateInitialConfig={() => {}}
                                                updateFormativeConfig={updateFormativeConfig}
                                                updateSummativeConfig={() => {}}
                                                observationMode="simple_rubric"
                                            />
                                        </div>
                                    )}

                                    {activeConfig.teacher_notes !== undefined && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Catatan Tindak Lanjut Guru</label>
                                            <textarea
                                                value={activeConfig.teacher_notes || ''}
                                                onChange={e => updateFormativeConfig(activeTab, 'teacher_notes', e.target.value)}
                                                rows={2}
                                                placeholder="Evaluasi dan tindak lanjut berdasarkan hasil penilaian..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none italic"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeInst.instrument_type === 'performance_observation' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Stimulus / Konteks Observasi</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateFormativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={3}
                                            placeholder="Tuliskan konteks pengamatan keterlibatan dan perilaku murid..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                        />
                                    </div>

                                    <div className="flex gap-2 p-1 bg-card rounded-lg border border-border">
                                        <button
                                            type="button"
                                            onClick={() => updateFormativeConfig(activeTab, 'observation_mode', 'checklist')}
                                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                (activeConfig.observation_mode || 'checklist') === 'checklist'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <ClipboardCheck className="h-3.5 w-3.5" /> Ceklis
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateFormativeConfig(activeTab, 'observation_mode', 'anecdotal')}
                                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                activeConfig.observation_mode === 'anecdotal'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <FileText className="h-3.5 w-3.5" /> Catatan Anekdotal
                                        </button>
                                    </div>

                                    {(activeConfig.observation_mode || 'checklist') === 'checklist' ? (
                                        <ObservationBuilder
                                            assessmentKey="formative"
                                            instIdx={activeTab}
                                            data={data}
                                            updateInitialConfig={() => {}}
                                            updateFormativeConfig={updateFormativeConfig}
                                            updateSummativeConfig={() => {}}
                                            observationMode="checklist"
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                                                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                <p className="text-[12px] text-muted-foreground leading-relaxed">
                                                    <span className="font-semibold text-foreground">Catatan Anekdotal:</span> Tuliskan observasi naratif secara spesifik: sebutkan nama murid, perilaku yang diamati, konteks waktu, dan dampak terhadap pembelajaran.
                                                </p>
                                            </div>
                                            <ObservationBuilder
                                                assessmentKey="formative"
                                                instIdx={activeTab}
                                                data={data}
                                                updateInitialConfig={() => {}}
                                                updateFormativeConfig={updateFormativeConfig}
                                                updateSummativeConfig={() => {}}
                                                observationMode="anecdotal"
                                            />
                                        </div>
                                    )}

                                    {activeConfig.teacher_notes !== undefined && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Catatan Tindak Lanjut Guru</label>
                                            <textarea
                                                value={activeConfig.teacher_notes || ''}
                                                onChange={e => updateFormativeConfig(activeTab, 'teacher_notes', e.target.value)}
                                                rows={2}
                                                placeholder="Evaluasi dan tindak lanjut berdasarkan hasil observasi..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none italic"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeInst.instrument_type === 'performance' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Konteks Kinerja</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateFormativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={3}
                                            placeholder="Deskripsikan praktik, proyek, atau produk yang harus didemonstrasikan murid..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                        />
                                    </div>

                                    <div className="flex gap-2 p-1 bg-card rounded-lg border border-border">
                                        <button
                                            type="button"
                                            onClick={() => updateFormativeConfig(activeTab, 'performance_mode', 'rubric')}
                                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                (activeConfig.performance_mode || 'rubric') === 'rubric'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <Layers className="h-3.5 w-3.5" /> Rubrik
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateFormativeConfig(activeTab, 'performance_mode', 'continuum')}
                                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                activeConfig.performance_mode === 'continuum'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <TrendingUp className="h-3.5 w-3.5" /> Grafik Perkembangan
                                        </button>
                                    </div>

                                    {(activeConfig.performance_mode || 'rubric') === 'rubric' ? (
                                        <ObservationBuilder
                                            assessmentKey="formative"
                                            instIdx={activeTab}
                                            data={data}
                                            updateInitialConfig={() => {}}
                                            updateFormativeConfig={updateFormativeConfig}
                                            updateSummativeConfig={() => {}}
                                            observationMode="checklist"
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                                                <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                <p className="text-[12px] text-muted-foreground leading-relaxed">
                                                    <span className="font-semibold text-foreground">Grafik Perkembangan:</span> Pantau progres keterampilan murid dari waktu ke waktu. Pilih level pencapaian saat ini untuk setiap indikator.
                                                </p>
                                            </div>
                                            <ContinuumBuilder
                                                assessmentKey="formative"
                                                instIdx={activeTab}
                                                data={data}
                                                updateInitialConfig={() => {}}
                                                updateFormativeConfig={updateFormativeConfig}
                                                updateSummativeConfig={() => {}}
                                            />
                                        </div>
                                    )}

                                    {activeConfig.teacher_notes !== undefined && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Catatan Tindak Lanjut Guru</label>
                                            <textarea
                                                value={activeConfig.teacher_notes || ''}
                                                onChange={e => updateFormativeConfig(activeTab, 'teacher_notes', e.target.value)}
                                                rows={2}
                                                placeholder="Evaluasi dan tindak lanjut berdasarkan hasil penilaian kinerja..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none italic"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeInst.instrument_type === 'reflective_journal' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Stimulus / Instruksi Murid</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateFormativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={3}
                                            placeholder="Tuliskan instruksi penulisan jurnal refleksi murid..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em]">Pertanyaan Refleksi</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const qs = [...(activeConfig.questions || [])];
                                                    qs.push({ text: '' });
                                                    updateFormativeConfig(activeTab, 'questions', qs);
                                                }}
                                                className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 rounded transition"
                                            >
                                                + Tambah Pertanyaan
                                            </button>
                                        </div>
                                        <div className="grid gap-2">
                                            {(activeConfig.questions || []).map((q: any, qIdx: number) => (
                                                <div key={qIdx} className="flex gap-2 items-center p-2 bg-card rounded border border-border group">
                                                    <span className="text-[10px] font-mono text-muted-foreground">{qIdx + 1}.</span>
                                                    <input
                                                        value={q.text || ''}
                                                        onChange={e => {
                                                            const qs = [...activeConfig.questions];
                                                            qs[qIdx] = { ...qs[qIdx], text: e.target.value };
                                                            updateFormativeConfig(activeTab, 'questions', qs);
                                                        }}
                                                        placeholder="Pertanyaan refleksi..."
                                                        className="flex-1 bg-transparent text-[12px] border-none outline-none focus:ring-0 p-0"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const qs = activeConfig.questions.filter((_: any, idx: number) => idx !== qIdx);
                                                            updateFormativeConfig(activeTab, 'questions', qs);
                                                        }}
                                                        className="text-muted-foreground/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeInst.instrument_type === 'exit_ticket' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Stimulus / Instruksi Cepat</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateFormativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={3}
                                            placeholder="Tuliskan instruksi singkat untuk asesmen cepat..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                        />
                                    </div>

                                    <div className="flex gap-1 p-1 bg-card rounded-lg border border-border">
                                        <button
                                            type="button"
                                            onClick={() => updateFormativeConfig(activeTab, 'assessment_mode', 'default')}
                                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                (activeConfig.assessment_mode || 'default') === 'default'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Form Standar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateFormativeConfig(activeTab, 'assessment_mode', 'checklist')}
                                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                activeConfig.assessment_mode === 'checklist'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <ClipboardCheck className="h-3.5 w-3.5" /> Ceklis
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateFormativeConfig(activeTab, 'assessment_mode', 'short_note')}
                                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                                activeConfig.assessment_mode === 'short_note'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <FileText className="h-3.5 w-3.5" /> Catatan Singkat
                                        </button>
                                    </div>

                                    {(activeConfig.assessment_mode || 'default') === 'default' ? (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em]">Pertanyaan Refleksi</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const qs = [...(activeConfig.questions || [])];
                                                            qs.push({ text: '' });
                                                            updateFormativeConfig(activeTab, 'questions', qs);
                                                        }}
                                                        className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 rounded transition"
                                                    >
                                                        + Tambah Pertanyaan
                                                    </button>
                                                </div>
                                                <div className="grid gap-2">
                                                    {(activeConfig.questions || []).map((q: any, qIdx: number) => (
                                                        <div key={qIdx} className="flex gap-2 items-center p-2 bg-card rounded border border-border group">
                                                            <span className="text-[10px] font-mono text-muted-foreground">{qIdx + 1}.</span>
                                                            <input
                                                                value={q.text || ''}
                                                                onChange={e => {
                                                                    const qs = [...(activeConfig.questions || [])];
                                                                    qs[qIdx] = { ...qs[qIdx], text: e.target.value };
                                                                    updateFormativeConfig(activeTab, 'questions', qs);
                                                                }}
                                                                placeholder="Pertanyaan singkat..."
                                                                className="flex-1 bg-transparent text-[12px] border-none outline-none focus:ring-0 p-0"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const qs = (activeConfig.questions || []).filter((_: any, idx: number) => idx !== qIdx);
                                                                    updateFormativeConfig(activeTab, 'questions', qs);
                                                                }}
                                                                className="text-muted-foreground/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (activeConfig.assessment_mode) === 'checklist' ? (
                                        <div className="space-y-4">
                                            <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                                                <ClipboardCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                <p className="text-[12px] text-muted-foreground leading-relaxed">
                                                    <span className="font-semibold text-foreground">Mode Ceklis:</span> Murid menandai indikator pemahaman yang sudah dicapai. Cocok untuk cek pemahaman cepat di sela kelas.
                                                </p>
                                            </div>
                                            <ObservationBuilder
                                                assessmentKey="formative"
                                                instIdx={activeTab}
                                                data={data}
                                                updateInitialConfig={() => {}}
                                                updateFormativeConfig={updateFormativeConfig}
                                                updateSummativeConfig={() => {}}
                                                observationMode="checklist"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-popover rounded-md p-4 border border-border flex items-start gap-3">
                                                <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                <p className="text-[12px] text-muted-foreground leading-relaxed">
                                                    <span className="font-semibold text-foreground">Catatan Singkat:</span> Murid menjawab pertanyaan singkat secara langsung. Jawaban terbatas pendek.
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em]">Pertanyaan Singkat</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const qs = [...(activeConfig.questions || [])];
                                                            qs.push({ text: '' });
                                                            updateFormativeConfig(activeTab, 'questions', qs);
                                                        }}
                                                        className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 rounded transition"
                                                    >
                                                        + Tambah Pertanyaan
                                                    </button>
                                                </div>
                                                <div className="grid gap-2">
                                                    {(activeConfig.questions || []).map((q: any, qIdx: number) => (
                                                        <div key={qIdx} className="flex gap-2 items-center p-2 bg-card rounded border border-border group">
                                                            <span className="text-[10px] font-mono text-muted-foreground">{qIdx + 1}.</span>
                                                            <input
                                                                value={q.text || ''}
                                                                onChange={e => {
                                                                    const qs = [...(activeConfig.questions || [])];
                                                                    qs[qIdx] = { ...qs[qIdx], text: e.target.value };
                                                                    updateFormativeConfig(activeTab, 'questions', qs);
                                                                }}
                                                                placeholder="Pertanyaan singkat (misal: Apa yang kamu pahami hari ini?)"
                                                                className="flex-1 bg-transparent text-[12px] border-none outline-none focus:ring-0 p-0"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const qs = (activeConfig.questions || []).filter((_: any, idx: number) => idx !== qIdx);
                                                                    updateFormativeConfig(activeTab, 'questions', qs);
                                                                }}
                                                                className="text-muted-foreground/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeConfig.teacher_notes !== undefined && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Catatan Tindak Lanjut Guru</label>
                                            <textarea
                                                value={activeConfig.teacher_notes || ''}
                                                onChange={e => updateFormativeConfig(activeTab, 'teacher_notes', e.target.value)}
                                                rows={2}
                                                placeholder="Tindak lanjut berdasarkan hasil asesmen cepat..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none italic"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {(activeInst.instrument_type === 'concept_map' || activeInst.instrument_type === 'project' || activeInst.instrument_type === 'portfolio') && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Instruksi Penilaian</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateFormativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={4}
                                            placeholder="Tuliskan petunjuk penugasan atau lembar kerja..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                        />
                                    </div>
                                    {activeConfig.teacher_notes !== undefined && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Catatan Evaluasi / Rubrik Guru</label>
                                            <textarea
                                                value={activeConfig.teacher_notes || ''}
                                                onChange={e => updateFormativeConfig(activeTab, 'teacher_notes', e.target.value)}
                                                rows={2}
                                                placeholder="Langkah evaluasi dan pembobotan..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none italic"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeInst.instrument_type === 'structured_assignment' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Deskripsi / Instruksi LKPD</label>
                                        <textarea
                                            value={activeConfig.stimulus || ''}
                                            onChange={e => updateFormativeConfig(activeTab, 'stimulus', e.target.value)}
                                            rows={4}
                                            placeholder="Tuliskan deskripsi tugas, petunjuk pengerjaan, dan ketentuan LKPD..."
                                            className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none leading-relaxed"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Indikator Penilaian</label>
                                        <p className="text-[10px] text-muted-foreground ml-1">Tentukan indikator untuk mengevaluasi kelengkapan, proses berpikir, atau ketepatan jawaban siswa.</p>
                                    </div>
                                    <ObservationBuilder
                                        assessmentKey="formative"
                                        instIdx={activeTab}
                                        data={data}
                                        updateInitialConfig={() => {}}
                                        updateFormativeConfig={updateFormativeConfig}
                                        updateSummativeConfig={() => {}}
                                        observationMode="checklist"
                                    />

                                    {activeConfig.teacher_notes !== undefined && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Catatan Evaluasi / Rubrik Guru</label>
                                            <textarea
                                                value={activeConfig.teacher_notes || ''}
                                                onChange={e => updateFormativeConfig(activeTab, 'teacher_notes', e.target.value)}
                                                rows={2}
                                                placeholder="Langkah evaluasi dan pembobotan..."
                                                className="w-full bg-card text-card-foreground rounded border border-border p-3 text-[12px] focus:border-primary outline-none resize-none italic"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <KKTPSection
                                assessmentKey="formative"
                                instIdx={activeTab}
                                data={data}
                                updateInitialConfig={() => {}}
                                updateFormativeConfig={updateFormativeConfig}
                                updateSummativeConfig={() => {}}
                            />

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
