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
        $user = Auth::user();
        $teacher = $user->teacher ?? \App\Models\Teacher::where('user_id', $user->id)->first();

        if ($user->role !== 'admin' && !$teacher) {
            abort(403, 'Akses khusus guru.');
        }

        $classIds = $teacher 
            ? \App\Models\TeachingAssignment::where('teacher_id', $teacher->id)->pluck('school_class_id')->unique()
            : \App\Models\SchoolClass::pluck('id');

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
        $this->authorizeStudentAccess($student);

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
        $this->authorizeStudentAccess($student);

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

    protected function authorizeStudentAccess(Student $student)
    {
        $user = Auth::user();
        if ($user->role === 'admin') {
            return;
        }

        $teacher = $user->teacher ?? \App\Models\Teacher::where('user_id', $user->id)->first();
        if (!$teacher) {
            abort(403, 'Akses khusus guru.');
        }

        if (!$student->school_class_id) {
            abort(403, 'Siswa belum terdaftar pada kelas aktif.');
        }

        $isAssigned = \App\Models\TeachingAssignment::where('teacher_id', $teacher->id)
            ->where('school_class_id', $student->school_class_id)
            ->exists();

        if (!$isAssigned) {
            abort(403, 'Anda tidak memiliki hak akses diagnostik untuk siswa di luar kelas ampu Anda.');
        }
    }
}
