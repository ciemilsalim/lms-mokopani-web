import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ChildHeader, ChildSubjectList, ParentAcademicSummary } from '@/components/parent';

interface AssignmentItem {
    id: number;
    title: string;
    score: any;
    max_points: number;
    status: string;
    type: string;
    tp_id: number | null;
}

interface SubjectReport {
    subject_name: string;
    assignments: AssignmentItem[];
    average: number;
    description: string;
    attendance_percentage: number;
    total_meetings: number;
}

interface StudentData {
    id: number;
    name: string;
    nis: string;
    class_name: string;
}

interface ParentChildProps {
    student: StudentData;
    report: SubjectReport[];
    period: string;
}

export default function ParentChild({ student, report = [], period }: ParentChildProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Anak Saya', href: '/parent/dashboard' },
        { title: student.name, href: `/parent/child/${student.id}` },
    ];

    const overallAvg = report.length > 0
        ? Math.round(report.reduce((sum, s) => sum + s.average, 0) / report.length)
        : null;

    const allAssignments = report.flatMap(s => s.assignments);
    const totalAssignments = allAssignments.length;
    const submittedAssignments = allAssignments.filter(a => a.status === 'Selesai').length;
    const pendingAssignments = totalAssignments - submittedAssignments;

    const overallAttendance = report.length > 0
        ? Math.round(report.reduce((sum, s) => sum + s.attendance_percentage, 0) / report.length)
        : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${student.name} – Laporan Hasil Belajar`} />

            <div className="space-y-5 sm:space-y-6 fade-in pb-16 md:pb-6 max-w-5xl mx-auto px-4 sm:px-6">
                {/* Child Identity Header */}
                <ChildHeader
                    studentName={student.name}
                    studentNis={student.nis}
                    classNameStr={student.class_name}
                    periodStr={period}
                />

                {/* Overall Summary Stats */}
                <ParentAcademicSummary
                    avgScore={overallAvg}
                    submittedCount={submittedAssignments}
                    totalAssignments={totalAssignments}
                    pendingCount={pendingAssignments}
                    attendancePct={overallAttendance}
                />

                {/* Subject Grade Breakdown Cards */}
                <div className="space-y-3 pt-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Hasil Belajar per Mata Pelajaran ({report.length})
                    </h2>
                    <ChildSubjectList reports={report} />
                </div>
            </div>
        </AppLayout>
    );
}
