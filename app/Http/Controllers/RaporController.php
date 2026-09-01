<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\GradebookFinalScore;
use App\Models\LmsAssignment;
use App\Models\LmsLearningObjective;
use App\Models\LmsP5Dimensi;
use App\Models\LmsP5Project;
use App\Models\LmsP5ProjectScore;
use App\Models\LmsSubmission;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Student;
use App\Models\Subject;
use App\Models\SubjectAttendance;
use App\Models\TeachingAssignment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RaporController extends Controller
{
    public function preview(Request $request)
    {
        $data = $this->buildReportData($request);
        if ($data['redirect']) return $data['redirect'];

        $pdf = Pdf::loadView('pdf.rapor', $data['view']);
        $pdf->setPaper('A4', 'portrait');

        return $pdf->stream("rapor-{$data['filename']}.pdf");
    }

    public function download(Request $request)
    {
        $data = $this->buildReportData($request);
        if ($data['redirect']) return $data['redirect'];

        $pdf = Pdf::loadView('pdf.rapor', $data['view']);
        $pdf->setPaper('A4', 'portrait');

        return $pdf->download("rapor-{$data['filename']}.pdf");
    }

    private function buildReportData(Request $request): array
    {
        $user = Auth::user();
        $teacher = $user->teacher;
        if (!$teacher && $user->role !== 'admin') abort(403);

        $classId = $request->query('class_id');
        $subjectId = $request->query('subject_id');

        if (!$classId || !$subjectId) {
            return ['redirect' => redirect()->route('gradebook.index')];
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

        $activeYear = AcademicYear::getActive();
        $activeSemester = Semester::getActive();

        $subject = Subject::find($subjectId);
        $schoolClass = SchoolClass::find($classId);
        $teacherAssignment = TeachingAssignment::where('subject_id', $subjectId)
            ->where('school_class_id', $classId)
            ->first();

        // 1. Ambil TP yang terfilter sesuai kelas siswa & mapel (dengan fallback jika global)
        $tpQuery = LmsLearningObjective::with('subObjectives')
            ->where('subject_id', $subjectId)
            ->where(function ($q) use ($classId) {
                $q->where('school_class_id', $classId)
                  ->orWhereNull('school_class_id');
            });

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

        // Jika terdapat TP yang khusus dibuat untuk kelas ini, prioritaskan TP kelas tersebut
        $classSpecificTps = $allTps->where('school_class_id', $classId);
        if ($classSpecificTps->isNotEmpty()) {
            $allTps = $classSpecificTps;
        }

        // 2. Jika TP memiliki sub-TP, masukkan sub-TP tersebut ke dalam rapor; jika tidak, masukkan TP utama
        $leafTps = collect();
        $topLevelTps = $allTps->whereNull('parent_id');

        if ($topLevelTps->isNotEmpty()) {
            foreach ($topLevelTps as $parentTp) {
                $subObjectives = $allTps->where('parent_id', $parentTp->id);
                if ($subObjectives->isNotEmpty()) {
                    foreach ($subObjectives as $subTp) {
                        $leafTps->push($subTp);
                    }
                } else {
                    $leafTps->push($parentTp);
                }
            }
        } else {
            $leafTps = $allTps->filter(fn($tp) => $tp->subObjectives->isEmpty());
        }

        // Tangkap sub-TP yatim jika ada
        $unprocessedSubTps = $allTps->whereNotNull('parent_id')->whereNotIn('id', $leafTps->pluck('id'));
        foreach ($unprocessedSubTps as $orphan) {
            if (!$leafTps->contains('id', $orphan->id) && $orphan->subObjectives->isEmpty()) {
                $leafTps->push($orphan);
            }
        }

        // Urutkan TP secara natural berdasarkan order dan kode TP
        $tps = $leafTps->sort(function ($a, $b) {
            if ($a->order !== null && $b->order !== null && $a->order !== $b->order) {
                return $a->order <=> $b->order;
            }
            return strnatcasecmp($a->code ?? '', $b->code ?? '');
        })->values();

        $assignments = LmsAssignment::whereHas('schoolClasses', function ($q) use ($classId) { $q->where('school_classes.id', $classId); })
            ->where('subject_id', $subjectId)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->where('assessment_type', 'summative')
            ->get();

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

        $attendances = SubjectAttendance::with(['schedule.teachingAssignment'])
            ->whereIn('student_id', $students->pluck('id'))
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get()
            ->groupBy('student_id');

        // ── P5 Data ────────────────────────────────────────────────────
        $p5Projects = LmsP5Project::with(['scores'])
            ->where('school_class_id', $classId)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get();

        $p5Structure = $p5Projects->map(function ($project) {
            $dimensi = LmsP5Dimensi::whereIn('id', $project->dimensi_ids ?? [])
                ->with('elements.subElements')
                ->get();
            return [
                'project' => $project,
                'dimensi' => $dimensi,
            ];
        });

        $allP5Scores = LmsP5ProjectScore::whereIn('project_id', $p5Projects->pluck('id'))
            ->get()
            ->groupBy('student_id');

        $kktp = get_kktp($subjectId);

        $reportData = $students->map(function ($student) use ($assignments, $submissions, $tps, $finalScores, $attendances, $subjectId, $allP5Scores, $kktp) {
            $studentSubmissions = $submissions->where('student_id', $student->id);

            $tpScores = $tps->map(function ($tp) use ($assignments, $studentSubmissions) {
                $tpAssignments = $assignments->where('learning_objective_id', $tp->id);
                if ($tpAssignments->isEmpty() && $tp->parent_id) {
                    $parentAssignments = $assignments->where('learning_objective_id', $tp->parent_id);
                    if ($parentAssignments->isNotEmpty()) {
                        $tpAssignments = $parentAssignments;
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
                    'code' => $tp->code ?: 'TP',
                    'score' => $score,
                    'has_assignment' => $hasAssignment,
                    'description' => $tp->description,
                ];
            });

            $assessedTps = $tpScores->filter(fn($tp) => $tp['has_assignment'] && $tp['score'] !== null);
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

            $description = '';
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

                if ($lowest && $lowest['score'] < $kktp && $highest['code'] !== $lowest['code']) {
                    $description .= " Perlu bimbingan lebih lanjut dalam hal {$lowDesc}.";
                }
            } else {
                $description = "Siswa belum memiliki data penilaian sumatif yang mencukupi untuk membuat deskripsi capaian.";
            }

            $studentAttendances = $attendances->get($student->id, collect());
            $subjectAttendances = $studentAttendances->filter(function ($a) use ($subjectId) {
                return $a->schedule?->teachingAssignment?->subject_id == $subjectId;
            });

            $studentP5Scores = ($allP5Scores->get($student->id) ?? collect())
                ->keyBy(fn($s) => $s->project_id . '-' . $s->sub_element_id);

            $avgTp = $assessedTps->count() > 0 ? round((float) $assessedTps->avg('score'), 1) : 0;
            $sasScore = $finalScores->get($student->id)?->score;

            return [
                'nis' => $student->nis, 'name' => $student->name,
                'tp_scores' => $tpScores,
                'average' => $avgTp,
                'sas_score' => $sasScore,
                'final_score' => $finalScore, 'description' => $description,
                'total_meetings' => $subjectAttendances->count(),
                'sick' => $subjectAttendances->where('status', 'Sakit')->count(),
                'permit' => $subjectAttendances->where('status', 'Izin')->count(),
                'absent' => $subjectAttendances->where('status', 'Alpa')->count(),
                'p5_scores' => $studentP5Scores,
            ];
        });

        $schoolName = school_setting('school_name', config('app.name'));
        $schoolAddress = school_setting('school_address', '');
        $schoolPhone = school_setting('school_phone', '');
        $schoolEmail = school_setting('school_email', '');
        $headmasterName = school_setting('school_headmaster_name', '');
        $headmasterNip = school_setting('school_headmaster_nip', '');

        $kktp = get_kktp($subjectId);

        return [
            'redirect' => null,
            'filename' => "{$schoolName}-{$subject?->name}-{$schoolClass->name}",
            'view' => [
                'reportData' => $reportData, 'subject' => $subject,
                'schoolClass' => $schoolClass, 'teacher' => $teacherAssignment,
                'period' => $activeYear?->name . ' - ' . $activeSemester?->name,
                'tps' => $tps,
                'schoolName' => $schoolName, 'schoolAddress' => $schoolAddress,
                'schoolPhone' => $schoolPhone, 'schoolEmail' => $schoolEmail,
                'headmasterName' => $headmasterName, 'headmasterNip' => $headmasterNip,
                'p5Structure' => $p5Structure,
                'kktp' => $kktp,
            ],
        ];
    }
}
