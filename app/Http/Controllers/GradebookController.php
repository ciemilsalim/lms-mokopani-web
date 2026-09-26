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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class GradebookController extends Controller
{
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

        abort(403);
    }

    protected function getEvaluatedTpsForClass($subjectId, $classId, $activeYear, $activeSemester)
    {
        $tpQuery = LmsLearningObjective::with('subObjectives')
            ->where('subject_id', $subjectId);

        if ($activeYear && $activeSemester) {
            $tpQuery->where(function ($q) use ($activeYear, $activeSemester) {
                $q->where(function ($sub) use ($activeYear, $activeSemester) {
                    $sub->where('academic_year_id', $activeYear->id)
                        ->where('semester_id', $activeSemester->id);
                })->orWhere(function ($sub) {
                    $sub->whereNull('academic_year_id')
                        ->whereNull('semester_id');
                });
            });
        } elseif ($activeYear) {
            $tpQuery->where(function ($q) use ($activeYear) {
                $q->where('academic_year_id', $activeYear->id)
                    ->orWhereNull('academic_year_id');
            });
        }

        $allTps = $tpQuery->get();

        if ($allTps->isEmpty()) {
            return collect();
        }

        // 1. TPs explicitly assigned to this class
        $classSpecificTps = $allTps->where('school_class_id', $classId);

        // 2. TPs used in any assignments for this class
        $classAssignmentTpIds = LmsAssignment::where('subject_id', $subjectId)
            ->whereHas('schoolClasses', function ($q) use ($classId) {
                $q->where('school_classes.id', $classId);
            })
            ->pluck('learning_objective_id')
            ->filter()
            ->unique();
        $assignmentTps = $allTps->whereIn('id', $classAssignmentTpIds);

        if ($classSpecificTps->isNotEmpty() || $assignmentTps->isNotEmpty()) {
            $candidates = $classSpecificTps->merge($assignmentTps)->unique('id');
        } else {
            // Fallback: check unassigned (null school_class_id)
            $globalTps = $allTps->whereNull('school_class_id');
            if ($globalTps->isNotEmpty()) {
                $candidates = $globalTps;
            } else {
                // Fallback to all subject TPs so they don't vanish for other classes of same teacher/subject
                $candidates = $allTps;
            }
        }

        // Determine evaluated TPs: top level vs sub-TPs
        $leafTps = collect();
        $topLevelTps = $candidates->whereNull('parent_id');

        if ($topLevelTps->isNotEmpty()) {
            foreach ($topLevelTps as $parentTp) {
                $subObjectives = $allTps->where('parent_id', $parentTp->id);
                // Check if any sub-objective is explicitly targeted by an assignment in this class
                $subTargeted = $subObjectives->filter(fn($s) => $classAssignmentTpIds->contains($s->id));
                if ($subTargeted->isNotEmpty()) {
                    foreach ($subTargeted as $subTp) {
                        $leafTps->push($subTp);
                    }
                } else {
                    // Evaluate at the parent TP level (e.g. TP-1)
                    $leafTps->push($parentTp);
                }
            }
        } else {
            $leafTps = $candidates;
        }

        // Include any candidate sub-TPs that are not yet in leafTps and have no children
        $unprocessedSubTps = $candidates->whereNotNull('parent_id')->whereNotIn('id', $leafTps->pluck('id'));
        foreach ($unprocessedSubTps as $orphan) {
            if (!$leafTps->contains('id', $orphan->id) && $orphan->subObjectives->isEmpty()) {
                $leafTps->push($orphan);
            }
        }

        return $leafTps->sort(function ($a, $b) {
            if ($a->order !== null && $b->order !== null && $a->order !== $b->order) {
                return $a->order <=> $b->order;
            }
            return strnatcasecmp($a->code ?? '', $b->code ?? '');
        })->values();
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

        // 6. Ambil semua nilai
        $submissions = LmsSubmission::whereIn('assignment_id', $allAssignments->pluck('id'))->get();

        // 7. Load existing final scores
        $finalScores = GradebookFinalScore::where('subject_id', $subjectId)
            ->where('school_class_id', $classId)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get()
            ->keyBy('student_id');

        // 8. Format data nilai per siswa
        $gradeData = $students->map(function ($student) use ($summativeColumns, $summativeAssignments, $initialAssignments, $formativeAssignments, $submissions, $finalScores, $subjectId) {
            $summativeScores = $summativeColumns->map(function ($col) use ($student, $submissions) {
                if ($col['type'] === 'assignment' && $col['assignment_id']) {
                    $sub = $submissions->where('student_id', $student->id)->where('assignment_id', $col['assignment_id'])->first();
                    $score = ($sub && $sub->score !== null && $sub->score !== '') ? (float) $sub->score : '-';
                    return [
                        'tp_id'          => $col['tp_id'],
                        'tp_code'        => $col['tp'],
                        'score'          => $score,
                        'is_top_level'   => true,
                        'has_assignment' => true,
                    ];
                } else {
                    return [
                        'tp_id'          => $col['tp_id'],
                        'tp_code'        => $col['tp'],
                        'score'          => '-',
                        'is_top_level'   => true,
                        'has_assignment' => false,
                    ];
                }
            });

            // Initial assessment scores
            $initialScores = $initialAssignments->values()->map(function ($a) use ($student, $submissions) {
                $sub = $submissions->where('student_id', $student->id)->where('assignment_id', $a->id)->first();
                return ['id' => $a->id, 'score' => ($sub && $sub->score !== null && $sub->score !== '') ? (float) $sub->score : '-', 'type' => $a->assessment_type];
            });

            // Formative assessment scores
            $formativeScores = $formativeAssignments->values()->map(function ($a) use ($student, $submissions) {
                $sub = $submissions->where('student_id', $student->id)->where('assignment_id', $a->id)->first();
                return ['id' => $a->id, 'score' => ($sub && $sub->score !== null && $sub->score !== '') ? (float) $sub->score : '-', 'type' => $a->assessment_type];
            });

            // Rata-rata sumatif dihitung dari semua nilai numerik yang sudah dinilai
            $validScores = $summativeScores->filter(fn($s) => is_numeric($s['score']))->pluck('score');
            $average = $validScores->count() > 0 ? round($validScores->avg(), 1) : 0;

            // Generate Deskripsi Otomatis HANYA dari nilai sumatif yang ada
            $assessedSummatives = $summativeScores->filter(fn($s) => is_numeric($s['score']));
            $description = '';
            if ($assessedSummatives->count() > 0) {
                $highest = $assessedSummatives->sortByDesc('score')->first();
                $lowest = $assessedSummatives->sortBy('score')->first();

                $highCol = $summativeColumns->firstWhere('tp_id', $highest['tp_id']) ?? $summativeColumns->first();
                $lowCol = $summativeColumns->firstWhere('tp_id', $lowest['tp_id']) ?? $summativeColumns->first();

                $highLabel = ($highCol && !empty($highCol['tp_desc'])) ? $highCol['tp'] . ": " . $highCol['tp_desc'] : "TP " . $highest['tp_code'];
                $lowLabel = ($lowCol && !empty($lowCol['tp_desc'])) ? $lowCol['tp'] . ": " . $lowCol['tp_desc'] : "TP " . $lowest['tp_code'];

                $subjectKktp = get_kktp($subjectId);
                $description = "Menunjukkan penguasaan yang sangat baik dalam {$highLabel}.";

                if ($lowest['score'] < $subjectKktp && $highest['tp_id'] !== $lowest['tp_id']) {
                    $description .= " Perlu peningkatan dalam {$lowLabel}.";
                }
            } else {
                $description = 'Siswa belum memiliki data penilaian yang mencukupi untuk membuat deskripsi capaian.';
            }

            return [
                'student_id'    => $student->id,
                'student_name'  => $student->name,
                'student_nis'   => $student->nis,
                'summative'     => $summativeScores,
                'initial'       => $initialScores,
                'formative'     => $formativeScores,
                'sumatif_akhir' => $finalScores->get($student->id)?->score ?? 0,
                'average'       => $average,
                'description'   => $description,
            ];
        });

        return Inertia::render('gradebook/show', [
            'summative_headers' => $summativeColumns->values()->map(fn($col) => [
                'id'      => $col['key'],
                'title'   => $col['title'],
                'tp'      => $col['tp'],
                'tp_desc' => $col['tp_desc'],
            ]),
            'initial_headers'   => $initialAssignments->values()->map(fn($a) => ['id' => $a->id, 'title' => $a->title, 'type' => $a->assessment_type]),
            'formative_headers' => $formativeAssignments->values()->map(fn($a) => ['id' => $a->id, 'title' => $a->title, 'type' => $a->assessment_type]),
            'gradeData'         => $gradeData,
            'period'            => ($activeYear?->name ?? '') . ($activeSemester ? ' - ' . $activeSemester->name : ''),
            'subject_name'      => $subject->name,
            'class_name'        => $schoolClass->name,
            'subject_id'        => (int) $subjectId,
            'class_id'          => (int) $classId,
            'kktp'              => get_kktp($subjectId),
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

        // 5. Perhitungan Akurat TP & Rapor Akhir per Siswa
        $reportData = $students->map(function ($student) use ($assignments, $submissions, $objectives, $finalScores, $kktp) {
            $studentSubmissions = $submissions->where('student_id', $student->id);

            // Hitung skor per Tujuan Pembelajaran (TP)
            $tpScoresList = $objectives->map(function ($tp) use ($assignments, $studentSubmissions) {
                $tpAssignments = $assignments->where('learning_objective_id', $tp->id);
                if ($tpAssignments->isEmpty() && $tp->parent_id) {
                    $parentAssignments = $assignments->where('learning_objective_id', $tp->parent_id);
                    if ($parentAssignments->isNotEmpty()) {
                        $tpAssignments = $parentAssignments;
                    }
                }
                if ($tpAssignments->isEmpty() && $tp->subObjectives && $tp->subObjectives->isNotEmpty()) {
                    $childAssignments = $assignments->whereIn('learning_objective_id', $tp->subObjectives->pluck('id'));
                    if ($childAssignments->isNotEmpty()) {
                        $tpAssignments = $childAssignments;
                    }
                }

                $tpSubs = $studentSubmissions->whereIn('assignment_id', $tpAssignments->pluck('id'))
                    ->filter(fn($s) => $s->score !== null && $s->score !== '');

                $hasAssignment = $tpAssignments->count() > 0;
                $score = null;
                if ($tpSubs->count() > 0) {
                    $score = round((float) $tpSubs->avg('score'), 1);
                } elseif ($hasAssignment) {
                    $score = 0;
                }

                return [
                    'tp_id' => $tp->id,
                    'code' => $tp->code ?: 'TP',
                    'description' => $tp->description,
                    'score' => $score,
                    'has_assignment' => $hasAssignment,
                ];
            });

            // Filter TP yang sudah diujikan (memiliki penugasan aktif)
            $assessedTps = $tpScoresList->filter(fn($item) => $item['has_assignment'] && $item['score'] !== null);
            $allSummativeSubs = $studentSubmissions->filter(fn($s) => $s->score !== null && $s->score !== '');

            $finalScore = 0;
            if ($assessedTps->count() > 0) {
                $avgTp = $assessedTps->avg('score');
                $sasScore = $finalScores->get($student->id)?->score;
                if ($sasScore !== null && $sasScore !== '') {
                    $finalScore = round(((float) $avgTp + (float) $sasScore) / 2);
                } else {
                    $finalScore = round((float) $avgTp);
                }
            } elseif ($allSummativeSubs->count() > 0) {
                $finalScore = round((float) $allSummativeSubs->avg('score'));
            } elseif ($finalScores->get($student->id)?->score !== null) {
                $finalScore = round((float) $finalScores->get($student->id)->score);
            }

            // Generate Deskripsi Capaian Rapor Akurat
            $description = "";
            if ($assessedTps->count() > 0 && $allSummativeSubs->count() > 0) {
                $highest = $assessedTps->sortByDesc('score')->first();
                $lowest = $assessedTps->sortBy('score')->first();

                $highDesc = $highest['description'] ?: $highest['code'];
                $lowDesc = $lowest['description'] ?: $lowest['code'];

                if ($highest['score'] >= $kktp) {
                    $description = "Menunjukkan penguasaan yang sangat baik dalam hal {$highDesc}.";
                } else {
                    $description = "Menunjukkan penguasaan yang cukup dalam hal {$highDesc}.";
                }

                if ($lowest && $lowest['score'] < $kktp && $highest['tp_id'] !== $lowest['tp_id']) {
                    $description .= " Perlu bimbingan lebih lanjut dalam hal {$lowDesc}.";
                }
            } else {
                $description = "Siswa belum memiliki data penilaian sumatif yang mencukupi untuk membuat deskripsi capaian.";
            }

            $avgTp = $assessedTps->count() > 0 ? round((float) $assessedTps->avg('score'), 1) : null;
            $sasScore = $finalScores->get($student->id)?->score;

            return [
                'nis'         => $student->nis ?? '-',
                'name'        => $student->name,
                'final_score' => $finalScore,
                'tp_average'  => $avgTp,
                'sas_score'   => $sasScore,
                'description' => $description,
                'tp_scores'   => $tpScoresList->map(fn($t) => [
                    'code' => $t['code'],
                    'description' => $t['description'],
                    'score' => $t['score'],
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

        $report = $assignments->groupBy('subject_id')->map(function ($subjectAssignments) use ($submissions, $remedialRecords, $attendances, $student, $allTps, $finalScores) {
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

            $summativeItems = $items->where('type', 'summative')->where('score', '!==', '-');
            $totalScore = $summativeItems->sum('score');
            $count = $summativeItems->count();
            $average = $count > 0 ? round($totalScore / $count) : 0;

            // Hitung Nilai Akhir Rapor resmi (gabungan TP + SAS jika ada)
            $sasScore = $finalScores->get($subjectId)?->score;
            $finalScore = $average;
            if ($sasScore !== null && $sasScore !== '') {
                $finalScore = $count > 0 ? round(((float)$average + (float)$sasScore) / 2) : (int)$sasScore;
            }

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
        $teacher = Auth::user()->teacher;
        if (!$teacher) abort(403);

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
