import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Book, BookOpen, ClipboardList, GraduationCap, LayoutDashboard, Library, Target, FileBarChart, Bell, Compass,
    Heart, FileWarning, MessageSquare, BarChart3, Brain, Users,
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
            { title: 'Petunjuk Penggunaan', url: '/guide',     icon: Book },
        ],
    },
    {
        label: 'Perencanaan',
        items: [
            { title: 'Capaian Pembelajaran',  url: '/cp',                     icon: Target },
            { title: 'Tujuan Pembelajaran',   url: '/learning-objectives',    icon: GraduationCap },
            { title: 'Materi',                url: '/materials',              icon: Library },
            { title: 'Asesmen',               url: '/assignments',            icon: ClipboardList },
            { title: 'Pembelajaran',          url: '/lesson-plans',           icon: BookOpen },
            { title: 'Projek P5',             url: '/p5',                     icon: Heart },
        ],
    },
    {
        label: 'Penilaian & Diagnostik',
        items: [
            { title: 'Nilai & Rapor',            url: '/gradebook',          icon: FileBarChart },
            { title: 'Remedial & Pengayaan',     url: '/remedial',           icon: FileWarning },
            { title: 'Diagnostik Non-Kognitif',  url: '/non-cognitive',      icon: Users },
            { title: 'Diagnostik Adaptif',       url: '/adaptive-learning',  icon: Brain },
        ],
    },
    {
        label: 'Analitik & Monitoring',
        items: [
            { title: 'Analitik Pembelajaran', url: '/analytics',      icon: BarChart3 },
            { title: 'Early Warning System',  url: '/early-warning',  icon: FileWarning },
        ],
    },
    {
        label: 'Komunikasi',
        items: [
            { title: 'Feedback & Revisi', url: '/feedback-revisions', icon: MessageSquare },
            { title: 'Pengumuman',       url: '/announcements',       icon: Bell },
        ],
    },
];

const studentNavSections: NavSection[] = [
    {
        label: 'Utama',
        items: [
            { title: 'Dashboard',           url: '/dashboard', icon: LayoutDashboard },
            { title: 'Pelajaran Saya',      url: '/subjects',  icon: BookOpen },
            { title: 'Petunjuk Penggunaan', url: '/guide',     icon: Book },
        ],
    },
    {
        label: 'Belajar',
        items: [
            { title: 'Materi',   url: '/materials',   icon: Library },
            { title: 'Asesmen', url: '/assignments', icon: ClipboardList },
            { title: 'Nilai Saya',           url: '/gradebook',          icon: FileBarChart },
            { title: 'Diagnostik Adaptif',   url: '/adaptive-learning',  icon: Brain },
            { title: 'Projek P5',            url: '/p5/saya',            icon: Heart },
        ],
    },
    {
        label: 'Informasi',
        items: [
            { title: 'Pengumuman', url: '/announcements', icon: Bell },
        ],
    },
];

const adminNavSections: NavSection[] = [
    {
        label: 'Utama',
        items: [
            { title: 'Dashboard',           url: '/dashboard', icon: LayoutDashboard },
            { title: 'Mata Pelajaran',      url: '/subjects',  icon: BookOpen },
            { title: 'Petunjuk Penggunaan', url: '/guide',     icon: Book },
        ],
    },
    {
        label: 'Perencanaan',
        items: [
            { title: 'Capaian Pembelajaran', url: '/cp',                  icon: Target },
            { title: 'Tujuan Pembelajaran',  url: '/learning-objectives', icon: GraduationCap },
            { title: 'Materi',               url: '/materials',           icon: Library },
            { title: 'Asesmen',              url: '/assignments',         icon: ClipboardList },
            { title: 'Pembelajaran',         url: '/lesson-plans',        icon: BookOpen },
            { title: 'Projek P5',            url: '/p5',                  icon: Heart },
        ],
    },
    {
        label: 'Penilaian & Diagnostik',
        items: [
            { title: 'Nilai & Rapor',            url: '/gradebook',          icon: FileBarChart },
            { title: 'Remedial & Pengayaan',     url: '/remedial',           icon: FileWarning },
            { title: 'Diagnostik Non-Kognitif',  url: '/non-cognitive',     icon: Users },
            { title: 'Diagnostik Adaptif',       url: '/adaptive-learning', icon: Brain },
        ],
    },
    {
        label: 'Analitik & Monitoring',
        items: [
            { title: 'Analitik Pembelajaran', url: '/analytics',      icon: BarChart3 },
            { title: 'Early Warning System',  url: '/early-warning',  icon: FileWarning },
        ],
    },
    {
        label: 'Komunikasi',
        items: [
            { title: 'Feedback & Revisi', url: '/feedback-revisions', icon: MessageSquare },
            { title: 'Pengumuman',       url: '/announcements',       icon: Bell },
        ],
    },
];

const parentNavSections: NavSection[] = [
    {
        label: 'Utama',
        items: [
            { title: 'Dashboard',           url: '/dashboard',       icon: LayoutDashboard },
            { title: 'Anak Saya',           url: '/parent/dashboard', icon: Heart },
            { title: 'Petunjuk Penggunaan', url: '/guide',           icon: Book },
        ],
    },
];

function getNavSections(role: string): NavSection[] {
    switch (role) {
        case 'teacher': return teacherNavSections;
        case 'student': return studentNavSections;
        case 'admin':   return adminNavSections;
        case 'parent':  return parentNavSections;
        default:        return studentNavSections;
    }
}

export function AppSidebar() {
    const { user_role } = usePage<SharedData>().props;
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
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
