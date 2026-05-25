import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Book, ChevronDown, Lightbulb, ArrowRight,
    Compass, Target, GraduationCap, Library, ClipboardList, Heart,
    FileBarChart, FileWarning, Brain, Users, BarChart3, MessageSquare, Bell,
} from 'lucide-react';
import { useState } from 'react';

interface GuideStep { label: string; desc: string; route: string }
interface GuideSection { icon: any; title: string; steps: GuideStep[] }

const teacherGuide: GuideSection[] = [
    { icon: Compass, title: '1. Perencanaan Pembelajaran', steps: [
        { label: 'Panduan Pembelajaran & Asesmen 2025', desc: 'Acuan utama perencanaan dan pelaksanaan pembelajaran mendalam dari BSKAP Kemendikdasmen.', route: 'https://guru.kemendikdasmen.go.id/dokumen/P3J9R5eDYQ' },
        { label: 'Capaian Pembelajaran (CP)', desc: 'Kelola CP sebagai acuan pembelajaran.', route: '/cp' },
        { label: 'Tujuan Pembelajaran (TP)', desc: 'Rumuskan TP untuk setiap lingkup materi.', route: '/learning-objectives' },
        { label: 'Rancang Pembelajaran', desc: 'Susun ATP dan Modul Ajar — Asesmen Formatif dapat dibuat lebih dari satu per TP.', route: '/instructional-design/create' },
        { label: 'Materi', desc: 'Unggah materi ajar.', route: '/materials' },
        { label: 'Asesmen', desc: 'Buat tugas dan soal penilaian.', route: '/assignments' },
        { label: 'Projek P5', desc: 'Rencanakan projek profil Pancasila.', route: '/p5' },
    ]},
    { icon: FileBarChart, title: '2. Penilaian & Pelaporan', steps: [
        { label: 'Nilai & Rapor', desc: 'Input nilai, lihat matriks per TP, cetak laporan CP & rapor.', route: '/gradebook' },
        { label: 'Remedial & Pengayaan', desc: 'Program remedial untuk siswa belum tuntas.', route: '/remedial' },
    ]},
    { icon: Brain, title: '3. Diagnostik', steps: [
        { label: 'Diagnostik Non-Kognitif', desc: 'Petakan gaya belajar, motivasi, minat siswa.', route: '/non-cognitive' },
        { label: 'Diagnostik Adaptif', desc: 'Rekomendasi belajar adaptif per siswa.', route: '/adaptive-learning' },
    ]},
    { icon: BarChart3, title: '4. Analitik & Monitoring', steps: [
        { label: 'Analitik Pembelajaran', desc: 'Pantau performa kelas dan analisis butir soal.', route: '/analytics' },
        { label: 'Early Warning System', desc: 'Deteksi siswa berisiko tidak tuntas.', route: '/early-warning' },
    ]},
    { icon: MessageSquare, title: '5. Komunikasi & Feedback', steps: [
        { label: 'Feedback & Revisi', desc: 'Umpan balik hasil kerja siswa.', route: '/feedback-revisions' },
        { label: 'Pengumuman', desc: 'Publikasikan pengumuman ke siswa.', route: '/announcements' },
    ]},
];

const studentGuide: GuideSection[] = [
    { icon: Library, title: '1. Belajar', steps: [
        { label: 'Materi', desc: 'Akses materi ajar dari guru.', route: '/materials' },
        { label: 'Asesmen', desc: 'Kerjakan tugas dan soal.', route: '/assignments' },
        { label: 'Projek P5', desc: 'Ikuti projek profil Pancasila.', route: '/p5/saya' },
    ]},
    { icon: FileBarChart, title: '2. Nilai', steps: [
        { label: 'Nilai Saya', desc: 'Lihat nilai, rata-rata, dan deskripsi capaian.', route: '/gradebook' },
    ]},
    { icon: Brain, title: '3. Diagnostik Adaptif', steps: [
        { label: 'Diagnostik Adaptif', desc: 'Tes adaptif untuk tingkat penguasaan materi.', route: '/adaptive-learning' },
    ]},
    { icon: Bell, title: '4. Informasi', steps: [
        { label: 'Pengumuman', desc: 'Lihat pengumuman guru/sekolah.', route: '/announcements' },
    ]},
];

const parentGuide: GuideSection[] = [
    { icon: Heart, title: '1. Pantau Anak', steps: [
        { label: 'Dashboard Anak', desc: 'Ringkasan perkembangan belajar anak.', route: '/parent/dashboard' },
    ]},
];

function SectionCard({ section, defaultOpen }: { section: GuideSection; defaultOpen: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    const Icon = section.icon;
    return (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <button onClick={() => setOpen(!open)}
                className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-muted/30"
            >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <Icon className="h-5 w-5" />
                </div>
                <h3 className="flex-1 font-bold text-foreground">{section.title}</h3>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`} />
            </button>
            {open && <div className="border-t border-border px-5 py-4 space-y-3">
                {section.steps.map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
                            <span className="text-[10px] font-black">{i + 1}</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-foreground">{s.label}</p>
                                <Link href={s.route} className="text-[10px] font-semibold text-primary hover:underline inline-flex items-center gap-0.5">
                                    Buka <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                        </div>
                    </div>
                ))}
            </div>}
        </div>
    );
}

const roleLabels: Record<string, string> = { teacher: 'Guru', student: 'Siswa', parent: 'Orang Tua', admin: 'Admin' };

const tipsMap: Record<string, { icon: any; text: string }[]> = {
    teacher: [
        { icon: Lightbulb, text: 'Ikuti alur Perencanaan → Penilaian → Diagnostik → Monitoring untuk hasil maksimal.' },
        { icon: Lightbulb, text: 'Gunakan Early Warning untuk deteksi dini siswa bermasalah.' },
        { icon: Lightbulb, text: 'Deskripsi rapor dibuat otomatis — periksa sebelum cetak.' },
        { icon: Lightbulb, text: 'Sesuai Panduan Pembelajaran dan Asesmen 2025: utamakan asesmen formatif berkelanjutan, fokus pada umpan balik kualitatif, bukan hanya hasil akhir.' },
        { icon: Lightbulb, text: 'Di Rancang Pembelajaran, Anda bisa menambahkan lebih dari satu instrumen asesmen formatif per Tujuan Pembelajaran (TP).' },
    ],
    student: [
        { icon: Lightbulb, text: 'Cek tugas terbaru di halaman Asesmen.' },
        { icon: Lightbulb, text: 'Gunakan Diagnostik Adaptif untuk latihan sesuai kemampuanmu.' },
    ],
    parent: [
        { icon: Lightbulb, text: 'Pantau anak secara rutin lewat Dashboard Anak.' },
    ],
};

export default function Guide() {
    const { user_role } = usePage<any>().props;
    const role = (user_role as string) || 'teacher';
    const label = roleLabels[role] || 'Pengguna';
    const sections = role === 'student' ? studentGuide : role === 'parent' ? parentGuide : teacherGuide;
    const tips = tipsMap[role] || tipsMap.teacher;

    return (
        <AppLayout breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Petunjuk Penggunaan', href: '#' },
        ]}>
            <Head title={`Petunjuk Penggunaan – ${label}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Book className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Petunjuk Penggunaan</h1>
                        <p className="text-sm text-muted-foreground">
                            Panduan menggunakan LMS Mokopani untuk <span className="font-bold text-primary">{label}</span>
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                        Setelah login, gunakan sidebar kiri untuk navigasi. Setiap grup menu mewakili tahapan
                        dalam alur pembelajaran. Klik menu untuk membuka halaman terkait.
                    </p>
                </div>

                <div className="space-y-4">
                    {sections.map((s, i) => <SectionCard key={i} section={s} defaultOpen={i === 0} />)}
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
                    <h3 className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300 mb-3">
                        <Lightbulb className="h-5 w-5" /> Tips Penggunaan
                    </h3>
                    <ul className="space-y-2">
                        {tips.map((t, i) => {
                            const Icon = t.icon;
                            return (
                                <li key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>{t.text}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </AppLayout>
    );
}
