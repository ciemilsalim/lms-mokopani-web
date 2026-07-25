import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Book, BookOpen, ClipboardList, GraduationCap, LayoutDashboard, Library, Target, FileBarChart, Bell, Compass,
    Heart, FileWarning, MessageSquare, BarChart3, Brain, Users, ExternalLink, FileText,
} from 'lucide-react';
import AppLogo from './app-logo';

interface NavSection {
    label: string;
    items: NavItem[];
}

const teacherNavSections: NavSection[] = [
    {
        label: 'Utama',
        items: [
            { title: 'Dashboard',           url: '/dashboard', icon: LayoutDashboard },
            { title: 'Pengumuman',          url: '/announcements', icon: Bell },
        ],
    },
    {
        label: 'Tahap 1: Perencanaan',
        items: [
            { title: 'Analisis CP & TP',      url: '/learning-objectives',    icon: Target },
            { title: 'Modul Ajar / RPP',      url: '/lesson-plans',           icon: BookOpen },
        ],
    },
    {
        label: 'Tahap 2: Pelaksanaan',
        items: [
            { title: 'Bahan Materi',          url: '/materials',              icon: Library },
            { title: 'Bank Asesmen',          url: '/assignments',            icon: ClipboardList },
        ],
    },
    {
        label: 'Tahap 3: Pengolahan',
        items: [
            { title: 'Nilai & Rapor PPA',     url: '/rapor/wizard',           icon: FileBarChart },
            { title: 'Projek P5',             url: '/p5',                     icon: Heart },
        ],
    },
    {
        label: 'Tahap 4: Refleksi',
        items: [
            { title: 'Remedial & Pengayaan',  url: '/remedial',               icon: GraduationCap },
            { title: 'Early Warning System',  url: '/early-warning',          icon: FileWarning },
            { title: 'Analitik Pembelajaran', url: '/analytics',              icon: BarChart3 },
        ],
    },
    {
        label: 'Bantuan',
        items: [
            { title: 'Petunjuk Penggunaan', url: '/guide',     icon: Book },
        ],
    },
];

const studentNavSections: NavSection[] = [
    {
        label: 'Utama',
        items: [
            { title: 'Dashboard',           url: '/dashboard', icon: LayoutDashboard },
            { title: 'Pengumuman',          url: '/announcements', icon: Bell },
        ],
    },
    {
        label: 'Belajar',
        items: [
            { title: 'Bahan Materi',        url: '/materials',     icon: Library },
            { title: 'Bank Asesmen',        url: '/assignments',   icon: ClipboardList },
            { title: 'Projek P5',           url: '/p5/saya',       icon: Heart },
        ],
    },
    {
        label: 'Hasil Belajar',
        items: [
            { title: 'Rapor Saya',          url: '/rapor/wizard',    icon: FileBarChart },
        ],
    },
    {
        label: 'Bantuan',
        items: [
            { title: 'Petunjuk Penggunaan', url: '/guide',     icon: Book },
        ],
    },
];

const adminNavSections: NavSection[] = [
    {
        label: 'Utama',
        items: [
            { title: 'Dashboard',           url: '/dashboard', icon: LayoutDashboard },
            { title: 'Petunjuk Penggunaan', url: '/guide',     icon: Book },
        ],
    },
    {
        label: 'Data Master',
        items: [
            { title: 'Capaian Pembelajaran', url: '/cp',       icon: Target },
            { title: 'Mata Pelajaran',      url: '/subjects',  icon: BookOpen },
            { title: 'Data Guru',           url: '/teachers',  icon: Users },
            { title: 'Data Siswa',          url: '/students',  icon: Users },
        ],
    },
    {
        label: 'Monitoring & Analitik',
        items: [
            { title: 'Analitik Pembelajaran', url: '/analytics',      icon: BarChart3 },
            { title: 'Early Warning System',  url: '/early-warning',  icon: FileWarning },
        ],
    },
    {
        label: 'Komunikasi',
        items: [
            { title: 'Pengumuman', url: '/announcements', icon: Bell },
        ],
    },
];

const parentNavSections: NavSection[] = [
    {
        label: 'Utama',
        items: [
            { title: 'Dashboard',           url: '/dashboard',       icon: LayoutDashboard },
            { title: 'Pengumuman',          url: '/announcements',   icon: Bell },
        ],
    },
    {
        label: 'Pantau Anak',
        items: [
            { title: 'Perkembangan Belajar',url: '/parent/dashboard', icon: Heart },
        ],
    },
    {
        label: 'Bantuan',
        items: [
            { title: 'Petunjuk Penggunaan', url: '/guide',           icon: Book },
        ],
    },
];

export function getNavSections(role: string): NavSection[] {
    switch (role) {
        case 'teacher': return teacherNavSections;
        case 'student': return studentNavSections;
        case 'admin':   return adminNavSections;
        case 'parent':  return parentNavSections;
        default:        return studentNavSections;
    }
}

export function AppSidebar() {
    const { user_role, sipada_url } = usePage<SharedData>().props;
    const sections = getNavSections(user_role);

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="border-b border-sidebar-border/50">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="h-14">
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {sections.map((section) => (
                    <NavMain key={section.label} items={section.items} label={section.label} />
                ))}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border/50">
                {(user_role === 'admin' || user_role === 'teacher') && (
                    <div className="p-2">
                        <a
                            href="/sso/presensi"
                            className="flex w-full items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-600 transition-colors hover:bg-sky-100 dark:bg-sky-950/30 dark:text-sky-400 dark:hover:bg-sky-950/50"
                        >
                            <ExternalLink className="h-4 w-4" />
                            <span>Aplikasi Presensi</span>
                        </a>
                    </div>
                )}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
