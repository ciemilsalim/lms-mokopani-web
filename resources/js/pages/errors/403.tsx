import { Head, Link } from '@inertiajs/react';
import { Lock, ArrowLeft } from 'lucide-react';

export default function Error403() {
    return (
        <div className="font-sans antialiased bg-[#101014] text-[#F1F1F4] min-h-screen flex items-center justify-center p-6">
            <Head title="403 Akses Ditolak – LMS Mokopani" />
            
            <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-700">
                <div className="rounded-3xl border border-[#2C2C3A]/20 bg-[#1B1B25]/80 backdrop-blur-xl p-8 sm:p-10 text-center shadow-2xl relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#EB5757] to-transparent opacity-50"></div>
                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#EB5757] rounded-full mix-blend-multiply filter blur-[80px] opacity-20"></div>
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#5E6AD2] rounded-full mix-blend-multiply filter blur-[80px] opacity-10"></div>
                    
                    <div className="relative z-10">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#EB5757]/10 text-[#EB5757] shadow-inner border border-[#EB5757]/20 mb-8">
                            <Lock className="h-10 w-10" />
                        </div>
                        
                        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#F1F1F4] to-[#8A8F98] mb-4 tracking-tight">
                            403
                        </h1>
                        <h2 className="text-xl font-bold text-[#F1F1F4] mb-3">
                            Akses Ditolak
                        </h2>
                        
                        <p className="text-sm text-[#8A8F98] font-medium leading-relaxed mb-8">
                            Maaf, Anda tidak memiliki izin untuk mengakses halaman ini. Halaman ini mungkin dikhususkan untuk peran pengguna lain atau sedang dikunci.
                        </p>
                        
                        <button 
                            onClick={() => window.history.back()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5E6AD2] to-[#5E6AD2]/80 px-6 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-[#5E6AD2]/25 active:scale-95 w-full sm:w-auto"
                        >
                            <ArrowLeft className="h-4.5 w-4.5" />
                            Kembali ke Alur Belajar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
