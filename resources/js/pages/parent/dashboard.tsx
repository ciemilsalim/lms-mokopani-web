import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { BookOpen, ClipboardList, Users, TrendingUp, ChevronRight, GraduationCap, Calendar } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, Tooltip, CartesianGrid } from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Anak Saya', href: '/parent/dashboard' },
];

interface ChildData {
    id: number;
    name: string;
    nis: string;
    class_name: string;
    total_assignments: number;
    submitted: number;
    pending: number;
    avg_score: number | null;
    attendance_pct: number | null;
    grade_trend: { name: string; score: number }[];
    attendance_breakdown: { name: string; value: number; fill: string }[];
}

interface ParentDashboardProps {
    children: ChildData[];
}

export default function ParentDashboard({ children }: ParentDashboardProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Anak Saya – LMS Mokopani" />

            <div className="flex h-full flex-1 flex-col gap-6 min-w-0 fade-in">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Anak Saya</h1>
                    <p className="text-sm text-muted-foreground">
                        Pantau perkembangan belajar anak Anda
                    </p>
                </div>

                {children.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                        <Users className="mb-4 h-16 w-16 opacity-20" />
                        <p className="text-lg font-medium">Belum ada data anak</p>
                        <p className="text-sm">Hubungi admin untuk menghubungkan akun Anda.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {children.map((child) => (
                            <Link
                                key={child.id}
                                href={route('parent.child', child.id)}
                                className="group rounded-2xl border bg-card p-6 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                                            <Users className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{child.name}</h2>
                                            <p className="text-xs font-bold text-muted-foreground">
                                                {child.class_name} &middot; NIS: {child.nis}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-4">
                                    <div className="rounded-xl border bg-muted/30 p-3">
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                                            <ClipboardList className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Tugas</span>
                                        </div>
                                        <span className="text-lg font-black text-foreground">
                                            {child.submitted}/{child.total_assignments}
                                        </span>
                                        {child.pending > 0 && (
                                            <p className="text-[10px] font-bold text-rose-500">{child.pending} tertunda</p>
                                        )}
                                    </div>

                                    <div className="rounded-xl border bg-muted/30 p-3">
                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                                            <TrendingUp className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Rata-rata</span>
                                        </div>
                                        <span className={`text-lg font-black ${
                                            (child.avg_score ?? 0) >= 70 ? 'text-emerald-600' :
                                            (child.avg_score ?? 0) >= 40 ? 'text-amber-600' : 'text-muted-foreground'
                                        }`}>{child.avg_score ?? '-'}</span>
                                    </div>

                                    <div className="rounded-xl border bg-muted/30 p-3">
                                        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Kehadiran</span>
                                        </div>
                                        <span className={`text-lg font-black ${
                                            (child.attendance_pct ?? 100) >= 75 ? 'text-emerald-600' : 'text-rose-600'
                                        }`}>{child.attendance_pct ?? '-'}%</span>
                                    </div>

                                    <div className="rounded-xl border bg-muted/30 p-3">
                                        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
                                            <GraduationCap className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Kelas</span>
                                        </div>
                                        <span className="text-lg font-black text-foreground">{child.class_name}</span>
                                    </div>
                                </div>

                                {/* Analytics Charts Section */}
                                <div className="mt-6 grid gap-6 lg:grid-cols-2 pointer-events-none">
                                    <div className="rounded-xl border bg-card p-4 shadow-sm border-border/80">
                                        <h3 className="text-sm font-bold text-foreground mb-4">Progres Belajar (Nilai Terakhir)</h3>
                                        <div className="h-32 w-full">
                                            {child.grade_trend && child.grade_trend.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={child.grade_trend}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                                        <XAxis dataKey="name" hide />
                                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                                        <Line type="monotone" dataKey="score" stroke="#7367f0" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Belum ada data nilai</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border bg-card p-4 shadow-sm border-border/80">
                                        <h3 className="text-sm font-bold text-foreground mb-4">Progres Kehadiran</h3>
                                        <div className="flex h-32 w-full items-center gap-4">
                                            {child.attendance_breakdown && child.attendance_breakdown.length > 0 && child.attendance_breakdown[0].name !== 'Belum Ada' ? (
                                                <>
                                                    <div className="flex-1 h-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Pie
                                                                    data={child.attendance_breakdown}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    innerRadius={30}
                                                                    outerRadius={45}
                                                                    paddingAngle={2}
                                                                    dataKey="value"
                                                                    stroke="none"
                                                                >
                                                                    {child.attendance_breakdown.map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        {child.attendance_breakdown.map((item, i) => (
                                                            <div key={i} className="flex items-center justify-between text-xs">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                                                                    <span className="text-muted-foreground">{item.name}</span>
                                                                </div>
                                                                <span className="font-bold text-foreground">{item.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex w-full h-full items-center justify-center text-xs text-muted-foreground">Belum ada data kehadiran</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
