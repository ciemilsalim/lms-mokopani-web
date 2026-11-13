<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\LmsAssignment;
use App\Models\LmsSubmission;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Models\User;
use App\Services\AnalyticsService;
use App\Services\EarlyWarningService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AnalyticsAuditFixTest extends TestCase
{
    use RefreshDatabase;

    private function createBaseContext(): array
    {
        $year = AcademicYear::create([
            'name'      => '2025/2026',
            'is_active' => true,
        ]);
        $semester = Semester::create([
            'academic_year_id' => $year->id,
            'name'             => 'Ganjil',
            'is_active'        => true,
        ]);

        $user = User::factory()->create(['role' => 'teacher', 'name' => 'Guru Audit']);
        $teacher = Teacher::create([
            'user_id' => $user->id,
            'name'    => 'Guru Audit',
            'nip'     => '199001010001',
        ]);

        $subject = Subject::create(['name' => 'Matematika', 'kktp' => 75]);
        $classA = SchoolClass::create(['name' => 'X-A']);
        $classB = SchoolClass::create(['name' => 'X-B']);

        TeachingAssignment::create([
            'teacher_id'       => $teacher->id,
            'subject_id'       => $subject->id,
            'school_class_id'  => $classA->id,
            'academic_year_id' => $year->id,
            'semester_id'      => $semester->id,
        ]);

        TeachingAssignment::create([
            'teacher_id'       => $teacher->id,
            'subject_id'       => $subject->id,
            'school_class_id'  => $classB->id,
            'academic_year_id' => $year->id,
            'semester_id'      => $semester->id,
        ]);

        return [$year, $semester, $user, $teacher, $subject, $classA, $classB];
    }

    public function test_zero_scores_are_included_in_performance_average_and_distribution(): void
    {
        [$year, $semester, $user, $teacher, $subject, $classA] = $this->createBaseContext();

        $s1 = Student::create(['name' => 'Siswa Nol', 'nis' => '101', 'unique_id' => 'U101', 'school_class_id' => $classA->id]);
        $s2 = Student::create(['name' => 'Siswa Seratus', 'nis' => '102', 'unique_id' => 'U102', 'school_class_id' => $classA->id]);

        $assignment = LmsAssignment::create([
            'teacher_id'       => $teacher->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $year->id,
            'semester_id'      => $semester->id,
            'title'            => 'Kuis 1',
            'description'      => 'Desc',
            'assessment_type'  => 'formative',
            'max_points'       => 100,
            'passing_grade'    => 75,
        ]);
        $assignment->schoolClasses()->attach($classA->id);

        LmsSubmission::create([
            'assignment_id' => $assignment->id,
            'student_id'    => $s1->id,
            'score'         => 0,
            'submitted_at'  => now(),
        ]);
        LmsSubmission::create([
            'assignment_id' => $assignment->id,
            'student_id'    => $s2->id,
            'score'         => 100,
            'submitted_at'  => now(),
        ]);

        $perf = app(AnalyticsService::class)->getClassPerformance($subject->id, $classA->id);

        $this->assertEquals(50.0, $perf['class_avg_score']);
        $this->assertEquals(2, $perf['assignment_scores'][0]['submission_count']);
        $this->assertEquals(50.0, $perf['assignment_scores'][0]['avg_score']);
        $this->assertEquals(1, $perf['score_distribution'][0]['count']); // 0 score in lowest bucket
        $this->assertEquals(1, $perf['score_distribution'][4]['count']); // 100 score in highest bucket
    }

    public function test_early_warning_scopes_assignments_to_target_class_only(): void
    {
        [$year, $semester, $user, $teacher, $subject, $classA, $classB] = $this->createBaseContext();

        $studentB = Student::create(['name' => 'Siswa B', 'nis' => '201', 'unique_id' => 'U201', 'school_class_id' => $classB->id]);

        // Create 3 assignments attached ONLY to classA (not classB)
        for ($i = 1; $i <= 3; $i++) {
            $a = LmsAssignment::create([
                'teacher_id'       => $teacher->id,
                'subject_id'       => $subject->id,
                'academic_year_id' => $year->id,
                'semester_id'      => $semester->id,
                'title'            => "Tugas Khusus A {$i}",
                'description'      => 'Desc',
                'assessment_type'  => 'formative',
                'max_points'       => 100,
                'passing_grade'    => 75,
            ]);
            $a->schoolClasses()->attach($classA->id);
        }

        $riskB = app(EarlyWarningService::class)->getClassRiskSummary($classB->id, $subject->id);

        $this->assertEquals(1, $riskB['total_students']);
        $this->assertEquals(0, $riskB['at_risk_count'], 'Class B must not inherit assignments only assigned to Class A.');
    }

    public function test_analytics_show_supports_past_semester_and_all_semesters_filter(): void
    {
        [$year, $semester, $user, $teacher, $subject, $classA] = $this->createBaseContext();

        $pastYear = AcademicYear::create(['name' => '2024/2025', 'is_active' => false]);
        $pastSemester = Semester::create([
            'academic_year_id' => $pastYear->id,
            'name'             => 'Genap 2024/2025',
            'is_active'        => false,
        ]);

        $pastAssignment = LmsAssignment::create([
            'teacher_id'       => $teacher->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $pastYear->id,
            'semester_id'      => $pastSemester->id,
            'title'            => 'Ujian Tahun Lalu',
            'description'      => 'Desc',
            'assessment_type'  => 'summative',
            'max_points'       => 100,
        ]);
        $pastAssignment->schoolClasses()->attach($classA->id);

        $currentAssignment = LmsAssignment::create([
            'teacher_id'       => $teacher->id,
            'subject_id'       => $subject->id,
            'academic_year_id' => $year->id,
            'semester_id'      => $semester->id,
            'title'            => 'Ujian Tahun Ini',
            'description'      => 'Desc',
            'assessment_type'  => 'summative',
            'max_points'       => 100,
        ]);
        $currentAssignment->schoolClasses()->attach($classA->id);

        // 1. Filter by past semester
        $this->actingAs($user)
            ->get(route('analytics.show', [$subject->id, $classA->id]) . '?semester_id=' . $pastSemester->id)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('analytics/subject')
                ->where('performance.total_assignments', 1)
                ->where('performance.assignment_scores.0.title', 'Ujian Tahun Lalu')
                ->where('filters.semester_id', $pastSemester->id)
            );

        // 2. Filter by "Semua Semester" (empty string)
        $this->actingAs($user)
            ->get(route('analytics.show', [$subject->id, $classA->id]) . '?semester_id=')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('analytics/subject')
                ->where('performance.total_assignments', 2)
                ->where('filters.semester_id', '')
            );
    }
}

