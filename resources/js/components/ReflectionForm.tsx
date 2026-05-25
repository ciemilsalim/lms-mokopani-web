import { useForm } from '@inertiajs/react';
import { 
    Star, 
    Smile, 
    Zap, 
    HelpCircle, 
    CheckCircle2,
    PenLine
} from 'lucide-react';
import { useState } from 'react';

interface ReflectionFormProps {
    assignmentId?: number;
    materialId?: number;
    existingReflection?: {
        understanding_level: number;
        interesting_thing: string;
        difficulty: string;
    } | null;
}

export default function ReflectionForm({ assignmentId, materialId, existingReflection }: ReflectionFormProps) {
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        assignment_id: assignmentId || '',
        material_id: materialId || '',
        understanding_level: existingReflection?.understanding_level || 3,
        interesting_thing: existingReflection?.interesting_thing || '',
        difficulty: existingReflection?.difficulty || '',
    });

    const [hover, setHover] = useState(0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('reflections.store'), {
            preserveScroll: true,
        });
    };

    return (
        <div className="rounded-3xl bg-white dark:bg-[#1B1B25] border-2 border-[#5E6AD2]/10 dark:border-[#5E6AD2]/20 overflow-hidden">
            <div className="bg-gradient-to-r from-[#5E6AD2] to-[#4B55A8] p-6 text-white">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                        <Zap className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Jurnal Refleksi Mandiri</h3>
                        <p className="text-xs text-white/80">Evaluasi pengalaman belajar Anda hari ini</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {recentlySuccessful && (
                    <div className="flex items-center gap-2 rounded-xl bg-[#3DD68C]/10 p-4 text-sm font-bold text-[#3DD68C] dark:bg-[#3DD68C]/10 dark:text-[#3DD68C] animate-in fade-in slide-in-from-top-1">
                        <CheckCircle2 className="h-5 w-5" />
                        Refleksi Anda telah disimpan. Kerja bagus!
                    </div>
                )}

                {/* Understanding Level */}
                <div className="space-y-4 text-center">
                    <label className="flex items-center justify-center gap-2 text-sm font-bold text-[#1B1B25] dark:text-[#F1F1F4]">
                        <Smile className="h-4 w-4 text-[#F0C000]" />
                        Seberapa baik Anda memahami materi ini?
                    </label>
                    <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setData('understanding_level', star)}
                                onMouseEnter={() => setHover(star)}
                                onMouseLeave={() => setHover(0)}
                                className="transition transform hover:scale-125 focus:outline-none"
                            >
                                <Star 
                                    className={`h-8 w-8 ${
                                        star <= (hover || data.understanding_level) 
                                        ? 'fill-[#F0C000] text-[#F0C000]' 
                                        : 'text-[#2C2C3A]/20 dark:text-[#2C2C3A]'
                                    }`} 
                                />
                            </button>
                        ))}
                    </div>
                    <p className="text-xs font-medium text-[#8A8F98]">
                        {data.understanding_level === 1 && 'Sangat Belum Paham'}
                        {data.understanding_level === 2 && 'Kurang Paham'}
                        {data.understanding_level === 3 && 'Cukup Paham'}
                        {data.understanding_level === 4 && 'Paham'}
                        {data.understanding_level === 5 && 'Sangat Paham!'}
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Interesting Thing */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-[#1B1B25] dark:text-[#F1F1F4]">
                            <PenLine className="h-4 w-4 text-[#5E6AD2]" />
                            Hal paling menarik?
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Apa hal baru yang membuat Anda tertarik?"
                            value={data.interesting_thing}
                            onChange={(e) => setData('interesting_thing', e.target.value)}
                            className="w-full rounded-2xl border border-[#2C2C3A]/20 bg-[#F1F1F4]/5 p-4 text-sm outline-none focus:border-[#5E6AD2] focus:ring-4 focus:ring-[#5E6AD2]/10 dark:border-[#2C2C3A] dark:bg-[#2C2C3A]/50 dark:text-[#F1F1F4] transition"
                        ></textarea>
                    </div>

                    {/* Difficulty */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-[#1B1B25] dark:text-[#F1F1F4]">
                            <HelpCircle className="h-4 w-4 text-[#EB5757]" />
                            Apa kendala Anda?
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Bagian mana yang sulit dipahami?"
                            value={data.difficulty}
                            onChange={(e) => setData('difficulty', e.target.value)}
                            className="w-full rounded-2xl border border-[#2C2C3A]/20 bg-[#F1F1F4]/5 p-4 text-sm outline-none focus:border-[#EB5757]/50 focus:ring-4 focus:ring-[#EB5757]/10 dark:border-[#2C2C3A] dark:bg-[#2C2C3A]/50 dark:text-[#F1F1F4] transition"
                        ></textarea>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="w-full rounded-2xl bg-[#5E6AD2] py-4 text-sm font-bold text-white shadow-xl shadow-[#5E6AD2]/20 transition hover:bg-[#4B55A8] disabled:opacity-50 dark:shadow-none"
                >
                    {processing ? 'Menyimpan...' : 'Simpan Jurnal Refleksi'}
                </button>
            </form>
        </div>
    );
}
