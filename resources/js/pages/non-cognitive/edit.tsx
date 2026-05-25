import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft, Save, User, Eye, Ear, Hand, BookOpen, Brain, Heart, Star, Users, Home } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Diagnostik Non-Kognitif', href: '/non-cognitive' },
    { title: 'Edit', href: '#' },
];

interface StudentInfo {
    id: number;
    name: string;
    nis: string;
    class_name: string;
}

interface DiagnosticData {
    id?: number;
    learning_style: string | null;
    learning_style_detail: Record<string, any> | null;
    motivation_level: Record<string, any> | null;
    interests: Record<string, any> | null;
    family_background: Record<string, any> | null;
    notes: string | null;
}

interface EditProps {
    student: StudentInfo;
    diagnostic: DiagnosticData | null;
}

const learningStyleOptions = [
    { value: 'visual', label: 'Visual', icon: Eye, desc: 'Belajar melalui gambar, diagram, dan video' },
    { value: 'auditori', label: 'Auditori', icon: Ear, desc: 'Belajar melalui pendengaran dan diskusi' },
    { value: 'kinestetik', label: 'Kinestetik', icon: Hand, desc: 'Belajar melalui gerakan dan praktik langsung' },
    { value: 'membaca-menulis', label: 'Membaca/Menulis', icon: BookOpen, desc: 'Belajar melalui teks dan catatan' },
    { value: 'multimodal', label: 'Multimodal', icon: Brain, desc: 'Kombinasi dari beberapa gaya belajar' },
];

const styleDimensions = [
    { key: 'visual', label: 'Visual', emoji: '👁️' },
    { key: 'auditori', label: 'Auditori', emoji: '👂' },
    { key: 'kinestetik', label: 'Kinestetik', emoji: '✋' },
    { key: 'membaca_menulis', label: 'Membaca/Menulis', emoji: '📖' },
];

const motivationIntrinsikOptions = [
    { value: 'tinggi', label: 'Tinggi', desc: 'Siswa sangat termotivasi dari dalam diri' },
    { value: 'sedang', label: 'Sedang', desc: 'Siswa cukup termotivasi dari dalam diri' },
    { value: 'rendah', label: 'Rendah', desc: 'Siswa kurang termotivasi dari dalam diri' },
];

const motivationEkstrinsikOptions = [
    { value: 'tinggi', label: 'Tinggi', desc: 'Sangat termotivasi oleh faktor luar' },
    { value: 'sedang', label: 'Sedang', desc: 'Cukup termotivasi oleh faktor luar' },
    { value: 'rendah', label: 'Rendah', desc: 'Kurang termotivasi oleh faktor luar' },
];

const interestOptions = [
    { value: 'olahraga', label: 'Olahraga', emoji: '⚽' },
    { value: 'seni_musik', label: 'Seni & Musik', emoji: '🎨' },
    { value: 'sains_teknologi', label: 'Sains & Teknologi', emoji: '🔬' },
    { value: 'membaca', label: 'Membaca & Menulis', emoji: '📚' },
    { value: 'organisasi', label: 'Berorganisasi', emoji: '🤝' },
    { value: 'bermain', label: 'Bermain & Game', emoji: '🎮' },
    { value: 'memasak', label: 'Memasak & Berkebun', emoji: '🍳' },
    { value: 'musik', label: 'Musik & Bernyanyi', emoji: '🎵' },
];

export default function NonCognitiveEdit({ student, diagnostic }: EditProps) {
    const detail = diagnostic?.learning_style_detail ?? {};
    const motivation = diagnostic?.motivation_level ?? {};
    const interestsData = diagnostic?.interests ?? {};
    const family = diagnostic?.family_background ?? {};

    const [form, setForm] = useState({
        learning_style: diagnostic?.learning_style || '',
        ls_visual: detail.visual ?? 50,
        ls_auditori: detail.auditori ?? 50,
        ls_kinestetik: detail.kinestetik ?? 50,
        ls_membaca_menulis: detail.membaca_menulis ?? 50,
        motivasi_intrinsik: motivation.intrinsik ?? 'sedang',
        motivasi_ekstrinsik: motivation.ekstrinsik ?? 'sedang',
        minat: Array.isArray(interestsData) ? interestsData : (interestsData.daftar ?? []),
        minat_lainnya: interestsData.lainnya ?? '',
        keluarga_ayah: family.pekerjaan_ayah ?? '',
        keluarga_ibu: family.pekerjaan_ibu ?? '',
        keluarga_saudara: family.jumlah_saudara ?? '',
        keluarga_tinggal: family.status_tinggal ?? '',
        notes: diagnostic?.notes || '',
    });
    const [saving, setSaving] = useState(false);

    const toggleMinat = (val: string) => {
        setForm((p) => ({
            ...p,
            minat: p.minat.includes(val) ? p.minat.filter((v: string) => v !== val) : [...p.minat, val],
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        router.post(route('non-cognitive.update', student.id), {
            learning_style: form.learning_style || null,
            learning_style_detail: {
                visual: Number(form.ls_visual),
                auditori: Number(form.ls_auditori),
                kinestetik: Number(form.ls_kinestetik),
                membaca_menulis: Number(form.ls_membaca_menulis),
            },
            motivation_level: {
                intrinsik: form.motivasi_intrinsik,
                ekstrinsik: form.motivasi_ekstrinsik,
            },
            interests: {
                daftar: form.minat,
                lainnya: form.minat_lainnya || null,
            },
            family_background: {
                pekerjaan_ayah: form.keluarga_ayah || null,
                pekerjaan_ibu: form.keluarga_ibu || null,
                jumlah_saudara: form.keluarga_saudara || null,
                status_tinggal: form.keluarga_tinggal || null,
            },
            notes: form.notes || null,
        }, {
            onFinish: () => setSaving(false),
        });
    };

    const setField = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Diagnostik ${student.name} – LMS Mokopani`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <button
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition w-fit cursor-pointer"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Kembali
                </button>

                <div className="grid gap-6 lg:grid-cols-3">
                    <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">

                        {/* ── GAYA BELAJAR ── */}
                        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm dark:shadow-none">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-muted/50 dark:text-foreground/80">
                                    <Brain className="h-5 w-5" />
                                </div>
                                <h2 className="text-xl font-bold text-foreground">Gaya Belajar</h2>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-sm font-bold text-foreground block mb-3">Tipe Gaya Belajar</label>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {learningStyleOptions.map((opt) => {
                                            const Icon = opt.icon;
                                            const isActive = form.learning_style === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setField('learning_style', opt.value)}
                                                    className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${
                                                        isActive
                                                            ? 'border-primary bg-primary/5 shadow-sm'
                                                            : 'border-border hover:border-primary/40 hover:bg-muted/50'
                                                    }`}
                                                >
                                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl mb-3 transition-colors ${
                                                        isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    <p className={`text-sm font-bold transition-colors ${isActive ? 'text-primary dark:text-primary-hover' : 'text-foreground'}`}>
                                                        {opt.label}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{opt.desc}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-foreground block mb-3">Proporsi Gaya Belajar</label>
                                    <p className="text-xs text-muted-foreground mb-4">Seret slider untuk mengukur seberapa besar kecenderungan setiap gaya belajar</p>
                                    <div className="space-y-4">
                                        {styleDimensions.map((dim) => {
                                            const val = Number((form as any)[`ls_${dim.key}`] ?? 50);
                                            return (
                                                <div key={dim.key}>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">{dim.emoji}</span>
                                                            <label className="text-sm font-bold text-foreground">{dim.label}</label>
                                                        </div>
                                                        <span className="text-xs font-bold text-muted-foreground w-8 text-right">{val}%</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={val}
                                                        onChange={(e) => setField(`ls_${dim.key}`, e.target.value)}
                                                        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── MOTIVASI & MINAT ── */}
                        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm dark:shadow-none">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-muted/50 dark:text-foreground/80">
                                    <Star className="h-5 w-5" />
                                </div>
                                <h2 className="text-xl font-bold text-foreground">Motivasi & Minat</h2>
                            </div>

                            <div className="space-y-6">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-bold text-foreground block mb-2">
                                            Motivasi Intrinsik <span className="text-xs font-normal text-muted-foreground">(dari dalam diri)</span>
                                        </label>
                                        <div className="space-y-2">
                                            {motivationIntrinsikOptions.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setField('motivasi_intrinsik', opt.value)}
                                                    className={`w-full text-left rounded-xl border-2 p-3 transition-all cursor-pointer ${
                                                        form.motivasi_intrinsik === opt.value
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-border hover:border-primary/40'
                                                    }`}
                                                >
                                                    <span className={`text-sm font-bold ${
                                                        form.motivasi_intrinsik === opt.value ? 'text-primary dark:text-primary-hover' : 'text-foreground'
                                                    }`}>{opt.label}</span>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-foreground block mb-2">
                                            Motivasi Ekstrinsik <span className="text-xs font-normal text-muted-foreground">(dari luar)</span>
                                        </label>
                                        <div className="space-y-2">
                                            {motivationEkstrinsikOptions.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setField('motivasi_ekstrinsik', opt.value)}
                                                    className={`w-full text-left rounded-xl border-2 p-3 transition-all cursor-pointer ${
                                                        form.motivasi_ekstrinsik === opt.value
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-border hover:border-primary/40'
                                                    }`}
                                                >
                                                    <span className={`text-sm font-bold ${
                                                        form.motivasi_ekstrinsik === opt.value ? 'text-primary dark:text-primary-hover' : 'text-foreground'
                                                    }`}>{opt.label}</span>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-foreground block mb-3">Minat & Bakat</label>
                                    <p className="text-xs text-muted-foreground mb-3">Pilih bidang yang diminati siswa</p>
                                    <div className="flex flex-wrap gap-2">
                                        {interestOptions.map((opt) => {
                                            const isSelected = form.minat.includes(opt.value);
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => toggleMinat(opt.value)}
                                                    className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                            : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                                    }`}
                                                >
                                                    <span>{opt.emoji}</span>
                                                    {opt.label}
                                                    {isSelected && <span className="ml-1 text-primary">✓</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-3">
                                        <input
                                            type="text"
                                            value={form.minat_lainnya}
                                            onChange={(e) => setField('minat_lainnya', e.target.value)}
                                            placeholder="Minat lainnya... (pisahkan dengan koma)"
                                            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover text-foreground"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── LATAR BELAKANG KELUARGA ── */}
                        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm dark:shadow-none">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-muted/50 dark:text-foreground/80">
                                    <Home className="h-5 w-5" />
                                </div>
                                <h2 className="text-xl font-bold text-foreground">Latar Belakang Keluarga</h2>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-bold text-foreground block mb-1.5">Pekerjaan Ayah</label>
                                    <input
                                        type="text"
                                        value={form.keluarga_ayah}
                                        onChange={(e) => setField('keluarga_ayah', e.target.value)}
                                        placeholder="Cth: Petani, Guru, Wiraswasta"
                                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-foreground block mb-1.5">Pekerjaan Ibu</label>
                                    <input
                                        type="text"
                                        value={form.keluarga_ibu}
                                        onChange={(e) => setField('keluarga_ibu', e.target.value)}
                                        placeholder="Cth: IRT, Guru, Pedagang"
                                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-foreground block mb-1.5">Jumlah Saudara</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="20"
                                        value={form.keluarga_saudara}
                                        onChange={(e) => setField('keluarga_saudara', e.target.value)}
                                        placeholder="0"
                                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-foreground block mb-1.5">Tinggal Bersama</label>
                                    <select
                                        value={form.keluarga_tinggal}
                                        onChange={(e) => setField('keluarga_tinggal', e.target.value)}
                                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover text-foreground"
                                    >
                                        <option value="">-- Pilih --</option>
                                        <option value="orang_tua">Orang Tua</option>
                                        <option value="wali">Wali</option>
                                        <option value="saudara">Saudara</option>
                                        <option value="pondok">Pondok/Asrama</option>
                                        <option value="lainnya">Lainnya</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ── CATATAN ── */}
                        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm dark:shadow-none">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-muted/50 dark:text-foreground/80">
                                    <Users className="h-5 w-5" />
                                </div>
                                <h2 className="text-xl font-bold text-foreground">Catatan</h2>
                            </div>
                            <textarea
                                value={form.notes}
                                onChange={(e) => setField('notes', e.target.value)}
                                rows={4}
                                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-popover text-foreground"
                                placeholder="Catatan tambahan tentang siswa..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? 'Menyimpan...' : 'Simpan Diagnostik'}
                        </button>
                    </form>

                    {/* ── SIDEBAR ── */}
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:shadow-none">
                            <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest">Siswa</h3>
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <User className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-foreground">{student.name}</p>
                                    <p className="text-xs text-muted-foreground">{student.nis} &middot; {student.class_name}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:shadow-none">
                            <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest">Ringkasan Diagnostik</h3>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Gaya Belajar</p>
                                    <p className="font-semibold text-foreground">
                                        {form.learning_style
                                            ? learningStyleOptions.find((o) => o.value === form.learning_style)?.label ?? form.learning_style
                                            : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Motivasi Intrinsik</p>
                                    <p className="font-semibold text-foreground capitalize">{form.motivasi_intrinsik}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Motivasi Ekstrinsik</p>
                                    <p className="font-semibold text-foreground capitalize">{form.motivasi_ekstrinsik}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Bidang Minat</p>
                                    <div className="flex flex-wrap gap-1">
                                        {form.minat.length > 0
                                            ? form.minat.map((m: string) => (
                                                <span key={m} className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary dark:bg-muted/50 dark:text-foreground/80">
                                                    {interestOptions.find((o) => o.value === m)?.label ?? m}
                                                </span>
                                            ))
                                            : <span className="text-muted-foreground">-</span>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
