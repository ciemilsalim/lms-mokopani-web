<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\LmsAssignment;
use App\Models\LmsLearningObjective;
use App\Models\LmsSubmission;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Student;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Models\GradebookFinalScore;
use App\Models\LmsP5Project;
use App\Models\LmsP5Dimensi;
use App\Services\RaporCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class GradebookController extends Controller
{
    protected RaporCalculationService $calculationService;

    public function __construct(RaporCalculationService $calculationService)
    {
        $this->calculationService = $calculationService;
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        if ($user->teacher || $user->role === 'admin') {
            $query = TeachingAssignment::with(['subject', 'schoolClass.students'])
                ->whereHas('schoolClass');
            if ($user->teacher && $user->role !== 'admin') {
                $query->where('teacher_id', $user->teacher->id);
            }

            if ($activeYear && $activeSemester) {
                $query->where(function ($q) use ($activeYear, $activeSemester) {
                    $q->where(function ($sub) use ($activeYear, $activeSemester) {
                        $sub->where('academic_year_id', $activeYear->id)
                            ->where('semester_id', $activeSemester->id);
                    })->orWhere(function ($sub) {
                        $sub->whereNull('academic_year_id')
                            ->whereNull('semester_id');
                    });
                });
            } elseif ($activeYear) {
                $query->where(function ($q) use ($activeYear) {
                    $q->where('academic_year_id', $activeYear->id)
                        ->orWhereNull('academic_year_id');
                });
            }

            $rawTeachings = $query->get()->filter(fn ($t) => $t->schoolClass !== null);

            $mappedTeachings = $rawTeachings->map(fn ($t) => [
                'id'            => $t->id,
                'subject_id'    => $t->subject_id,
                'subject_name'  => $t->subject?->name ?? '-',
                'class_id'      => $t->school_class_id,
                'class_name'    => $t->schoolClass?->name ?? '-',
                'student_count' => $t->schoolClass?->students?->count() ?? 0,
            ]);

            // Deduplicate by subject_id + normalized class_name, prioritizing classes with active students
            $dedupedTeachings = $mappedTeachings
                ->sortByDesc('student_count')
                ->unique(fn ($t) => $t['subject_id'] . '-' . strtolower(trim($t['class_name'])));

            // If teacher has active classes with students, exclude any abandoned/ghost classes with 0 students
            if ($dedupedTeachings->contains(fn ($t) => $t['student_count'] > 0)) {
                $dedupedTeachings = $dedupedTeachings->filter(fn ($t) => $t['student_count'] > 0);
            }

            $dedupedTeachings = $dedupedTeachings
                ->sortBy(function ($t) {
                    return sprintf('%-50s %-50s', $t['class_name'], $t['subject_name']);
                }, SORT_NATURAL | SORT_FLAG_CASE)
                ->values();

            // Extract unique sorted classes for quick filter pills based on deduplicated teachings
            $classes = $dedupedTeachings->map(fn ($t) => [
                'id'   => $t['class_id'],
                'name' => $t['class_name'],
            ])
            ->unique('name')
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

            $teachings = $dedupedTeachings->values();

            $selectedClassId = $request->query('class_id') ? (int) $request->query('class_id') : null;

            return Inertia::render('gradebook/index', [
                'teachings'         => $teachings,
                'classes'           => $classes,
                'selected_class_id' => $selectedClassId,
                'period'            => ($activeYear?->name ?? '') . ($activeSemester ? ' - ' . $activeSemester->name : ''),
            ]);
        }

        if ($user->student) {
            return $this->studentReport($user->student);
        }

        if ($user->parent) {
            return redirect()->route('parent.dashboard');
        }

        abort(403);
    }

    public function getEvaluatedTpsForClass($subjectId, $classId, $activeYear = null, $activeSemester = null)
    {
        return $this->calculationService->getEvaluatedTpsForClass($subjectId, $classId, $activeYear, $activeSemester);
    }

    public function show(Request $request)
    {
        $user = Auth::user();
        $teacher = $user->teacher;
        $classId = $request->query('class_id');
        $subjectId = $request->query('subject_id');
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        if (!$classId || !$subjectId) {
            return redirect()->route('gradebook.index');
        }

        // 1. Authorize: Ensure logged-in teacher is assigned to this subject & class (or user is admin)
        if (!$teacher && $user->role !== 'admin') {
            abort(403, 'Akses khusus guru mata pelajaran.');
        }

        if ($teacher && $user->role !== 'admin') {
            $isAssigned = TeachingAssignment::where('teacher_id', $teacher->id)
                ->where('subject_id', $subjectId)
                ->where('school_class_id', $classId)
                ->exists();
            if (!$isAssigned) {
                abort(403, 'Anda tidak memiliki penugasan mengajar untuk mata pelajaran dan kelas ini.');
            }
        }

        $subject = Subject::find($subjectId);
        $schoolClass = SchoolClass::find($classId);
        if (!$subject || !$schoolClass) {
            return redirect()->route('gradebook.index');
        }

        $teachingAssignment = TeachingAssignment::with('teacher')
            ->where('subject_id', $subjectId)
            ->where('school_class_id', $classId)
            ->first();
        $teacherName = $teacher ? $teacher->name : ($teachingAssignment?->teacher?->name ?? '-');

        // 2. Ambil semua tugas untuk kelas & mapel ini
        $allAssignments = LmsAssignment::with(['learningObjective', 'schoolClasses'])
            ->whereHas('schoolClasses', function ($q) use ($classId) { $q->where('school_classes.id', $classId); })
            ->where('subject_id', $subjectId)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        $summativeAssignments = $allAssignments->where('assessment_type', 'summative')->sortBy('id')->values();
        $initialAssignments = $allAssignments->where('assessment_type', 'initial')->sortBy('id')->values();
        $formativeAssignments = $allAssignments->where('assessment_type', 'formative')->sortBy('id')->values();

        // 3. Ambil TP yang terfilter spesifik untuk kelas & mapel ini
        $tps = $this->getEvaluatedTpsForClass($subjectId, $classId, $activeYear, $activeSemester);

        // 4. Bangun Kolom Asesmen Sumatif secara Lengkap:
        // Setiap tugas sumatif yang dibuat untuk kelas ini PASTI menjadi kolom penilaian sumatif
        $summativeColumns = collect();
        foreach ($summativeAssignments as $asm) {
            $tpObj = $asm->learningObjective;
            $tpCode = $tpObj?->code ?: ('Sumatif ' . ($summativeColumns->count() + 1));
            $summativeColumns->push([
                'key'           => 'asm_' . $asm->id,
                'assignment_id' => $asm->id,
                'tp_id'         => $tpObj?->id ?? $asm->id,
                'title'         => $asm->title,
                'tp'            => $tpCode,
                'tp_desc'       => $tpObj?->description ?: $asm->description,
                'type'          => 'assignment',
            ]);
        }

        // TP yang belum ada penugasan asesmen sumatifnya ditampilkan sebagai kolom target kurikulum (placeholder)
        $coveredTpIds = $summativeAssignments->pluck('learning_objective_id')->filter()->unique();
        foreach ($tps as $tp) {
            $isCovered = $coveredTpIds->contains($tp->id);
            if (!$isCovered && $tp->parent_id) {
                $isCovered = $coveredTpIds->contains($tp->parent_id);
            }
            if (!$isCovered && $tp->subObjectives && $tp->subObjectives->isNotEmpty()) {
                $isCovered = $coveredTpIds->intersect($tp->subObjectives->pluck('id'))->isNotEmpty();
            }

            if (!$isCovered) {
                $summativeColumns->push([
                    'key'           => 'tp_' . $tp->id,
                    'assignment_id' => null,
                    'tp_id'         => $tp->id,
                    'title'         => 'Sumatif',
                    'tp'            => $tp->code ?: ('TP ' . ($summativeColumns->count() + 1)),
                    'tp_desc'       => $tp->description,
                    'type'          => 'tp',
                ]);
            }
        }

        // 5. Ambil semua siswa di kelas ini
        $students = Student::where('school_class_id', $classId)->orderBy('name', 'asc')->get(['id', 'name', 'nis']);

        // 6. Ambil semua nilai dan index untuk pencarian O(1)
        $submissions = LmsSubmission::whereIn('assignment_id', $allAssignments->pluck('id'))->get();
        $submissionsByKey = $submissions->keyBy(fn($sub) => $sub->student_id . '_' . $sub->assignment_id);

        // 7. Load existing final scores
        $finalScores = GradebookFinalScore::where('subject_id', $subjectId)
            ->where('school_class_id', $classId)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get()
            ->keyBy('student_id');

        // 8. Format data nilai per siswa
        $gradeData = $students->map(function ($student) use ($summativeColumns, $summativeAssignments, $initialAssignments, $formativeAssignments, $submissionsByKey, $finalScores, $subjectId, $tps, $submissions) {
            $summativeScores = $summativeColumns->map(function ($col) use ($student, $submissionsByKey) {
                if ($col['type'] === 'assignment' && $col['assignment_id']) {
                    $sub = $submissionsByKey->get($student->id . '_' . $col['assignment_id']);
                    $hasSubmittedWithScore = ($sub && $sub->score !== null && $sub->score !== '');
                    // Aturan: Jika sumatif sudah diterbitkan tapi siswa belum mengerjakan, nilainya 0 agar bisa diakumulasi
                    $score = $hasSubmittedWithScore ? (float) $sub->score : 0;
                    return [
                        'tp_id'          => $col['tp_id'],
                        'tp_code'        => $col['tp'],
                        'title'          => $col['title'],
                        'score'          => $score,
                        'submitted'      => $hasSubmittedWithScore,
                        'is_top_level'   => true,
                        'has_assignment' => true,
                    ];
                } else {
                    return [
                        'tp_id'          => $col['tp_id'],
                        'tp_code'        => $col['tp'],
                        'title'          => $col['title'],
                        'score'          => '-',
                        'submitted'      => false,
                        'is_top_level'   => true,
                        'has_assignment' => false,
                    ];
                }
            });

            // Initial assessment scores
            $initialScores = $initialAssignments->values()->map(function ($a) use ($student, $submissionsByKey) {
                $sub = $submissionsByKey->get($student->id . '_' . $a->id);
                return [
                    'id'    => $a->id,
                    'title' => $a->title,
                    'score' => ($sub && $sub->score !== null && $sub->score !== '') ? (float) $sub->score : '-',
                    'type'  => $a->assessment_type,
                ];
            });

            // Formative assessment scores (Nilai formatif tidak perlu dijumlahkan)
            $formativeScores = $formativeAssignments->values()->map(function ($a) use ($student, $submissionsByKey) {
                $sub = $submissionsByKey->get($student->id . '_' . $a->id);
                return [
                    'id'    => $a->id,
                    'title' => $a->title,
                    'score' => ($sub && $sub->score !== null && $sub->score !== '') ? (float) $sub->score : '-',
                    'type'  => $a->assessment_type,
                ];
            });

            // Akumulasi nilai sumatif & capaian rapor menggunakan unified calculation service
            $reportCalc = $this->calculationService->calculateStudentSubjectReport(
                $student->id,
                $subjectId,
                $tps,
                $summativeAssignments,
                $submissions,
                $finalScores->get($student->id)?->score,
                get_kktp($subjectId)
            );

            $average = $reportCalc['tp_average'] ?? 0;
            $totalSumatif = $reportCalc['tp_average'] !== null ? round($reportCalc['tp_average']) : 0;
            $description = $reportCalc['description'];

            return [
                'student_id'    => $student->id,
                'student_name'  => $student->name,
                'student_nis'   => $student->nis ?? '-',
                'summative'     => $summativeScores,
                'initial'       => $initialScores,
                'formative'     => $formativeScores,
                'total_sumatif' => $totalSumatif,
                'sumatif_akhir' => $reportCalc['sas_score'] ?? 0,
                'average'       => $average,
                'final_score'   => $reportCalc['final_score'],
                'description'   => $description,
            ];
        });

        return Inertia::render('gradebook/show', [
            'summative_headers' => $summativeColumns->values()->map(fn($col) => [
                'id'             => $col['key'],
                'title'          => $col['title'],
                'tp'             => $col['tp'],
                'tp_desc'        => $col['tp_desc'],
                'type'           => $col['type'],
                'has_assignment' => ($col['type'] === 'assignment'),
            ]),
            'initial_headers'   => $initialAssignments->values()->map(fn($a) => ['id' => $a->id, 'title' => $a->title, 'type' => $a->assessment_type]),
            'formative_headers' => $formativeAssignments->values()->map(fn($a) => ['id' => $a->id, 'title' => $a->title, 'type' => $a->assessment_type]),
            'gradeData'         => $gradeData,
            'period'            => ($activeYear?->name ?? '') . ($activeSemester ? ' - ' . $activeSemester->name : ''),
            'subject_name'      => $subject->name,
            'class_name'        => $schoolClass->name,
            'teacher_name'      => $teacherName,
            'subject_id'        => (int) $subjectId,
            'class_id'          => (int) $classId,
            'kktp'              => get_kktp($subjectId),
            'school_name'       => school_setting('school_name', config('app.name')),
            'school_address'    => school_setting('school_address', ''),
            'headmaster_name'   => school_setting('school_headmaster_name', ''),
            'headmaster_nip'    => school_setting('school_headmaster_nip', ''),
        ]);
    }

    public function finalReport(Request $request)
    {
        $user = Auth::user();
        $teacher = $user->teacher;
        $classId = $request->query('class_id');
        $subjectId = $request->query('subject_id');
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        if (!$classId || !$subjectId) {
            return redirect()->route('gradebook.index');
        }

        // 1. Authorize: Ensure logged-in teacher is assigned to this subject & class (or user is admin)
        if (!$teacher && $user->role !== 'admin') {
            abort(403, 'Akses khusus guru mata pelajaran.');
        }

        if ($teacher && $user->role !== 'admin') {
            $isAssigned = TeachingAssignment::where('teacher_id', $teacher->id)
                ->where('subject_id', $subjectId)
                ->where('school_class_id', $classId)
                ->exists();
            if (!$isAssigned) {
                abort(403, 'Anda tidak memiliki penugasan mengajar untuk mata pelajaran dan kelas ini.');
            }
        }

        $subject = Subject::find($subjectId);
        $schoolClass = SchoolClass::find($classId);
        if (!$subject || !$schoolClass) {
            return redirect()->route('gradebook.index');
        }

        $teachingAssignment = TeachingAssignment::with('teacher')
            ->where('subject_id', $subjectId)
            ->where('school_class_id', $classId)
            ->first();
        $teacherName = $teacher ? $teacher->name : ($teachingAssignment?->teacher?->name ?? '-');

        // 2. Ambil TP yang terfilter spesifik untuk kelas ini (sub-TP jika ada, atau parent TP jika standalone)
        $objectives = $this->getEvaluatedTpsForClass($subjectId, $classId, $activeYear, $activeSemester);

        // 3. Ambil semua tugas sumatif untuk kelas & mapel ini pada periode aktif
        $assignments = LmsAssignment::where('subject_id', $subjectId)
            ->whereHas('schoolClasses', function ($q) use ($classId) {
                $q->where('school_classes.id', $classId);
            })
            ->where('assessment_type', 'summative')
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        // 4. Ambil semua siswa & nilai pada kelas ini
        $students = Student::where('school_class_id', $classId)->orderBy('name', 'asc')->get();
        $submissions = LmsSubmission::whereIn('assignment_id', $assignments->pluck('id'))
            ->whereIn('student_id', $students->pluck('id'))
            ->get();

        $finalScores = GradebookFinalScore::where('subject_id', $subjectId)
            ->where('school_class_id', $classId)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get()
            ->keyBy('student_id');

        $kktp = get_kktp($subjectId);

        // 5. Perhitungan Akurat TP & Rapor Akhir per Siswa Menggunakan Unified Service
        $reportData = $students->map(function ($student) use ($assignments, $submissions, $objectives, $finalScores, $kktp, $subjectId) {
            $calc = $this->calculationService->calculateStudentSubjectReport(
                $student->id,
                $subjectId,
                $objectives,
                $assignments,
                $submissions,
                $finalScores->get($student->id)?->score,
                $kktp
            );

            return [
                'nis'         => $student->nis ?? '-',
                'name'        => $student->name,
                'final_score' => $calc['final_score'],
                'tp_average'  => $calc['tp_average'],
                'sas_score'   => $calc['sas_score'],
                'description' => $calc['description'],
                'tp_scores'   => collect($calc['tp_scores'])->map(fn($t) => [
                    'code'           => $t['code'],
                    'description'    => $t['description'],
                    'score'          => $t['score'],
                    'has_assignment' => $t['has_assignment'],
                ])->values()->all(),
            ];
        });

        return Inertia::render('gradebook/final-report', [
            'reportData'     => $reportData,
            'subject_name'   => $subject->name,
            'class_name'     => $schoolClass->name,
            'teacher_name'   => $teacherName,
            'period'         => $activeYear?->name . ' - ' . $activeSemester?->name,
            'subject_id'     => (int) $subjectId,
            'class_id'       => (int) $classId,
            'kktp'           => $kktp,
            'school_name'    => school_setting('school_name', config('app.name')),
            'school_address' => school_setting('school_address', ''),
            'headmaster_name' => school_setting('school_headmaster_name', ''),
            'headmaster_nip'  => school_setting('school_headmaster_nip', ''),
        ]);
    }

    protected function studentReport($student)
    {
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        // Ambil semua tugas untuk kelas siswa ini di periode aktif
        $assignments = LmsAssignment::with('subject')
            ->whereHas('schoolClasses', function ($q) use ($student) { $q->where('school_classes.id', $student->school_class_id); })
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        // Ambil nilai siswa
        $submissions = \App\Models\LmsSubmission::whereIn('assignment_id', $assignments->pluck('id'))
            ->where('student_id', $student->id)
            ->get();

        // Ambil record remedial siswa
        $remedialRecords = \App\Models\LmsRemedialRecord::where('student_id', $student->id)
            ->whereIn('assignment_id', $assignments->pluck('id'))
            ->get()
            ->keyBy('assignment_id');

        // Ambil data absensi mata pelajaran dari db_absen
        $attendancesQuery = \App\Models\SubjectAttendance::with(['schedule.teachingAssignment'])
            ->where('student_id', $student->id);

        if ($activeYear && $activeSemester) {
            $attendancesQuery->where(function ($q) use ($activeYear, $activeSemester) {
                $q->where(function ($sub) use ($activeYear, $activeSemester) {
                    $sub->where('academic_year_id', $activeYear->id)
                        ->where('semester_id', $activeSemester->id);
                })->orWhere(function ($sub) {
                    $sub->whereNull('academic_year_id')
                        ->whereNull('semester_id');
                });
            });
        } elseif ($activeYear) {
            $attendancesQuery->where(function ($q) use ($activeYear) {
                $q->where('academic_year_id', $activeYear->id)
                    ->orWhereNull('academic_year_id');
            });
        }

        $attendances = $attendancesQuery->get();

        // Pre-fetch semua Learning Objectives yang dibutuhkan (menghindari N+1 query)
        $allTpIds = $assignments->pluck('learning_objective_id')->unique()->filter()->values();
        $allTps = \App\Models\LmsLearningObjective::with('capaianPembelajaran')->whereIn('id', $allTpIds)->get()->keyBy('id');

        // Pre-fetch Final Scores (SAS/ASAT) untuk siswa ini
        $finalScores = GradebookFinalScore::where('student_id', $student->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get()
            ->keyBy('subject_id');

        $report = $assignments->groupBy('subject_id')->map(function ($subjectAssignments) use ($submissions, $remedialRecords, $attendances, $student, $allTps, $finalScores, $activeYear, $activeSemester) {
            $subjectId = $subjectAssignments->first()->subject_id;
            $subjectName = $subjectAssignments->first()->subject->name;
            $subjectKktp = get_kktp($subjectId);
            
            // Hitung Absensi untuk Mapel ini
            $subjectAttendances = $attendances->filter(function($a) use ($subjectId) {
                return $a->schedule?->teachingAssignment?->subject_id == $subjectId;
            });

            $totalMeetings = $subjectAttendances->count();
            $presentCount = $subjectAttendances->filter(fn($a) => in_array(strtolower(trim($a->status ?? '')), ['hadir', 'present', 'h']))->count();
            $attendancePercentage = $totalMeetings > 0 ? round(($presentCount / $totalMeetings) * 100) : 100;

            $items = $subjectAssignments->map(function ($assignment) use ($submissions, $remedialRecords) {
                $submission = $submissions->where('assignment_id', $assignment->id)->first();
                $remedial = $remedialRecords->get($assignment->id);
                
                $isRemedialOpen = $submission ? (bool)$submission->is_remedial_open : false;
                $remedialStatus = $remedial?->status; // 'assigned', 'in_progress', 'completed'
                
                // Masih remedial jika: is_remedial_open bernilai true,
                // ATAU ada LmsRemedialRecord dengan status 'assigned' atau 'in_progress'
                $isRemedial = $isRemedialOpen || ($remedial && in_array($remedialStatus, ['assigned', 'in_progress']));

                return [
                    'id'               => $assignment->id,
                    'title'            => $assignment->title,
                    'score'            => $submission?->score ?? '-',
                    'max_points'       => $assignment->max_points,
                    'status'           => $submission ? 'Selesai' : 'Belum Mengerjakan',
                    'type'             => $assignment->assessment_type,
                    'tp_id'            => $assignment->learning_objective_id,
                    'is_remedial'      => $isRemedial,
                    'remedial_status'  => $remedialStatus,
                ];
            });

            $subjectSummativeAssignments = $subjectAssignments->where('assessment_type', 'summative');
            $subjectEvaluatedTps = $this->calculationService->getEvaluatedTpsForClass($subjectId, $student->school_class_id, $activeYear, $activeSemester);

            $calc = $this->calculationService->calculateStudentSubjectReport(
                $student->id,
                $subjectId,
                $subjectEvaluatedTps,
                $subjectSummativeAssignments,
                $submissions,
                $finalScores->get($subjectId)?->score,
                $subjectKktp
            );

            $average = $calc['tp_average'] ?? 0;
            $finalScore = $calc['final_score'];
            $sasScore = $calc['sas_score'];
            $description = $calc['description'];

            // Grouping by CP -> TP -> Assignments
            $groupedByCp = [];
            foreach ($items as $item) {
                $tp = $allTps->get($item['tp_id']);
                $cp = $tp ? $tp->capaianPembelajaran : null;
                
                $cpId = $cp ? $cp->id : 0;
                $cpLabel = $cp ? $cp->elemen : 'Lainnya';
                if (!$cpLabel && $cp && $cp->deskripsi) {
                    $cpLabel = mb_strimwidth(strip_tags($cp->deskripsi), 0, 50, '...');
                }
                $cpDesc = $cp ? $cp->deskripsi : '';
                
                $tpId = $tp ? $tp->id : 0;
                $tpLabel = $tp ? ($tp->code . ': ' . $tp->description) : 'Tanpa TP';
                
                if (!isset($groupedByCp[$cpId])) {
                    $groupedByCp[$cpId] = [
                        'id' => $cpId,
                        'label' => $cpLabel,
                        'description' => $cpDesc,
                        'tps' => []
                    ];
                }
                
                if (!isset($groupedByCp[$cpId]['tps'][$tpId])) {
                    $groupedByCp[$cpId]['tps'][$tpId] = [
                        'id' => $tpId,
                        'label' => $tpLabel,
                        'assignments' => []
                    ];
                }
                
                $groupedByCp[$cpId]['tps'][$tpId]['assignments'][] = $item;
            }
            
            // Format to indexed array and sort assignments
            $cpGroups = array_values(array_map(function($cpGrp) {
                $cpGrp['tps'] = array_values(array_map(function($tpGrp) {
                    $typeOrder = ['initial' => 1, 'formative' => 2, 'summative' => 3];
                    usort($tpGrp['assignments'], function($a, $b) use ($typeOrder) {
                        $orderA = $typeOrder[$a['type']] ?? 99;
                        $orderB = $typeOrder[$b['type']] ?? 99;
                        return $orderA <=> $orderB;
                    });
                    return $tpGrp;
                }, $cpGrp['tps']));
                return $cpGrp;
            }, $groupedByCp));

            $hasRemedial = $items->contains('is_remedial', true);

            return [
                'subject_id'            => $subjectId,
                'subject_name'          => $subjectName,
                'cps'                   => $cpGroups,
                'average'               => $finalScore,
                'tp_average'            => $average,
                'sas_score'             => $sasScore,
                'description'           => $description,
                'attendance_percentage' => $attendancePercentage,
                'total_meetings'        => $totalMeetings,
                'has_remedial'          => $hasRemedial,
            ];
        })->values();

        // Fetch P5 Projects for this student's class
        $p5Projects = LmsP5Project::with(['scores'])
            ->where('school_class_id', $student->school_class_id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        $allDimensiIds = $p5Projects->pluck('dimensi_ids')->flatten()->unique()->filter()->values()->toArray();
        $allDimensi = LmsP5Dimensi::whereIn('id', $allDimensiIds)
            ->with(['elements.subElements'])
            ->get()
            ->keyBy('id');

        $formattedP5 = $p5Projects->map(function ($project) use ($student, $allDimensi) {
            $projectDimensiIds = $project->dimensi_ids ?? [];
            $dimensi = collect($projectDimensiIds)
                ->map(fn($id) => $allDimensi->get($id))
                ->filter();

            $studentScores = $project->scores
                ->where('student_id', $student->id)
                ->keyBy('sub_element_id');

            $dimensiData = $dimensi
                ->map(fn($d) => [
                    'id'       => $d->id,
                    'kode'     => $d->kode,
                    'nama'     => $d->nama,
                    'elements' => $d->elements
                        ->map(fn($e) => [
                            'id'           => $e->id,
                            'nama'         => $e->nama,
                            'sub_elements' => $e->subElements
                                ->map(fn($se) => [
                                    'id'      => $se->id,
                                    'nama'    => $se->nama,
                                    'nilai'   => $studentScores->get($se->id)?->nilai ?? '-',
                                    'catatan' => $studentScores->get($se->id)?->catatan ?? '',
                                ])->values()->all(),
                        ])->values()->all(),
                ])->values()->all();

            return [
                'id'            => $project->id,
                'judul'         => $project->title,
                'deskripsi'     => $project->description,
                'tema'          => $project->theme,
                'alokasi_waktu' => $project->duration_hours,
                'status'        => $project->status,
                'dimensi'       => $dimensiData,
            ];
        })->values()->all();

        return Inertia::render('gradebook/student', [
            'report'      => $report,
            'p5_projects' => $formattedP5,
            'period'      => $activeYear?->name . ' - ' . $activeSemester?->name,
        ]);
    }

    public function learningReport(Request $request, $class_id, $subject_id)
    {
        $user = Auth::user();
        $teacher = $user->teacher ?? \App\Models\Teacher::where('user_id', $user->id)->first();

        if ($user->role !== 'admin') {
            if (!$teacher) {
                abort(403, 'Akses khusus guru mata pelajaran.');
            }
            $isAssigned = TeachingAssignment::where('teacher_id', $teacher->id)
                ->where('subject_id', $subject_id)
                ->where('school_class_id', $class_id)
                ->exists();
            if (!$isAssigned) {
                abort(403, 'Anda tidak memiliki penugasan mengajar untuk mata pelajaran dan kelas ini.');
            }
        }

        $subject = Subject::findOrFail($subject_id);
        $class = SchoolClass::findOrFail($class_id);
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();
        $kktp = get_kktp($subject_id);

        $tps = $this->getEvaluatedTpsForClass($subject_id, $class_id, $activeYear, $activeSemester);

        $students = $class->students()->orderBy('name')->get();
        $assignments = LmsAssignment::where('subject_id', $subject_id)
            ->whereHas('schoolClasses', function ($q) use ($class_id) { $q->where('school_classes.id', $class_id); })
            ->where('assessment_type', 'summative')
            ->get();

        $submissions = LmsSubmission::whereIn('assignment_id', $assignments->pluck('id'))
            ->get()
            ->groupBy('student_id');

        $reportData = $students->map(function($student) use ($tps, $assignments, $submissions, $kktp) {
            $studentSubmissions = $submissions->get($student->id, collect());
            $totalSummative = 0;
            $countSummative = 0;
            $tpScores = [];

            foreach ($tps as $tp) {
                $tpAssignment = $assignments->where('learning_objective_id', $tp->id)->first();
                if (!$tpAssignment && $tp->parent_id) {
                    $tpAssignment = $assignments->where('learning_objective_id', $tp->parent_id)->first();
                }
                $score = 0;

                if ($tpAssignment) {
                    $submission = $submissions->get($student->id)?->where('assignment_id', $tpAssignment->id)->first();
                    $score = $submission?->score ?? 0;
                }

                $passed = $score >= $kktp;
                $tpScores[$tp->id] = [
                    'score' => $score,
                    'passed' => $passed,
                    'kktp' => $kktp,
                ];

                if ($score > 0) {
                    $totalSummative += $score;
                    $countSummative++;
                }
            }

            $finalScore = $countSummative > 0 ? round($totalSummative / $countSummative) : 0;
            $passedCount = collect($tpScores)->filter(fn($s) => $s['passed'])->count();

            return [
                'student_id'    => $student->id,
                'student_name'  => $student->name,
                'tp_scores'     => $tpScores,
                'final_score'   => $finalScore,
                'passed_tps'    => $passedCount,
                'total_tps'     => $tps->count(),
                'competence'    => $finalScore >= $kktp ? 'Kompeten' : 'Belum Kompeten',
                'needs_remedial' => $finalScore > 0 && $finalScore < $kktp,
            ];
        });

        return Inertia::render('gradebook/report-learning', [
            'subject'   => ['id' => $subject->id, 'name' => $subject->name, 'code' => $subject->code],
            'class'     => ['id' => $class->id, 'name' => $class->name],
            'tps'       => $tps,
            'reportData'=> $reportData,
            'period'    => $activeYear?->name . ' - ' . $activeSemester?->name,
            'kktp'      => $kktp,
        ]);
    }

    public function updateFinalScore(Request $request)
    {
        $user = Auth::user();
        $teacher = $user?->teacher;

        if ($user?->role !== 'admin' && !$teacher) {
            abort(403);
        }

        $validated = $request->validate([
            'student_id'  => 'required|exists:students,id',
            'subject_id'  => 'required|exists:subjects,id',
            'class_id'    => 'required|exists:school_classes,id',
            'score'       => 'required|integer|min:0',
        ]);

        if ($user->role !== 'admin' && $teacher) {
            $isAssigned = TeachingAssignment::where('teacher_id', $teacher->id)
                ->where('subject_id', $validated['subject_id'])
                ->where('school_class_id', $validated['class_id'])
                ->exists();

            if (!$isAssigned) {
                abort(403, 'Anda tidak memiliki hak akses untuk menginput nilai pada kelas dan mata pelajaran ini.');
            }
        }

        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        GradebookFinalScore::updateOrCreate(
            [
                'student_id'       => $validated['student_id'],
                'subject_id'       => $validated['subject_id'],
                'school_class_id'  => $validated['class_id'],
                'academic_year_id' => $activeYear?->id,
                'semester_id'      => $activeSemester?->id,
            ],
            [
                'score' => $validated['score'],
            ]
        );

        return response()->json(['success' => true]);
    }
}
