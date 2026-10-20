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
use App\Services\RaporCalculationService;
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

        // 1. Ambil TP yang terfilter sesuai kelas siswa & mapel menggunakan unified service
        $tps = app(RaporCalculationService::class)->getEvaluatedTpsForClass($subjectId, $classId, $activeYear, $activeSemester);

        $assignments = LmsAssignment::whereHas('schoolClasses', function ($q) use ($classId) { $q->where('school_classes.id', $classId); })
            ->where('subject_id', $subjectId)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->where('assessment_type', 'summative')
            ->get();

        $students = $teacherAssignment 
            ? $teacherAssignment->getEnrolledStudents() 
            : Student::where('school_class_id', $classId)->orderBy('name', 'asc')->get();
        $submissions = LmsSubmission::whereIn('assignment_id', $assignments->pluck('id'))
            ->whereIn('student_id', $students->pluck('id'))
            ->get();

        $finalScores = GradebookFinalScore::where('subject_id', $subjectId)
            ->where('school_class_id', $classId)
            ->where('academic_year_id', $activeYear?->id)
            ->where('semester_id', $activeSemester?->id)
            ->get()
            ->keyBy('student_id');

        $attendancesQuery = SubjectAttendance::with(['schedule.teachingAssignment'])
            ->whereIn('student_id', $students->pluck('id'));

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

        $attendances = $attendancesQuery->get()->groupBy('student_id');

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

        $reportData = $students->map(function ($student) use ($assignments, $submissions, $tps, $finalScores, $attendances, $subjectId, $classId, $allP5Scores, $kktp) {
            $calc = app(RaporCalculationService::class)->calculateStudentSubjectReport(
                $student->id,
                $subjectId,
                $tps,
                $assignments,
                $submissions,
                $finalScores->get($student->id)?->score,
                $kktp
            );

            $studentAttendances = $attendances->get($student->id, collect());
            $subjectAttendances = $studentAttendances->filter(function ($a) use ($subjectId, $classId) {
                $ta = $a->schedule?->teachingAssignment;
                if ($ta) {
                    return $ta->subject_id == $subjectId && (!$classId || $ta->school_class_id == $classId);
                }
                return false;
            });

            $hadirCount = $subjectAttendances->filter(fn($a) => in_array(strtolower(trim($a->status ?? '')), ['hadir', 'present', 'h']))->count();
            $sakitCount = $subjectAttendances->filter(fn($a) => in_array(strtolower(trim($a->status ?? '')), ['sakit', 'sick', 's']))->count();
            $izinCount = $subjectAttendances->filter(fn($a) => in_array(strtolower(trim($a->status ?? '')), ['izin', 'permit', 'dispensasi', 'i']))->count();
            $alpaCount = $subjectAttendances->filter(fn($a) => in_array(strtolower(trim($a->status ?? '')), ['alpa', 'alpha', 'absen', 'bolos', 'a']))->count();
            $totalMeetings = $subjectAttendances->count();

            $studentP5Scores = ($allP5Scores->get($student->id) ?? collect())
                ->keyBy(fn($s) => $s->project_id . '-' . $s->sub_element_id);

            return [
                'nis'            => $student->nis,
                'name'           => $student->name,
                'tp_scores'      => $calc['tp_scores'],
                'average'        => $calc['tp_average'],
                'sas_score'      => $calc['sas_score'],
                'final_score'    => $calc['final_score'],
                'description'    => $calc['description'],
                'total_meetings' => $totalMeetings,
                'present'        => $hadirCount,
                'sick'           => $sakitCount,
                'permit'         => $izinCount,
                'absent'         => $alpaCount,
                'p5_scores'      => $studentP5Scores,
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
