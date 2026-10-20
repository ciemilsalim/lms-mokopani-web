<?php

namespace App\Http\Controllers;

use App\Models\SchoolClass;
use App\Models\TeachingAssignment;
use App\Models\Student;
use App\Models\LmsMaterial;
use App\Models\LmsAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SchoolClassController extends Controller
{
    /**
     * Display list of classes assigned to the logged-in teacher (or all for admin).
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $activeYear = \App\Models\AcademicYear::getActive();
        $activeSemester = \App\Models\Semester::getActive();

        $query = SchoolClass::query();

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

            $teachingClassIds = $teachingQuery->pluck('school_class_id')->unique();
            $query->whereIn('id', $teachingClassIds);
        }

        $rawClasses = $query->withCount('students')
            ->orderBy('name')
            ->get();

        $classIds = $rawClasses->pluck('id');

        $teachingQuery = TeachingAssignment::whereIn('school_class_id', $classIds)->with('subject');
        if ($user && $user->role === 'teacher' && $user->teacher) {
            $teachingQuery->where('teacher_id', $user->teacher->id);
        }
        $allTeachings = $teachingQuery->get()->groupBy('school_class_id');

        $materialCounts = DB::table('lms_material_school_class')
            ->whereIn('school_class_id', $classIds)
            ->selectRaw('school_class_id, count(*) as count')
            ->groupBy('school_class_id')
            ->pluck('count', 'school_class_id');

        $assignmentCounts = DB::table('lms_assignment_school_class')
            ->whereIn('school_class_id', $classIds)
            ->selectRaw('school_class_id, count(*) as count')
            ->groupBy('school_class_id')
            ->pluck('count', 'school_class_id');

        $classes = $rawClasses->map(function ($c) use ($user, $allTeachings, $materialCounts, $assignmentCounts) {
            $classTeachings = $allTeachings->get($c->id, collect());
            $subjects = $classTeachings->map(fn($ta) => $ta->subject?->name)
                ->filter()
                ->unique()
                ->values()
                ->toArray();

            return [
                'id'                => $c->id,
                'name'              => $c->name,
                'students_count'    => $c->students_count,
                'subjects'          => $subjects,
                'materials_count'   => (int) ($materialCounts[$c->id] ?? 0),
                'assignments_count' => (int) ($assignmentCounts[$c->id] ?? 0),
            ];
        });

        // Deduplicate duplicate class names, prioritizing the one with active students
        $classes = $classes
            ->sortByDesc('students_count')
            ->unique(fn ($c) => strtolower(trim($c['name'])));

        // If teacher has active classes with students, exclude empty ghost classes (0 students)
        if ($classes->contains(fn ($c) => $c['students_count'] > 0)) {
            $classes = $classes->filter(fn ($c) => $c['students_count'] > 0);
        }

        $classes = $classes->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)->values();

        return Inertia::render('classes/index', [
            'classes' => $classes,
        ]);
    }

    /**
     * Display detail for a specific class (Students, Materials, Assignments, Attendance shortcut).
     */
    public function show(SchoolClass $schoolClass)
    {
        $user = auth()->user();

        if ($user && $user->role === 'teacher' && $user->teacher) {
            $isAssigned = TeachingAssignment::where('teacher_id', $user->teacher->id)
                ->where('school_class_id', $schoolClass->id)
                ->exists();
            if (!$isAssigned && $user->role !== 'admin') {
                abort(403, 'Anda tidak memiliki akses ke kelas ini.');
            }
        }

        $students = Student::where('school_class_id', $schoolClass->id)
            ->orderBy('name')
            ->get()
            ->map(fn($s) => [
                'id'          => $s->id,
                'name'        => $s->name,
                'nis'         => $s->nis,
                'photo_url'   => $s->photo_url,
                'has_account' => $s->user_id !== null,
            ]);

        $materials = LmsMaterial::whereHas('schoolClasses', fn($q) => $q->where('school_classes.id', $schoolClass->id))
            ->with('subject')
            ->latest()
            ->get()
            ->map(fn($m) => [
                'id'           => $m->id,
                'title'        => $m->title,
                'subject_name' => $m->subject?->name ?? 'Umum',
                'created_at'   => $m->created_at?->diffForHumans(),
            ]);

        $assignments = LmsAssignment::whereHas('schoolClasses', fn($q) => $q->where('school_classes.id', $schoolClass->id))
            ->with(['subject', 'submissions'])
            ->latest()
            ->get()
            ->map(function($a) {
                $pendingCount = $a->submissions->whereNull('score')->count();
                return [
                    'id'            => $a->id,
                    'title'         => $a->title,
                    'subject_name'  => $a->subject?->name ?? 'Umum',
                    'due_date'      => $a->due_date?->format('d M Y, H:i'),
                    'pending_count' => $pendingCount,
                    'created_at'    => $a->created_at?->diffForHumans(),
                ];
            });

        $subjectsTaught = [];
        if ($user && $user->teacher) {
            $subjectsTaught = TeachingAssignment::where('teacher_id', $user->teacher->id)
                ->where('school_class_id', $schoolClass->id)
                ->with('subject')
                ->get()
                ->map(fn($ta) => $ta->subject?->name)
                ->filter()
                ->values()
                ->toArray();
        }

        return Inertia::render('classes/show', [
            'schoolClass' => [
                'id'             => $schoolClass->id,
                'name'           => $schoolClass->name,
                'students_count' => $students->count(),
                'subjects'       => $subjectsTaught,
            ],
            'students'    => $students,
            'materials'   => $materials,
            'assignments' => $assignments,
        ]);
    }
}
