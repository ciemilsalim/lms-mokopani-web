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
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TeacherBankAsesmenAuditTest extends TestCase
{
    use RefreshDatabase;

    protected AcademicYear $academicYear;
    protected Semester $semester;
    protected SchoolClass $schoolClass;
    protected Subject $subject;
    protected User $teacherUser;
    protected Teacher $teacher;

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

        $this->schoolClass = SchoolClass::create(['name' => 'Kelas XI-A']);
        $this->subject = Subject::create(['name' => 'Fisika', 'code' => 'FIS-11']);

        $this->teacherUser = User::factory()->create(['role' => 'teacher', 'name' => 'Guru Fisika']);
        $this->teacher = Teacher::create([
            'user_id' => $this->teacherUser->id,
            'name'    => 'Guru Fisika',
            'nip'     => '198203032009011002',
        ]);
    }

    public function test_teacher_bank_asesmen_returns_grouped_assessments_stats_and_overdue_count(): void
    {
        $studentUser = User::factory()->create(['role' => 'student', 'name' => 'Siswa 1']);
        $student = Student::create([
            'user_id'         => $studentUser->id,
            'school_class_id' => $this->schoolClass->id,
            'name'            => 'Siswa 1',
            'nis'             => '2026101',
            'unique_id'       => 'STU-2026101',
        ]);

        $overdueAsm = LmsAssignment::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Sumatif Kinematika',
            'description'      => 'Ujian Kinematika',
            'assessment_type'  => 'summative',
            'max_points'       => 100,
            'due_date'         => now()->subDays(2),
        ]);
        $overdueAsm->schoolClasses()->attach($this->schoolClass->id);

        LmsSubmission::create([
            'assignment_id' => $overdueAsm->id,
            'student_id'    => $student->id,
            'score'         => null,
            'submitted_at'  => now()->subDays(3),
        ]);

        $activeAsm = LmsAssignment::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Kuis Diagnostik Vektor',
            'description'      => 'Diagnostik',
            'assessment_type'  => 'initial',
            'max_points'       => 100,
            'due_date'         => now()->addDays(4),
        ]);
        $activeAsm->schoolClasses()->attach($this->schoolClass->id);

        $response = $this->actingAs($this->teacherUser)->get('/assignments');
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('assignments/index')
            ->where('user_role', 'teacher')
            ->where('stats.total_active', 2)
            ->where('stats.total_pending_grading', 1)
            ->where('stats.total_overdue', 1)
            ->where('counts_by_type.all', 2)
            ->where('counts_by_type.initial', 1)
            ->where('counts_by_type.summative', 1)
            ->has('teacher_grouped', 1)
            ->where('teacher_grouped.0.class_id', $this->schoolClass->id)
            ->where('teacher_grouped.0.class_name', 'Kelas XI-A')
        );
    }

    public function test_teacher_bank_asesmen_includes_assignments_without_classes_in_fallback_group(): void
    {
        LmsAssignment::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Asesmen Tanpa Kelas',
            'description'      => 'Draft asesmen',
            'assessment_type'  => 'formative',
            'max_points'       => 100,
        ]);

        $response = $this->actingAs($this->teacherUser)->get('/assignments');
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('assignments/index')
            ->where('stats.total_active', 1)
            ->has('teacher_grouped', 1)
            ->where('teacher_grouped.0.class_id', 0)
            ->where('teacher_grouped.0.class_name', 'Belum Ada Kelas')
            ->where('teacher_grouped.0.subjects.0.objectives.0.assignments.0.title', 'Asesmen Tanpa Kelas')
        );
    }

    public function test_admin_without_teacher_record_receives_teacher_grouped_bank_asesmen(): void
    {
        $adminUser = User::factory()->create(['role' => 'admin', 'name' => 'Admin Sekolah']);

        $asm = LmsAssignment::create([
            'teacher_id'       => $this->teacher->id,
            'subject_id'       => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'title'            => 'Asesmen Bersama',
            'description'      => 'Deskripsi',
            'assessment_type'  => 'summative',
            'max_points'       => 100,
        ]);
        $asm->schoolClasses()->attach($this->schoolClass->id);

        $response = $this->actingAs($adminUser)->get('/assignments');
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('assignments/index')
            ->where('user_role', 'admin')
            ->has('teacher_grouped', 1)
            ->where('stats.total_active', 1)
        );
    }
}
