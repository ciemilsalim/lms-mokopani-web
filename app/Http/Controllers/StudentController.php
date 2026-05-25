<?php

namespace App\Http\Controllers;

use App\Models\Student;
use Inertia\Inertia;

class StudentController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        
        $query = Student::with(['schoolClass', 'user'])
            ->orderBy('name');

        if ($user && $user->role === 'teacher' && $user->teacher) {
            $classIds = \App\Models\TeachingAssignment::where('teacher_id', $user->teacher->id)
                ->pluck('school_class_id');
            $query->whereIn('school_class_id', $classIds);
        }

        $students = $query->get()
            ->map(fn ($s) => [
                'id'          => $s->id,
                'name'        => $s->name,
                'nis'         => $s->nis,
                'class_name'  => $s->schoolClass?->name ?? null,
                'photo'       => $s->photo ? asset('storage/' . $s->photo) : null,
                'has_account' => $s->user_id !== null,
            ]);

        return Inertia::render('students/index', ['students' => $students]);
    }
}
