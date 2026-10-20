<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\GradebookFinalScore;
use App\Models\LmsAssignment;
use App\Models\LmsLearningObjective;
use App\Models\LmsSubmission;
use App\Models\ParentModel;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Models\User;
use App\Services\RaporCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReportCalculationTest extends TestCase
{
    use RefreshDatabase;

    protected AcademicYear $academicYear;
    protected Semester $semester;
    protected SchoolClass $schoolClass;
    protected Subject $subject;
    protected Teacher $teacher;
    protected User $teacherUser;
    protected Student $student;
    protected User $studentUser;
    protected ParentModel $parent;
    protected User $parentUser;
    protected TeachingAssignment $teachingAssignment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->academicYear = AcademicYear::create([
            'name'      => '2026/2027',
            'is_active' => true,
        ]);

        $this->semester = Semester::create([
            'academic_year_id' => $this->academicYear->id,
            'name'             => 'Ganjil',
            'semester'         => '1',
            'is_active'        => true,
        ]);

        $this->schoolClass = SchoolClass::create(['name' => '7-A']);
        $this->subject = Subject::create(['name' => 'Informatika', 'code' => 'INF-7']);

        // Teacher
        $this->teacherUser = User::factory()->create(['role' => 'teacher', 'name' => 'Guru Informatika']);
        $this->teacher = Teacher::create([
            'user_id' => $this->teacherUser->id,
            'name'    => 'Guru Informatika',
        ]);

        $this->teachingAssignment = TeachingAssignment::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $this->subject->id,
            'school_class_id'  => $this->schoolClass->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
        ]);

        // Student
        $this->studentUser = User::factory()->create(['role' => 'student', 'name' => 'Budi Pratama']);
        $this->student = Student::create([
            'user_id'         => $this->studentUser->id,
            'name'            => 'Budi Pratama',
            'nis'             => '1001',
            'unique_id'       => 'STU-1001',
            'school_class_id' => $this->schoolClass->id,
        ]);

        // Parent
        $this->parentUser = User::factory()->create(['role' => 'parent', 'name' => 'Orang Tua Budi']);
        $this->parent = ParentModel::create([
            'user_id' => $this->parentUser->id,
            'name'    => 'Orang Tua Budi',
        ]);
        $this->parent->students()->attach($this->student->id);
    }

    /**
     * Test unified report card score across Student, Parent, and Teacher views.
     */
    public function test_report_card_score_is_identical_across_student_parent_and_teacher_views()
    {
        // 1. Create 2 Learning Objectives (TPs)
        $tp1 = LmsLearningObjective::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $this->subject->id,
            'school_class_id'  => $this->schoolClass->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'code'             => 'TP 7.1',
            'description'      => 'Berpikir Komputasional',
            'order'            => 1,
        ]);

        $tp2 = LmsLearningObjective::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $this->subject->id,
            'school_class_id'  => $this->schoolClass->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'code'             => 'TP 7.2',
            'description'      => 'Teknologi Informasi dan Komunikasi',
            'order'            => 2,
        ]);

        // 2. Create 2 Summative Assignments for TP1 (Scores: 80 and 90 => Avg TP1 = 85.0)
        $asm1 = LmsAssignment::create([
            'teacher_id'           => $this->teacher->id,
            'subject_id'           => $this->subject->id,
            'academic_year_id'     => $this->academicYear->id,
            'semester_id'          => $this->semester->id,
            'learning_objective_id'=> $tp1->id,
            'title'                => 'Sumatif 1 TP 7.1',
            'description'          => 'Tugas 1',
            'assessment_type'      => 'summative',
            'max_points'           => 100,
        ]);
        $asm1->schoolClasses()->attach($this->schoolClass->id);

        $asm2 = LmsAssignment::create([
            'teacher_id'           => $this->teacher->id,
            'subject_id'           => $this->subject->id,
            'academic_year_id'     => $this->academicYear->id,
            'semester_id'          => $this->semester->id,
            'learning_objective_id'=> $tp1->id,
            'title'                => 'Sumatif 2 TP 7.1',
            'description'          => 'Tugas 2',
            'assessment_type'      => 'summative',
            'max_points'           => 100,
        ]);
        $asm2->schoolClasses()->attach($this->schoolClass->id);

        // 3. Create 1 Summative Assignment for TP2 (Score: 75 => Avg TP2 = 75.0)
        $asm3 = LmsAssignment::create([
            'teacher_id'           => $this->teacher->id,
            'subject_id'           => $this->subject->id,
            'academic_year_id'     => $this->academicYear->id,
            'semester_id'          => $this->semester->id,
            'learning_objective_id'=> $tp2->id,
            'title'                => 'Sumatif 1 TP 7.2',
            'description'          => 'Tugas 3',
            'assessment_type'      => 'summative',
            'max_points'           => 100,
        ]);
        $asm3->schoolClasses()->attach($this->schoolClass->id);

        // 4. Student Submissions
        // TP1: (80 + 90) / 2 = 85.0
        // TP2: 75.0
        // Expected Sumatif Lingkup Materi (Avg TP) = (85.0 + 75.0) / 2 = 80.0
        LmsSubmission::create(['assignment_id' => $asm1->id, 'student_id' => $this->student->id, 'score' => 80, 'submitted_at' => now()]);
        LmsSubmission::create(['assignment_id' => $asm2->id, 'student_id' => $this->student->id, 'score' => 90, 'submitted_at' => now()]);
        LmsSubmission::create(['assignment_id' => $asm3->id, 'student_id' => $this->student->id, 'score' => 75, 'submitted_at' => now()]);

        // 5. Final Score (SAS / ASAT) = 90
        // Expected Nilai Akhir Rapor = round((80.0 + 90) / 2) = round(85.0) = 85
        GradebookFinalScore::create([
            'subject_id'       => $this->subject->id,
            'school_class_id'  => $this->schoolClass->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'student_id'       => $this->student->id,
            'score'            => 90,
        ]);

        // --- VERIFY TEACHER FINAL REPORT ---
        $teacherResponse = $this->actingAs($this->teacherUser)
            ->get("/gradebook/final-report?subject_id={$this->subject->id}&class_id={$this->schoolClass->id}");
        $teacherResponse->assertStatus(200);
        $teacherResponse->assertInertia(fn (Assert $page) => $page
            ->component('gradebook/final-report')
            ->where('reportData.0.final_score', 85)
            ->where('reportData.0.tp_average', 80)
            ->where('reportData.0.sas_score', 90)
            ->where('reportData.0.description', fn ($desc) => str_contains($desc, 'Berpikir Komputasional'))
        );

        // --- VERIFY STUDENT LEARNING REPORT ---
        $studentResponse = $this->actingAs($this->studentUser)->get('/gradebook');
        $studentResponse->assertStatus(200);
        $studentResponse->assertInertia(fn (Assert $page) => $page
            ->component('gradebook/student')
            ->where('report.0.average', 85)
            ->where('report.0.tp_average', 80)
            ->where('report.0.sas_score', 90)
            ->where('report.0.description', fn ($desc) => str_contains($desc, 'Berpikir Komputasional'))
        );

        // --- VERIFY PARENT CHILD REPORT ---
        $parentResponse = $this->actingAs($this->parentUser)->get("/parent/child/{$this->student->id}");
        $parentResponse->assertStatus(200);
        $parentResponse->assertInertia(fn (Assert $page) => $page
            ->component('parent/child')
            ->where('report.0.average', 85)
            ->where('report.0.tp_average', 80)
            ->where('report.0.sas_score', 90)
            ->where('report.0.description', fn ($desc) => str_contains($desc, 'Berpikir Komputasional'))
        );

        // --- VERIFY TEACHER DAILY GRADEBOOK (SHOW) ---
        $showResponse = $this->actingAs($this->teacherUser)
            ->get("/gradebook/show?subject_id={$this->subject->id}&class_id={$this->schoolClass->id}");
        $showResponse->assertStatus(200);
        $showResponse->assertInertia(fn (Assert $page) => $page
            ->component('gradebook/show')
            ->where('gradeData.0.total_sumatif', 80)
            ->where('gradeData.0.average', 80)
            ->where('gradeData.0.sumatif_akhir', 90)
            ->where('gradeData.0.description', fn ($desc) => str_contains($desc, 'Berpikir Komputasional'))
        );
    }

    /**
     * Test unsubmitted summative assignments count as 0 rather than being excluded.
     */
    public function test_unsubmitted_summative_assignment_penalizes_average_consistently()
    {
        $tp1 = LmsLearningObjective::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $this->subject->id,
            'school_class_id'  => $this->schoolClass->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'code'             => 'TP 7.1',
            'description'      => 'Algoritma',
        ]);

        $tp2 = LmsLearningObjective::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $this->subject->id,
            'school_class_id'  => $this->schoolClass->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'code'             => 'TP 7.2',
            'description'      => 'Struktur Data',
        ]);

        // Assignment for TP1 (submitted with 80)
        $asm1 = LmsAssignment::create([
            'teacher_id'           => $this->teacher->id,
            'subject_id'           => $this->subject->id,
            'academic_year_id'     => $this->academicYear->id,
            'semester_id'          => $this->semester->id,
            'learning_objective_id'=> $tp1->id,
            'title'                => 'Sumatif Algoritma',
            'description'          => 'Deskripsi Algoritma',
            'assessment_type'      => 'summative',
            'max_points'           => 100,
        ]);
        $asm1->schoolClasses()->attach($this->schoolClass->id);
        LmsSubmission::create(['assignment_id' => $asm1->id, 'student_id' => $this->student->id, 'score' => 80, 'submitted_at' => now()]);

        // Assignment for TP2 (published to class, but student DID NOT submit)
        $asm2 = LmsAssignment::create([
            'teacher_id'           => $this->teacher->id,
            'subject_id'           => $this->subject->id,
            'academic_year_id'     => $this->academicYear->id,
            'semester_id'          => $this->semester->id,
            'learning_objective_id'=> $tp2->id,
            'title'                => 'Sumatif Struktur Data',
            'description'          => 'Deskripsi Struktur Data',
            'assessment_type'      => 'summative',
            'max_points'           => 100,
        ]);
        $asm2->schoolClasses()->attach($this->schoolClass->id);
        // No submission for asm2!

        // Expected: TP1 = 80, TP2 = 0 => Sumatif LM = (80 + 0) / 2 = 40.0
        // Nilai Akhir without SAS = 40

        // Student View
        $studentResponse = $this->actingAs($this->studentUser)->get('/gradebook');
        $studentResponse->assertStatus(200);
        $studentResponse->assertInertia(fn (Assert $page) => $page
            ->where('report.0.average', 40)
            ->where('report.0.tp_average', 40)
        );

        // Parent View
        $parentResponse = $this->actingAs($this->parentUser)->get("/parent/child/{$this->student->id}");
        $parentResponse->assertStatus(200);
        $parentResponse->assertInertia(fn (Assert $page) => $page
            ->where('report.0.average', 40)
            ->where('report.0.tp_average', 40)
        );

        // Teacher Final Report
        $teacherResponse = $this->actingAs($this->teacherUser)
            ->get("/gradebook/final-report?subject_id={$this->subject->id}&class_id={$this->schoolClass->id}");
        $teacherResponse->assertStatus(200);
        $teacherResponse->assertInertia(fn (Assert $page) => $page
            ->where('reportData.0.final_score', 40)
            ->where('reportData.0.tp_average', 40)
        );
    }
}
