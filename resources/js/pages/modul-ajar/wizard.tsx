import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { TpStep, TpItem } from '@/components/wizard/TpStep';
import { AtpStep } from '@/components/wizard/AtpStep';
import { KktpStep } from '@/components/wizard/KktpStep';

interface ModulAjarWizardProps {
    cpList: Array<{ id: number; nama: string; elemen: string; fase: string; capaian_pembelajaran: string }>;
    teachings: Array<{ id: number; subject_id: number; subject_name: string; school_class_id: number; class_name: string }>;
    period: string;
}

const WIZARD_STEPS = [
    { id: 1, title: 'Formulasi TP', description: 'Analisis CP (Kompetensi + Konten)' },
    { id: 2, title: 'Urutan ATP', description: 'Metode Pengurutan Logis PPA 2025' },
    { id: 3, title: 'KKTP & Rubrik', description: 'Penetapan Standar Ketercapaian' },
];

export default function ModulAjarWizardPage({ cpList, teachings, period }: ModulAjarWizardProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedCpId, setSelectedCpId] = useState<number | null>(cpList[0]?.id || null);
    const [tpList, setTpList] = useState<TpItem[]>([]);
    const [atpMethod, setAtpMethod] = useState('Hierarki Konsep');
    const [atpOrder, setAtpOrder] = useState<TpItem[]>([]);
    const [kktpApproach, setKktpApproach] = useState('rubric');
    const [masteryThreshold, setMasteryThreshold] = useState('Cakap');
    const [rubricLevels, setRubricLevels] = useState({
        baru_berkembang: '',
        layak: '',
        cakap: '',
        mahir: ''
    });
    const [checklistItems, setChecklistItems] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const handleStepSubmit = () => {
        setSubmitting(true);

        const firstTeaching = teachings[0];

        const payload = {
            subject_id: firstTeaching?.subject_id || 1,
            school_class_ids: [firstTeaching?.school_class_id || 1],
            learning_objective_id: 1, // fallback
            material_id: 1, // fallback
            pedagogical_model: 'PPA 2025 Backward Design',
            tp_list: tpList.filter((tp) => tp.approved),
            atp_order: atpOrder,
            atp_method: atpMethod,
            kktp_approach: kktpApproach,
            kktp_details: kktpApproach === 'rubric' ? { rubricLevels, masteryThreshold } : { checklistItems, masteryThreshold },
            general_info: JSON.stringify({ period, cp_id: selectedCpId }),
        };

        router.post('/lesson-plans', payload as any, {
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <AppLayout title="Wizard Modul Ajar PPA 2025">
            <Head title="Wizard Modul Ajar PPA 2025" />

            <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        Wizard Modul Ajar (PPA 2025)
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Penyusunan Perangkat Pembelajaran Sederhana, Aksi-Terarah, & Berbasis AI ({period})
                    </p>
                </div>

                {/* Stepper Header */}
                <WizardStepper
                    currentStep={currentStep}
                    steps={WIZARD_STEPS}
                    onStepClick={(step) => setCurrentStep(step)}
                />

                {/* Step Contents */}
                {currentStep === 1 && (
                    <TpStep
                        cpList={cpList}
                        selectedCpId={selectedCpId}
                        setSelectedCpId={setSelectedCpId}
                        tpList={tpList}
                        setTpList={setTpList}
                        onNext={() => setCurrentStep(2)}
                    />
                )}

                {currentStep === 2 && (
                    <AtpStep
                        tpList={tpList}
                        atpMethod={atpMethod}
                        setAtpMethod={setAtpMethod}
                        atpOrder={atpOrder}
                        setAtpOrder={setAtpOrder}
                        onBack={() => setCurrentStep(1)}
                        onNext={() => setCurrentStep(3)}
                    />
                )}

                {currentStep === 3 && (
                    <KktpStep
                        atpOrder={atpOrder}
                        kktpApproach={kktpApproach}
                        setKktpApproach={setKktpApproach}
                        masteryThreshold={masteryThreshold}
                        setMasteryThreshold={setMasteryThreshold}
                        rubricLevels={rubricLevels}
                        setRubricLevels={setRubricLevels}
                        checklistItems={checklistItems}
                        setChecklistItems={setChecklistItems}
                        onBack={() => setCurrentStep(2)}
                        onSubmit={handleStepSubmit}
                        submitting={submitting}
                    />
                )}
            </div>
        </AppLayout>
    );
}
