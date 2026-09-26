<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Semester;
use App\Models\Student;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $query = Student::with(['schoolClass', 'user'])
            ->whereHas('schoolClass')
            ->orderBy('name');

        if ($user && $user->role === 'teacher' && $user->teacher) {
            $teachingQuery = TeachingAssignment::where('teacher_id', $user->teacher->id)
                ->whereHas('schoolClass');

            if ($activeYear && $activeSemester) {
                $teachingQuery->where(function ($q) use ($activeYear, $activeSemester) {
                    $q->where(function ($sub) use ($activeYear, $activeSemester) {
                        $sub->where('academic_year_id', $activeYear->id)
                            ->where('semester_id', $activeSemester->id);
                    })->orWhere(function ($sub) {
                        $sub->whereNull('academic_year_id')
                            ->whereNull('semester_id');
                    });
                });
            } elseif ($activeYear) {
                $teachingQuery->where(function ($q) use ($activeYear) {
                    $q->where('academic_year_id', $activeYear->id)
                        ->orWhereNull('academic_year_id');
                });
            }

            $classIds = $teachingQuery->pluck('school_class_id')->unique();
            $query->whereIn('school_class_id', $classIds);
        }

        $allStudents = $query->get();

        $students = $allStudents->map(fn ($s) => [
            'id'          => $s->id,
            'name'        => $s->name,
            'nis'         => $s->nis,
            'email'       => $s->user?->email ?? $s->learning_email,
            'class_id'    => $s->school_class_id,
            'class_name'  => $s->schoolClass?->name ?? '-',
            'photo'       => $s->photo_url,
            'religion'    => $s->religion ? ucfirst($s->religion) : null,
            'has_account' => $s->user_id !== null,
            'is_active'   => (bool) ($s->user?->is_active ?? true),
        ]);

        // Group unique classes with student count
        $classes = $students->groupBy('class_name')
            ->map(fn($group, $className) => [
                'name'  => $className,
                'count' => $group->count(),
            ])
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        $stats = [
            'total_students' => $students->count(),
            'total_classes'  => $classes->count(),
            'with_account'   => $students->where('has_account', true)->count(),
            'with_photo'     => $students->filter(fn($s) => !empty($s['photo']))->count(),
        ];

        return Inertia::render('students/index', [
            'students' => $students,
            'classes'  => $classes,
            'stats'    => $stats,
            'period'   => ($activeYear?->name ?? '') . ($activeSemester ? ' - ' . $activeSemester->name : ''),
        ]);
    }
}

