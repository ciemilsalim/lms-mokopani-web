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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class GradebookController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        if ($user->teacher) {
            $teachings = TeachingAssignment::with(['subject', 'schoolClass'])
                ->where('teacher_id', $user->teacher->id)
                ->get()
                ->map(fn ($t) => [
                    'id'           => $t->id,
                    'subject_id'   => $t->subject_id,
                    'subject_name' => $t->subject->name,
                    'class_id'     => $t->school_class_id,
                    'class_name'   => $t->schoolClass->name,
                ]);

            return Inertia::render('gradebook/index', [
                'teachings' => $teachings
            ]);
        }

        if ($user->student) {
            return $this->studentReport($user->student);
        }

        abort(403);
    }

    public function show(Request $request)
    {
        $teacher = Auth::user()->teacher;
        $classId = $request->query('class_id');
        $subjectId = $request->query('subject_id');
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        if (!$classId || !$subjectId) {
            return redirect()->route('gradebook.index');
        }

        // 1. Get all TPs for this subject (Primary Headers)
        $tps = LmsLearningObjective::where('subject_id', $subjectId)->orderBy('code')->get();

        // 2. Ambil semua tugas untuk kelas & mapel ini
        $allAssignments = LmsAssignment::with('learningObjective')
            ->whereHas('schoolClasses', function ($q) use ($classId) { $q->where('school_classes.id', $classId); })
            ->where('subject_id', $subjectId)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        $summativeAssignments = $allAssignments->where('assessment_type', 'summative');
        $initialAssignments = $allAssignments->where('assessment_type', 'initial');
        $formativeAssignments = $allAssignments->where('assessment_type', 'formative');

        // 3. Ambil semua siswa di kelas ini
        $students = Student::where('school_class_id', $classId)->orderBy('name', 'asc')->get(['id', 'name', 'nis']);

        // 4. Ambil semua nilai
        $submissions = LmsSubmission::whereIn('assignment_id', $allAssignments->pluck('id'))->get();

        // 5. Load existing final scores
        $finalScores = GradebookFinalScore::where('subject_id', $subjectId)
            ->where('school_class_id', $classId)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get()
            ->keyBy('student_id');

        // 6. Format data
        $gradeData = $students->map(function ($student) use ($tps, $summativeAssignments, $initialAssignments, $formativeAssignments, $submissions, $finalScores, $subjectId) {
            // Map scores to TPs - Step 1: Direct Scores
            $directScores = $tps->mapWithKeys(function ($tp) use ($student, $summativeAssignments, $submissions) {
                $assignment = $summativeAssignments->where('learning_objective_id', $tp->id)->first();
                $score = 0; // Asumsi 0 untuk semua TP
                if ($assignment) {
                    $sub = $submissions->where('student_id', $student->id)->where('assignment_id', $assignment->id)->first();
                    $score = $sub?->score ?? 0;
                }
                return [$tp->id => [
                    'score' => $score,
                    'has_assignment' => $assignment ? true : false
                ]];
            });

            // Map scores to TPs - Step 2: Accumulate for Parent TPs
            $summativeScores = $tps->map(function ($tp) use ($tps, $directScores) {
                $dir = $directScores[$tp->id];
                $score = $dir['score'];
                $isParent = !$tp->parent_id && $tps->where('parent_id', $tp->id)->count() > 0;
                
                $hasAssignment = $dir['has_assignment'];
                if ($isParent) {
                    $childDirs = $tps->where('parent_id', $tp->id)
                        ->map(fn($child) => $directScores[$child->id]);
                    
                    if ($childDirs->where('has_assignment', true)->count() > 0) {
                        $hasAssignment = true;
                    }
                    
                    $validScores = collect();
                    
                    // Hanya rata-ratakan dengan TP Induk jika TP Induk memang memiliki asesmen langsung
                    if ($dir['has_assignment']) {
                        $validScores->push($score);
                    }
                    
                    foreach ($childDirs as $cd) {
                        $validScores->push($cd['score']);
                    }
                    
                    if ($validScores->count() > 0) {
                        $score = round($validScores->avg());
                    } else {
                        $score = 0;
                    }
                }

                return [
                    'tp_id' => $tp->id,
                    'tp_code' => $tp->code,
                    'score' => $score,
                    'is_top_level' => !$tp->parent_id,
                    'has_assignment' => $hasAssignment
                ];
            });

            // Initial assessment scores
            $initialScores = $initialAssignments->values()->map(function ($a) use ($student, $submissions) {
                $sub = $submissions->where('student_id', $student->id)->where('assignment_id', $a->id)->first();
                return ['id' => $a->id, 'score' => $sub?->score ?? '-', 'type' => $a->assessment_type];
            });

            // Formative assessment scores
            $formativeScores = $formativeAssignments->values()->map(function ($a) use ($student, $submissions) {
                $sub = $submissions->where('student_id', $student->id)->where('assignment_id', $a->id)->first();
                return ['id' => $a->id, 'score' => $sub?->score ?? '-', 'type' => $a->assessment_type];
            });

            // Rata-rata keseluruhan hanya diambil dari Top-level TPs
            $topLevelScores = $summativeScores->filter(fn($s) => $s['is_top_level'])->pluck('score');
            $average = $topLevelScores->count() > 0 ? round($topLevelScores->avg(), 1) : 0;

            // Generate Deskripsi Otomatis HANYA dari TP yang sudah ada tugas/asesmennya
            $validScoresForDesc = $summativeScores->filter(fn($s) => $s['is_top_level'] && $s['has_assignment']);
            $hasAnySummativeSubmission = $submissions->where('student_id', $student->id)
                ->whereIn('assignment_id', $summativeAssignments->pluck('id'))->count() > 0;
            
            $description = '';
            if ($hasAnySummativeSubmission && $validScoresForDesc->count() > 0) {
                $highest = $validScoresForDesc->sortByDesc('score')->first();
                $lowest = $validScoresForDesc->sortBy('score')->first();
                
                $highTpObj = $tps->find($highest['tp_id']);
                $lowTpObj = $tps->find($lowest['tp_id']);
                
                $highLabel = $highTpObj ? $highTpObj->code . ": " . $highTpObj->description : "TP " . $highest['tp_code'];
                $lowLabel = $lowTpObj ? $lowTpObj->code . ": " . $lowTpObj->description : "TP " . $lowest['tp_code'];

                $subjectKktp = get_kktp($subjectId);
                $description = "Menunjukkan penguasaan yang sangat baik dalam {$highLabel}.";
                
                if ($lowest['score'] < $subjectKktp && $highest['tp_id'] !== $lowest['tp_id']) {
                    $description .= " Perlu peningkatan dalam {$lowLabel}.";
                }
            } else {
                $description = 'Siswa belum memiliki data penilaian yang mencukupi untuk membuat deskripsi capaian.';
            }

            return [
                'student_id'   => $student->id,
                'student_name' => $student->name,
                'student_nis'  => $student->nis,
                'summative'    => $summativeScores,
                'initial'      => $initialScores,
                'formative'    => $formativeScores,
                'sumatif_akhir' => $finalScores->get($student->id)?->score ?? 0, 
                'average'      => $average,
                'description'  => $description,
            ];
        });

        return Inertia::render('gradebook/show', [
            'summative_headers' => $tps->values()->map(fn($tp, $index) => [
                'id' => $tp->id,
                'title' => 'Sumatif',
                'tp' => $tp->code ?: ('TP ' . ($index + 1)),
                'tp_desc' => $tp->description,
            ]),
            'initial_headers'   => $initialAssignments->values()->map(fn($a) => ['id' => $a->id, 'title' => $a->title, 'type' => $a->assessment_type]),
            'formative_headers' => $formativeAssignments->values()->map(fn($a) => ['id' => $a->id, 'title' => $a->title, 'type' => $a->assessment_type]),
            'gradeData'         => $gradeData,
            'period'            => $activeYear?->name . ' - ' . $activeSemester?->name,
        ]);
    }

    public function finalReport(Request $request)
    {
        $teacher = Auth::user()->teacher;
        $classId = $request->query('class_id');
        $subjectId = $request->query('subject_id');
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        if (!$classId || !$subjectId) {
            return redirect()->route('gradebook.index');
        }

        // Ambil TP untuk mapel ini
        $objectives = LmsLearningObjective::where('subject_id', $subjectId)
            ->where('teacher_id', $teacher->id)
            ->get();

        // Ambil semua tugas sumatif
        $assignments = LmsAssignment::whereHas('schoolClasses', function ($q) use ($classId) { $q->where('school_classes.id', $classId); })
            ->where('subject_id', $subjectId)
            ->where('assessment_type', 'summative')
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        // Ambil semua siswa & nilai
        $students = Student::where('school_class_id', $classId)->orderBy('name', 'asc')->get();
        $submissions = LmsSubmission::whereIn('assignment_id', $assignments->pluck('id'))->get();

        $reportData = $students->map(function ($student) use ($assignments, $submissions, $objectives, $subjectId) {
            $studentSubmissions = $submissions->where('student_id', $student->id);

            // Analisis per TP untuk deskripsi dan perhitungan
            $tpDirectPerformances = $objectives->mapWithKeys(function ($tp) use ($assignments, $studentSubmissions) {
                $tpAssignments = $assignments->where('learning_objective_id', $tp->id);
                $tpSubmissions = $studentSubmissions->whereIn('assignment_id', $tpAssignments->pluck('id'));
                
                $score = 0; // Asumsi 0
                if ($tpSubmissions->count() > 0) {
                    $score = $tpSubmissions->avg('score');
                }
                
                return [$tp->id => [
                    'score' => $score,
                    'has_assignment' => $tpAssignments->count() > 0
                ]];
            });

            // Calculate accumulated scores for all TPs
            $accumulatedTPs = $objectives->map(function ($tp) use ($objectives, $tpDirectPerformances) {
                $dir = $tpDirectPerformances[$tp->id];
                $score = $dir['score'];
                $hasAssignment = $dir['has_assignment'];
                $isTopLevel = !$tp->parent_id;
                $isParent = $isTopLevel && $objectives->where('parent_id', $tp->id)->count() > 0;
                
                if ($isParent) {
                    $childDirs = $objectives->where('parent_id', $tp->id)
                        ->map(fn($child) => $tpDirectPerformances[$child->id]);
                    
                    if ($childDirs->where('has_assignment', true)->count() > 0) {
                        $hasAssignment = true;
                    }
                        
                    $validScores = collect();
                    if ($dir['has_assignment']) {
                        $validScores->push($score);
                    }
                    foreach ($childDirs as $cd) {
                        $validScores->push($cd['score']);
                    }
                    
                    if ($validScores->count() > 0) {
                        $score = $validScores->avg();
                    } else {
                        $score = 0;
                    }
                }

                return [
                    'code'        => $tp->code,
                    'description' => $tp->description,
                    'avg'         => $score,
                    'is_top_level'=> $isTopLevel,
                    'has_assignment' => $hasAssignment
                ];
            });

            $tpPerformances = $accumulatedTPs->filter(fn($tp) => $tp['is_top_level']);

            // Hitung rata-rata nilai sumatif HANYA dari Top Level TPs
            $finalScore = 0;
            if ($tpPerformances->count() > 0) {
                $finalScore = round($tpPerformances->avg('avg'));
            }

            // Hanya gunakan TP yang SUDAH ADA TUGAS untuk membuat deskripsi!
            $tpPerformancesForDesc = $tpPerformances->filter(fn($tp) => $tp['has_assignment']);
            $hasAnySummativeSubmission = $studentSubmissions->count() > 0;

            // Generate Deskripsi
            $description = "";
            if ($hasAnySummativeSubmission && $tpPerformancesForDesc->count() > 0) {
                $highest = $tpPerformancesForDesc->sortByDesc('avg')->first();
                $lowest = $tpPerformancesForDesc->sortBy('avg')->first();

                $description = "Menunjukkan penguasaan yang sangat baik dalam hal {$highest['description']}.";
                
                $kktp = get_kktp($subjectId);
                if ($lowest && $lowest['avg'] < $kktp && $highest['code'] !== $lowest['code']) {
                    $description .= " Perlu bimbingan lebih lanjut dalam hal {$lowest['description']}.";
                }
            } else {
                $description = "Siswa belum memiliki data penilaian yang mencukupi untuk membuat deskripsi capaian.";
            }

            return [
                'nis'         => $student->nis,
                'name'        => $student->name,
                'final_score' => $finalScore,
                'description' => $description,
            ];
        });

        return Inertia::render('gradebook/final-report', [
            'reportData'     => $reportData,
            'subject_name'   => \App\Models\Subject::find($subjectId)?->name,
            'class_name'     => \App\Models\SchoolClass::find($classId)?->name,
            'teacher_name'   => $teacher->name,
            'period'         => $activeYear?->name . ' - ' . $activeSemester?->name,
            'subject_id'     => (int) $subjectId,
            'class_id'       => (int) $classId,
            'kktp'           => get_kktp($subjectId),
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
        $attendances = \App\Models\SubjectAttendance::with(['schedule.teachingAssignment'])
            ->where('student_id', $student->id)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        // Pre-fetch semua Learning Objectives yang dibutuhkan (menghindari N+1 query)
        $allTpIds = $assignments->pluck('learning_objective_id')->unique()->filter()->values();
        $allTps = \App\Models\LmsLearningObjective::with('capaianPembelajaran')->whereIn('id', $allTpIds)->get()->keyBy('id');

        $report = $assignments->groupBy('subject_id')->map(function ($subjectAssignments) use ($submissions, $remedialRecords, $attendances, $student, $allTps) {
            $subjectId = $subjectAssignments->first()->subject_id;
            $subjectName = $subjectAssignments->first()->subject->name;
            $subjectKktp = get_kktp($subjectId);
            
            // Hitung Absensi untuk Mapel ini
            $subjectAttendances = $attendances->filter(function($a) use ($subjectId) {
                return $a->schedule?->teachingAssignment?->subject_id == $subjectId;
            });

            $totalMeetings = $subjectAttendances->count();
            $presentCount = $subjectAttendances->where('status', 'Hadir')->count();
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

            $summativeItems = $items->where('type', 'summative')->where('score', '!==', '-');
            $totalScore = $summativeItems->sum('score');
            $count = $summativeItems->count();
            $average = $count > 0 ? round($totalScore / $count) : 0;

            // Generate Deskripsi Capaian Kompetensi
            $description = "Menunjukkan penguasaan yang baik dalam materi pembelajaran.";
            if ($count > 0) {
                $highest = $summativeItems->sortByDesc('score')->first();
                $lowest = $summativeItems->sortBy('score')->first();
                
                // Lookup dari pre-fetched collection (bukan individual query)
                $highTp = $allTps->get($highest['tp_id']);
                $lowTp = $allTps->get($lowest['tp_id']);

                if ($highTp) {
                    $description = "Menunjukkan penguasaan yang sangat baik dalam " . $highTp->description . ".";
                }
                
                if ($lowTp && $lowest['score'] < $subjectKktp && $highest['id'] !== $lowest['id']) {
                    $description .= " Perlu peningkatan dalam " . $lowTp->description . ".";
                }
            }

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
                'subject_name'          => $subjectName,
                'cps'                   => $cpGroups,
                'average'               => $average,
                'description'           => $description,
                'attendance_percentage' => $attendancePercentage,
                'total_meetings'        => $totalMeetings,
                'has_remedial'          => $hasRemedial,
            ];
        })->values();

        return Inertia::render('gradebook/student', [
            'report' => $report,
            'period' => $activeYear?->name . ' - ' . $activeSemester?->name,
        ]);
    }

    public function learningReport(Request $request, $class_id, $subject_id)
    {
        $teacher = Auth::user()->teacher;
        if (!$teacher) abort(403);

        $subject = Subject::findOrFail($subject_id);
        $class = SchoolClass::findOrFail($class_id);
        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();
        $kktp = get_kktp($subject_id);

        $tps = LmsLearningObjective::where('subject_id', $subject_id)
            ->orderBy('code')
            ->get();

        $students = $class->students()->orderBy('name')->get();
        $assignments = LmsAssignment::where('subject_id', $subject_id)
            ->whereHas('schoolClasses', function ($q) use ($class_id) { $q->where('school_classes.id', $class_id); })
            ->where('assessment_type', 'summative')
            ->whereIn('learning_objective_id', $tps->pluck('id'))
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
        $teacher = Auth::user()->teacher;

        if (!$teacher) {
            abort(403);
        }

        $validated = $request->validate([
            'student_id'  => 'required|exists:mysql_absensi.students,id',
            'subject_id'  => 'required|exists:mysql_absensi.subjects,id',
            'class_id'    => 'required|exists:mysql_absensi.school_classes,id',
            'score'       => 'required|integer|min:0',
        ]);

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
