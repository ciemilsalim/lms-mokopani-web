<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\LmsAssignment;
use App\Models\LmsRemedialRecord;
use App\Models\LmsSubmission;
use App\Models\Semester;
use App\Models\Student;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class RemedialRecordController extends Controller
{
    protected function getTeacherTeachings()
    {
        $teacher = Auth::user()->teacher;
        return TeachingAssignment::with(['subject', 'schoolClass'])
            ->where('teacher_id', $teacher->id)
            ->get()
            ->map(fn ($t) => [
                'subject_id'   => $t->subject_id,
                'subject_name' => $t->subject->name,
                'class_id'     => $t->school_class_id,
                'class_name'   => $t->schoolClass->name,
            ])
            ->unique(fn ($t) => $t['subject_id'] . '-' . $t['class_id'])
            ->values();
    }

    public function index(Request $request)
    {
        $teacher = Auth::user()->teacher;
        $query = LmsRemedialRecord::with(['student', 'assignment', 'subject', 'teacher'])
            ->where('teacher_id', $teacher->id);

        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }
        if ($request->filled('class_id')) {
            $query->whereHas('student', fn ($q) => $q->where('school_class_id', $request->class_id));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $records = $query->latest()->paginate(20)->withQueryString();

        return Inertia::render('remedial/index', [
            'records'    => $records,
            'teachings'  => $this->getTeacherTeachings(),
            'filters'    => $request->only(['subject_id', 'class_id', 'status', 'type']),
        ]);
    }

    public function create()
    {
        return Inertia::render('remedial/create', [
            'teachings' => $this->getTeacherTeachings(),
        ]);
    }

    public function eligible(Request $request)
    {
        $request->validate([
            'subject_id' => 'required|exists:mysql_absensi.subjects,id',
            'class_id'   => 'required|exists:mysql_absensi.school_classes,id',
            'type'       => 'required|in:remedial,pengayaan',
        ]);

        $subjectId = $request->subject_id;
        $classId = $request->class_id;
        $type = $request->type;
        $kktp = get_kktp($subjectId);

        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $assignments = LmsAssignment::where('subject_id', $subjectId)
            ->whereHas('schoolClasses', function ($q) use ($classId) {
                $q->where('school_classes.id', $classId);
            })
            ->where('assessment_type', 'summative')
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get(['id', 'title', 'learning_objective_id', 'max_points']);

        $students = Student::where('school_class_id', $classId)
            ->orderBy('name')
            ->get(['id', 'name', 'nis']);

        $submissions = LmsSubmission::whereIn('assignment_id', $assignments->pluck('id'))
            ->whereIn('student_id', $students->pluck('id'))
            ->get();

        $existingRecords = LmsRemedialRecord::where('subject_id', $subjectId)
            ->whereIn('assignment_id', $assignments->pluck('id'))
            ->whereIn('student_id', $students->pluck('id'))
            ->where('teacher_id', Auth::user()->teacher->id)
            ->whereIn('status', ['assigned', 'in_progress'])
            ->get()
            ->groupBy('student_id');

        $studentData = $students->map(function ($student) use ($assignments, $submissions, $kktp, $type, $existingRecords) {
            $results = $assignments->map(function ($assignment) use ($student, $submissions, $kktp, $existingRecords) {
                $sub = $submissions
                    ->where('student_id', $student->id)
                    ->where('assignment_id', $assignment->id)
                    ->first();

                $score = $sub?->score ?? null;
                $passed = $score !== null && $score >= $kktp;
                $hasActiveRecord = $existingRecords->has($student->id);

                return [
                    'assignment_id'    => $assignment->id,
                    'assignment_title' => $assignment->title,
                    'score'            => $score,
                    'passed'           => $passed,
                    'max_points'       => $assignment->max_points,
                    'has_active_record' => $hasActiveRecord,
                ];
            });

            $eligible = $type === 'remedial'
                ? $results->contains(fn ($r) => $r['score'] !== null && !$r['passed'] && !$r['has_active_record'])
                : $results->contains(fn ($r) => $r['score'] !== null && $r['passed'] && !$r['has_active_record']);

            return [
                'id'           => $student->id,
                'name'         => $student->name,
                'nis'          => $student->nis,
                'eligible'     => $eligible,
                'assignments'  => $results,
            ];
        });

        return response()->json([
            'students'    => $studentData,
            'assignments' => $assignments,
            'kktp'        => $kktp,
        ]);
    }

    public function store(Request $request)
    {
        $teacher = Auth::user()->teacher;

        $validated = $request->validate([
            'records'           => 'required|array|min:1',
            'records.*.student_id'     => 'required|exists:mysql_absensi.students,id',
            'records.*.assignment_id'  => 'required|exists:lms_assignments,id',
            'records.*.subject_id'     => 'required|exists:mysql_absensi.subjects,id',
            'records.*.type'           => 'required|in:remedial,pengayaan',
            'records.*.initial_score'  => 'nullable|integer|min:0',
            'records.*.description'    => 'nullable|string|max:500',
            'records.*.due_date'       => 'nullable|date',
        ]);

        $created = [];
        foreach ($validated['records'] as $record) {
            $remedialRecord = LmsRemedialRecord::create([
                'student_id'    => $record['student_id'],
                'assignment_id' => $record['assignment_id'],
                'subject_id'    => $record['subject_id'],
                'teacher_id'    => $teacher->id,
                'type'          => $record['type'],
                'initial_score' => $record['initial_score'] ?? null,
                'description'   => $record['description'] ?? null,
                'due_date'      => $record['due_date'] ?? null,
                'status'        => 'assigned',
            ]);

            if ($record['type'] === 'remedial') {
                \App\Models\LmsSubmission::updateOrCreate(
                    [
                        'assignment_id' => $record['assignment_id'],
                        'student_id'    => $record['student_id'],
                    ],
                    [
                        'is_remedial_open' => true,
                    ]
                );
            }

            $created[] = $remedialRecord;
        }

        $firstRecord = reset($created);
        $typeName = ($firstRecord && $firstRecord->type === 'pengayaan') ? 'Pengayaan' : 'Remedial';
        return redirect()->route('remedial.index')
            ->with('success', count($created) . " record {$typeName} berhasil dibuat.");
    }

    public function edit(LmsRemedialRecord $remedial)
    {
        $this->authorizeTeacher($remedial);

        return Inertia::render('remedial/edit', [
            'record' => $remedial->load(['student', 'assignment', 'subject']),
        ]);
    }

    public function update(Request $request, LmsRemedialRecord $remedial)
    {
        $this->authorizeTeacher($remedial);

        $validated = $request->validate([
            'remedial_score' => 'nullable|integer|min:0',
            'description'    => 'nullable|string|max:500',
            'due_date'       => 'nullable|date',
            'status'         => 'required|in:assigned,in_progress,completed,expired',
        ]);

        $remedial->update($validated);

        if ($remedial->type === 'remedial') {
            if ($remedial->status === 'completed' && $remedial->remedial_score !== null) {
                \App\Models\LmsSubmission::where([
                    'assignment_id' => $remedial->assignment_id,
                    'student_id'    => $remedial->student_id,
                ])->update([
                    'score'            => $remedial->remedial_score,
                    'is_remedial_open' => false,
                ]);
            } elseif ($remedial->status === 'assigned' || $remedial->status === 'in_progress') {
                \App\Models\LmsSubmission::where([
                    'assignment_id' => $remedial->assignment_id,
                    'student_id'    => $remedial->student_id,
                ])->update([
                    'is_remedial_open' => true,
                ]);
            }
        }

        $typeName = $remedial->type === 'remedial' ? 'Remedial' : 'Pengayaan';
        return redirect()->route('remedial.index')
            ->with('success', "Record {$typeName} berhasil diperbarui.");
    }

    public function destroy(LmsRemedialRecord $remedial)
    {
        $this->authorizeTeacher($remedial);
        $remedial->delete();

        $typeName = $remedial->type === 'remedial' ? 'Remedial' : 'Pengayaan';
        return redirect()->route('remedial.index')
            ->with('success', "Record {$typeName} berhasil dihapus.");
    }

    protected function authorizeTeacher(LmsRemedialRecord $record)
    {
        $teacher = Auth::user()->teacher;
        if ($record->teacher_id !== $teacher->id) {
            abort(403);
        }
    }
}
