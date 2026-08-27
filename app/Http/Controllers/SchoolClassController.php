<?php

namespace App\Http\Controllers;

use App\Models\SchoolClass;
use App\Models\TeachingAssignment;
use App\Models\Student;
use App\Models\LmsMaterial;
use App\Models\LmsAssignment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SchoolClassController extends Controller
{
    /**
     * Display list of classes assigned to the logged-in teacher (or all for admin).
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        $query = SchoolClass::query();

        if ($user && $user->role === 'teacher' && $user->teacher) {
            $teachingClassIds = TeachingAssignment::where('teacher_id', $user->teacher->id)
                ->pluck('school_class_id')
                ->unique();
            $query->whereIn('id', $teachingClassIds);
        }

        $classes = $query->withCount('students')
            ->orderBy('name')
            ->get()
            ->map(function ($c) use ($user) {
                $subjects = [];
                if ($user && $user->role === 'teacher' && $user->teacher) {
                    $subjects = TeachingAssignment::where('teacher_id', $user->teacher->id)
                        ->where('school_class_id', $c->id)
                        ->with('subject')
                        ->get()
                        ->map(fn($ta) => $ta->subject?->name)
                        ->filter()
                        ->values()
                        ->toArray();
                } else {
                    $subjects = TeachingAssignment::where('school_class_id', $c->id)
                        ->with('subject')
                        ->get()
                        ->map(fn($ta) => $ta->subject?->name)
                        ->filter()
                        ->unique()
                        ->values()
                        ->toArray();
                }

                $materialsCount = LmsMaterial::whereHas('schoolClasses', fn($q) => $q->where('school_classes.id', $c->id))->count();
                $assignmentsCount = LmsAssignment::whereHas('schoolClasses', fn($q) => $q->where('school_classes.id', $c->id))->count();

                return [
                    'id'                => $c->id,
                    'name'              => $c->name,
                    'students_count'    => $c->students_count,
                    'subjects'          => $subjects,
                    'materials_count'   => $materialsCount,
                    'assignments_count' => $assignmentsCount,
                ];
            });

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
