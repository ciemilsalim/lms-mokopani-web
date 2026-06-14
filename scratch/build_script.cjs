const fs = require('fs');

let src = fs.readFileSync('resources/js/pages/materials/show.tsx', 'utf8');

// 1. Extract the rpp block
const rppStart = src.indexOf('if (isRppMode) {');
const rppReturnStart = src.indexOf('return (', rppStart);
const normalReturnStart = src.indexOf('return (', rppReturnStart + 100);
let rppBlock = src.substring(rppReturnStart, normalReturnStart);
// remove the closing brace of if (isRppMode) if present at the end
rppBlock = rppBlock.replace(/\s*\}\s*$/, '');

// 2. Extract states needed
const statesStart = src.indexOf('export default function Show');
const statesEnd = src.indexOf('if (isRppMode) {');
let statesBlock = src.substring(statesStart, statesEnd);

// Clean up statesBlock, remove non-rpp states
statesBlock = statesBlock.replace(/const \[isRppMode, setIsRppMode\] = useState\(false\);/, '');
statesBlock = statesBlock.replace(/const \[my_reflection[\s\S]*?\] = useState.*?;/g, '');
statesBlock = statesBlock.replace(/const \[all_reflections[\s\S]*?\] = useState.*?;/g, '');
statesBlock = statesBlock.replace(/const \[comments[\s\S]*?\] = useState.*?;/g, '');
statesBlock = statesBlock.replace(/const \[is_completed[\s\S]*?\] = useState.*?;/g, '');
statesBlock = statesBlock.replace(/const \[readiness_status[\s\S]*?\] = useState.*?;/g, '');
statesBlock = statesBlock.replace(/const \[showDeleteConfirm[\s\S]*?\] = useState.*?;/g, '');
statesBlock = statesBlock.replace(/const \[deleteTarget[\s\S]*?\] = useState.*?;/g, '');
statesBlock = statesBlock.replace(/const \[isDeleting[\s\S]*?\] = useState.*?;/g, '');

// Adjust interface
const newInterface = 
interface Assignment {
    id: number;
    title: string;
    description: string;
    assessment_type: 'initial' | 'formative' | 'summative';
    instrument_type: string;
    rubric_content: any;
    score_intervals: any;
    questions: any;
}

interface ModulAjarProps {
    modulAjar: {
        id: number;
        subject_id: number;
        school_class_id: number;
        learning_objective_id: number;
        material_id: number;
        subject_name: string;
        class_name: string;
        tp_code: string;
        tp_desc: string;
        material_title: string;
        pedagogical_model: string;
        general_info: string; // JSON
        learning_resources: string;
        material_resources: any[];
        material_external_link: string;
        material_file_path: string;
        understanding_activity: string;
        application_activity: string;
        reflection_activity: string;
        image_prompt: string;
        teacher_name: string;
        teacher_nip: string;
        school_name: string;
        headmaster_name: string;
        headmaster_nip: string;
        created_at: string;
        subject_kktp: number;
    };
    assignments: Assignment[];
}

export default function Show({ modulAjar, assignments }: ModulAjarProps) {
    const material = {
        title: modulAjar.material_title,
        content: '',
        tp_desc: modulAjar.tp_desc,
        tp_code: modulAjar.tp_code,
        teacher_name: modulAjar.teacher_name,
        teacher_nip: modulAjar.teacher_nip,
        understanding_activity: modulAjar.understanding_activity,
        application_activity: modulAjar.application_activity,
        reflection_activity: modulAjar.reflection_activity,
        image_prompt: modulAjar.image_prompt,
        resources: modulAjar.material_resources,
        external_link: modulAjar.material_external_link,
        file_path: modulAjar.material_file_path,
        subject_kktp: modulAjar.subject_kktp,
        subject_name: modulAjar.subject_name,
    };
    
    // Parse saved customization
    let savedConfig: any = {};
    try {
        savedConfig = JSON.parse(modulAjar.general_info || '{}');
    } catch(e) {}
    
    const school_name = savedConfig.rppSchoolName || modulAjar.school_name || 'SMA Negeri 1 Mokopani';
    const headmaster_name = savedConfig.kepalaSekolahName || modulAjar.headmaster_name || 'Marlinda, S.Pd';
    const headmaster_nip = savedConfig.kepalaSekolahNip || modulAjar.headmaster_nip || '19791116 200604 2 016';
;

// Replace the signature
statesBlock = statesBlock.replace(/export default function Show[\s\S]*?\)\s*\{[\s\S]*?const \{ delete: destroy \} = useForm\(\);/, newInterface);

// Default state replacements
statesBlock = statesBlock.replace(/useState<string>\(school_setting\('app_name', 'Nama Sekolah'\)\)/g, 'useState<string>(savedConfig.rppSchoolName || modulAjar.school_name)');
statesBlock = statesBlock.replace(/useState<string>\('2 x 45 Menit'\)/g, "useState<string>(savedConfig.rppAlokasiWaktu || '2 x 45 Menit')");
statesBlock = statesBlock.replace(/useState<string>\(''\)/g, "useState<string>('')");

// Replace states initialization with savedConfig
statesBlock = statesBlock.replace(/useState<Record<string, boolean>>\(\{\s*kritis: false,\s*kreatif: false,\s*kolaborasi: false,\s*mandiri: false,\s*kebhinekaan: false,\s*beriman: false,\s*\}\)/, "useState<Record<string, boolean>>(savedConfig.rppProfilLulusan || { kritis: false, kreatif: false, kolaborasi: false, mandiri: false, kebhinekaan: false, beriman: false })");

statesBlock = statesBlock.replace(/useState<string>\(material\.understanding_activity \|\| ''\)/, "useState<string>(savedConfig.understandingActivity || material.understanding_activity || '')");
statesBlock = statesBlock.replace(/useState<string>\(material\.application_activity \|\| ''\)/, "useState<string>(savedConfig.applicationActivity || material.application_activity || '')");
statesBlock = statesBlock.replace(/useState<string>\(material\.reflection_activity \|\| ''\)/, "useState<string>(savedConfig.reflectionActivity || material.reflection_activity || '')");

statesBlock = statesBlock.replace(/useState<string>\(isStructuredDataMaterial \? "LEMBAR KERJA PESERTA DIDIK: PENGELOMPOKAN DATA" : "LEMBAR KERJA PESERTA DIDIK \\(LKPD\\)"\)/g, 'useState<string>(savedConfig.lkpdTitle || "LEMBAR KERJA PESERTA DIDIK (LKPD)")');
statesBlock = statesBlock.replace(/isStructuredDataMaterial \? "LEMBAR KERJA PESERTA DIDIK: PENGELOMPOKAN DATA" : "LEMBAR KERJA PESERTA DIDIK \\(LKPD\\)"/g, 'savedConfig.lkpdTitle || "LEMBAR KERJA PESERTA DIDIK (LKPD)"');

// For LKPD steps
statesBlock = statesBlock.replace(/useState<string>\([\s\S]*?LKPD[\s\S]*?\]\);/, useState<string>(savedConfig.lkpdLangkah || "- Amati stimulus...\\n- Diskusikan masalah...\\n- Buat rancangan solusi...\\n- Presentasikan hasil..."););

// Add usePage to avoid school_setting errors
statesBlock = statesBlock.replace(/const \{ auth \} = usePage<any>\(\)\.props;/, const { auth, global_settings } = usePage<any>().props;
    const school_setting = (key: string, defaultValue: string = '') => {
        return global_settings?.[key] || defaultValue;
    };);

// Inject Save logic
const saveLogic = 
    const [isSaving, setIsSaving] = useState(false);
    
    const handleSaveConfig = () => {
        setIsSaving(true);
        const config = {
            rppSchoolName, rppAlokasiWaktu, rppProfilLulusan,
            rppKemitraan, rppDigital, rppRemedial, rppPengayaan,
            kepalaSekolahName, kepalaSekolahNip,
            understandingActivity, applicationActivity, reflectionActivity,
            lkpdTitle, lkpdStimulus, lkpdPemantik, lkpdLangkah
        };
        
        router.put(route('lesson-plans.update', modulAjar.id), {
            subject_id: modulAjar.subject_id,
            school_class_id: modulAjar.school_class_id,
            learning_objective_id: modulAjar.learning_objective_id,
            material_id: modulAjar.material_id,
            pedagogical_model: modulAjar.pedagogical_model,
            general_info: JSON.stringify(config),
            learning_design: null,
            learning_steps: null,
            assessment_plan: null,
            kktp_details: null,
            lkpd: null,
            learning_resources: null
        }, {
            onFinish: () => setIsSaving(false)
        });
    };
;
statesBlock += saveLogic;

// Modify rppBlock
rppBlock = rppBlock.replace(/Kembali ke Detail Materi/g, 'Kembali ke Daftar Modul Ajar');
rppBlock = rppBlock.replace(/setIsRppMode\(false\)/g, "router.get('/lesson-plans')");

// Add "Simpan Perubahan" button next to Cetak RPP
const printBtnHtml = <button onClick={() => window.print()};
const saveBtnHtml = 
    <button onClick={handleSaveConfig} disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 shadow-md mr-2">
        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Simpan Konfigurasi
    </button>
    <button onClick={() => window.print()};

rppBlock = rppBlock.replace(printBtnHtml, saveBtnHtml);

// Strip HTML function is missing in the imports/utils
const stripHtmlDef = 
const stripHtml = (html: string) => {
    if (typeof window !== 'undefined') {
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html || '';
        return tmp.textContent || tmp.innerText || '';
    }
    return html?.replace(/<[^>]*>?/gm, '') || '';
};
;

// Imports block
const imports = import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronLeft, Printer, Settings, Eye, CheckCircle2, AlertCircle, ArrowRight, Save, Loader2, Download, ExternalLink, Globe, FileText, Star, Target, Calendar, User, Youtube, FolderOpen } from 'lucide-react';

;

const fullFile = imports + "\n" + statesBlock + "\n" + rppBlock + "\n}";

fs.writeFileSync('resources/js/pages/modul-ajar/show.tsx', fullFile);
console.log('Successfully built resources/js/pages/modul-ajar/show.tsx');
