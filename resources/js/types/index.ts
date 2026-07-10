import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url?: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    children?: NavItem[];
}

export interface SharedData {
    name: string;
    school_name: string;
    school_logo: string | null;
    quote: { message: string; author: string };
    auth: Auth;
    user_role: 'admin' | 'teacher' | 'student' | 'parent' | 'user' | 'guest';
    unread_count: number;
    sipada_url?: string;
    activeSemesterId?: number;
    semestersList?: Array<{id: number, name: string, academic_year: string, is_active: boolean}>;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}
