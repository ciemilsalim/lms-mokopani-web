export interface Objective {
    id: number;
    code: string;
    description: string;
    subject_id: number;
    school_class_id?: number;
}

export interface Teaching {
    id: number;
    subject_id: number;
    school_class_id: number;
    subject_name: string;
    class_name: string;
}

export interface Instrument {
    id: string;
    name: string;
    icon: string;
    desc: string;
}

export interface CpItem {
    id: number;
    kode: string;
    fase: string;
    elemen: string;
    deskripsi: string;
    subject: { id: number; name: string };
}

export interface InstructionalDesignProps {
    teachings: Teaching[];
    objectives: Objective[];
    instruments: Record<string, Instrument[]>;
    cpList: CpItem[];
    period: string;
}

export const assessmentColors: Record<string, { bg: string; border: string; text: string; activeBg: string; main: string }> = {
    initial:   { bg: 'bg-primary/5 dark:bg-primary/5', border: 'border-border/60 dark:border-primary/20', text: 'text-primary', activeBg: 'bg-primary', main: '#5E6AD2' },
    formative: { bg: 'bg-primary/5 dark:bg-primary/5', border: 'border-border/60 dark:border-primary/20', text: 'text-primary', activeBg: 'bg-primary', main: '#5E6AD2' },
    summative: { bg: 'bg-primary/5 dark:bg-primary/5', border: 'border-border/60 dark:border-primary/20', text: 'text-primary', activeBg: 'bg-primary', main: '#5E6AD2' },
};

export const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'formula'],
        ['clean']
    ],
};
