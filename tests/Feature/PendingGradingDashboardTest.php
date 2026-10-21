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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PendingGradingDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected AcademicYear $academicYear;
    protected Semester $semester;
    protected SchoolClass $classA;
    protected Subject $subject;
    protected User $teacherUser;
    protected Teacher $teacher;
    protected User $studentUser1;
    protected Student $student1;
    protected User $studentUser2;
    protected Student $student2;
    protected LmsAssignment $assignment;

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

        $this->classA = SchoolClass::create(['name' => 'Kelas 8-A', 'academic_year_id' => $this->academicYear->id]);
        $this->subject = Subject::create(['name' => 'Matematika', 'code' => 'MAT-8']);

        $this->teacherUser = User::factory()->create(['role' => 'teacher', 'name' => 'Guru Matematika']);
        $this->teacher = Teacher::create([
            'user_id' => $this->teacherUser->id,
            'name'    => 'Guru Matematika',
        ]);

        TeachingAssignment::create([
            'teacher_id'      => $this->teacher->id,
            'subject_id'      => $this->subject->id,
            'school_class_id' => $this->classA->id,
        ]);

        // Student 1
        $this->studentUser1 = User::factory()->create(['role' => 'student', 'name' => 'Ahmad Siswa 1']);
        $this->student1 = Student::create([
            'user_id'         => $this->studentUser1->id,
            'name'            => 'Ahmad Siswa 1',
            'nis'             => '8001',
            'unique_id'       => 'STU-8001',
            'school_class_id' => $this->classA->id,
        ]);

        // Student 2
        $this->studentUser2 = User::factory()->create(['role' => 'student', 'name' => 'Budi Siswa 2']);
        $this->student2 = Student::create([
            'user_id'         => $this->studentUser2->id,
            'name'            => 'Budi Siswa 2',
            'nis'             => '8002',
            'unique_id'       => 'STU-8002',
            'school_class_id' => $this->classA->id,
        ]);

        // Assignment
        $this->assignment = LmsAssignment::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Tugas 1 Persamaan Linear',
            'description'      => 'Kerjakan soal persamaan linear berikut',
            'max_points'       => 100,
        ]);
        $this->assignment->schoolClasses()->attach($this->classA->id);
    }

    /**
     * Test dashboard returns pending_grading_list with pending students and direct grade URL.
     */
    public function test_dashboard_pending_grading_list_contains_pending_students()
    {
        // Student 1 already graded
        LmsSubmission::create([
            'assignment_id' => $this->assignment->id,
            'student_id'    => $this->student1->id,
            'score'         => 90,
            'content'       => 'Jawaban Ahmad',
            'submitted_at'  => now(),
        ]);

        // Student 2 submitted but NOT graded
        $submission2 = LmsSubmission::create([
            'assignment_id' => $this->assignment->id,
            'student_id'    => $this->student2->id,
            'score'         => null,
            'content'       => 'Jawaban Budi yang belum dinilai',
            'submitted_at'  => now(),
        ]);

        $response = $this->actingAs($this->teacherUser)->get('/dashboard');
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->has('stats.pending_grading_list', 1)
            ->where('stats.pending_grading_list.0.id', $this->assignment->id)
            ->where('stats.pending_grading_list.0.pending_count', 1)
            ->has('stats.pending_grading_list.0.pending_students', 1)
            ->where('stats.pending_grading_list.0.pending_students.0.student_id', $this->student2->id)
            ->where('stats.pending_grading_list.0.pending_students.0.student_name', $this->student2->name)
            ->where('stats.pending_grading_list.0.pending_students.0.grade_url', function ($url) {
                return str_contains($url, "/assignments/{$this->assignment->id}/grade-view")
                    && str_contains($url, "student_id={$this->student2->id}");
            })
            ->where('stats.pending_grading_list.0.first_ungraded_url', function ($url) {
                return str_contains($url, "/assignments/{$this->assignment->id}/grade-view")
                    && str_contains($url, "student_id={$this->student2->id}");
            })
        );
    }

    /**
     * Test gradeView with student_id focuses directly on that student.
     */
    public function test_grade_view_with_student_id_targets_student()
    {
        $response = $this->actingAs($this->teacherUser)->get(
            route('assignments.grade-view', [
                'assignment' => $this->assignment->id,
                'student_id' => $this->student2->id,
            ])
        );

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('assignments/grade-split')
            ->where('assignment.id', $this->assignment->id)
            ->where('initial_student_id', $this->student2->id)
        );
    }

    /**
     * Test gradeView auto-detects first ungraded student if not specified.
     */
    public function test_grade_view_auto_detects_first_ungraded_student()
    {
        // Student 1 is graded
        LmsSubmission::create([
            'assignment_id' => $this->assignment->id,
            'student_id'    => $this->student1->id,
            'score'         => 85,
            'submitted_at'  => now(),
        ]);

        // Student 2 is NOT graded
        LmsSubmission::create([
            'assignment_id' => $this->assignment->id,
            'student_id'    => $this->student2->id,
            'score'         => null,
            'submitted_at'  => now(),
        ]);

        $response = $this->actingAs($this->teacherUser)->get(
            route('assignments.grade-view', $this->assignment->id)
        );

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('assignments/grade-split')
            ->where('assignment.id', $this->assignment->id)
            ->where('initial_student_id', $this->student2->id)
        );
    }
}
