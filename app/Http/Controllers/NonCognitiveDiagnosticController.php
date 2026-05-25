<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\StudentNonCognitiveDiagnostic;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NonCognitiveDiagnosticController extends Controller
{
    public function index(Request $request)
    {
        $teacher = Auth::user()->teacher;

        $classIds = \App\Models\TeachingAssignment::where('teacher_id', $teacher->id)
            ->pluck('school_class_id')
            ->unique();

        $students = Student::with('schoolClass')
            ->whereIn('school_class_id', $classIds)
            ->orderBy('name')
            ->get();

        $diagnostics = StudentNonCognitiveDiagnostic::whereIn('student_id', $students->pluck('id'))
            ->get()
            ->keyBy('student_id');

        $studentData = $students->map(function ($student) use ($diagnostics) {
            $diag = $diagnostics->get($student->id);
            return [
                'id'             => $student->id,
                'name'           => $student->name,
                'nis'            => $student->nis,
                'class_name'     => $student->schoolClass?->name,
                'has_diagnostic' => $diag !== null,
                'learning_style' => $diag?->learning_style,
                'updated_at'     => $diag?->updated_at?->diffForHumans(),
            ];
        });

        return Inertia::render('non-cognitive/index', [
            'students' => $studentData,
        ]);
    }

    public function edit($studentId)
    {
        $student = Student::with('schoolClass')->findOrFail($studentId);

        $diagnostic = StudentNonCognitiveDiagnostic::where('student_id', $studentId)->first();

        return Inertia::render('non-cognitive/edit', [
            'student'   => [
                'id'         => $student->id,
                'name'       => $student->name,
                'nis'        => $student->nis,
                'class_name' => $student->schoolClass?->name,
            ],
            'diagnostic' => $diagnostic ? [
                'id'                  => $diagnostic->id,
                'learning_style'      => $diagnostic->learning_style,
                'learning_style_detail' => $diagnostic->learning_style_detail,
                'motivation_level'    => $diagnostic->motivation_level,
                'interests'           => $diagnostic->interests,
                'family_background'   => $diagnostic->family_background,
                'notes'               => $diagnostic->notes,
            ] : null,
        ]);
    }

    public function update(Request $request, $studentId)
    {
        $student = Student::findOrFail($studentId);

        $validated = $request->validate([
            'learning_style'       => 'nullable|string|max:100',
            'learning_style_detail' => 'nullable|array',
            'motivation_level'     => 'nullable|array',
            'interests'            => 'nullable|array',
            'family_background'    => 'nullable|array',
            'notes'                => 'nullable|string|max:2000',
        ]);

        StudentNonCognitiveDiagnostic::updateOrCreate(
            ['student_id' => $studentId],
            $validated
        );

        return redirect()->route('non-cognitive.index')
            ->with('success', 'Diagnostik non-kognitif berhasil disimpan.');
    }
}
