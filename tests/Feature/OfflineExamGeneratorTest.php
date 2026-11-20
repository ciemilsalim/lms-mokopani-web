<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\LmsLearningObjective;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OfflineExamGeneratorTest extends TestCase
{
    use RefreshDatabase;

    protected AcademicYear $academicYear;
    protected Semester $semester;
    protected User $teacherUser;
    protected Teacher $teacher;
    protected SchoolClass $schoolClass;
    protected Subject $subject;
    protected LmsLearningObjective $tp;

    protected function setUp(): void
    {
        parent::setUp();

        $this->academicYear = AcademicYear::create([
            'name' => '2026/2027',
            'is_active' => true,
        ]);

        $this->semester = Semester::create([
            'academic_year_id' => $this->academicYear->id,
            'name' => 'Ganjil',
            'semester' => '1',
            'is_active' => true,
        ]);

        $this->teacherUser = User::factory()->create([
            'name' => 'Budi Santoso, S.Pd.',
            'role' => 'teacher',
        ]);

        $this->teacher = Teacher::create([
            'user_id' => $this->teacherUser->id,
            'name' => 'Budi Santoso, S.Pd.',
            'nip' => '198501012010011001',
        ]);

        $this->schoolClass = SchoolClass::create([
            'name' => 'Kelas 8A',
            'academic_year_id' => $this->academicYear->id,
        ]);

        $this->subject = Subject::create([
            'name' => 'Informatika',
            'code' => 'INF',
            'kktp' => 75,
        ]);

        TeachingAssignment::create([
            'teacher_id' => $this->teacher->id,
            'school_class_id' => $this->schoolClass->id,
            'subject_id' => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id' => $this->semester->id,
        ]);

        $this->tp = LmsLearningObjective::create([
            'teacher_id' => $this->teacher->id,
            'subject_id' => $this->subject->id,
            'school_class_id' => $this->schoolClass->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id' => $this->semester->id,
            'code' => 'TP 8.1',
            'description' => 'Memahami struktur data dan algoritma pencarian sederhana dalam kehidupan sehari-hari.',
            'competence' => 'Memahami dan menganalisis',
            'content' => 'Struktur Data dan Algoritma',
            'order' => 1,
        ]);
    }

    public function test_guest_is_redirected_when_accessing_offline_exams(): void
    {
        $response = $this->get('/offline-exams');
        $response->assertRedirect('/login');
    }

    public function test_student_gets_403_forbidden_accessing_offline_exams(): void
    {
        $studentUser = User::factory()->create(['role' => 'student']);
        $response = $this->actingAs($studentUser)->get('/offline-exams');
        $response->assertStatus(403);
    }

    public function test_teacher_can_view_offline_exams_generator_page(): void
    {
        $response = $this->actingAs($this->teacherUser)->get('/offline-exams');
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('offline-exams/index')
            ->has('classes', 1)
            ->where('classes.0.name', 'Kelas 8A')
            ->has('subjects', 1)
            ->where('subjects.0.name', 'Informatika')
            ->has('tps', 1)
            ->where('tps.0.code', 'TP 8.1')
            ->where('teacher.name', 'Budi Santoso, S.Pd.')
        );
    }

    public function test_teacher_can_generate_offline_exam_preview(): void
    {
        $response = $this->actingAs($this->teacherUser)->postJson('/offline-exams/generate', [
            'school_class_id' => $this->schoolClass->id,
            'learning_objective_id' => $this->tp->id,
            'question_type' => 'mixed',
            'question_count' => 5,
            'output_format' => 'preview',
            'time_limit' => '60 Menit',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $data = $response->json('exam');
        $this->assertNotEmpty($data);
        $this->assertEquals('Informatika', $data['subject_name']);
        $this->assertEquals('Kelas 8A', $data['class_name']);
        $this->assertEquals('60 Menit', $data['time_limit']);
        $this->assertCount(5, $data['questions']);
        $this->assertCount(5, $data['blueprint']);
        $this->assertCount(5, $data['answer_keys']);
    }

    public function test_teacher_can_generate_and_download_pdf(): void
    {
        $response = $this->actingAs($this->teacherUser)->post('/offline-exams/generate', [
            'school_class_id' => $this->schoolClass->id,
            'learning_objective_id' => $this->tp->id,
            'question_type' => 'multiple_choice',
            'question_count' => 5,
            'output_format' => 'pdf',
            'time_limit' => '90 Menit',
        ]);

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
        $this->assertNotEmpty($response->getContent());
    }

    public function test_teacher_can_generate_and_download_docx(): void
    {
        $response = $this->actingAs($this->teacherUser)->post('/offline-exams/generate', [
            'school_class_id' => $this->schoolClass->id,
            'learning_objective_id' => $this->tp->id,
            'question_type' => 'essay',
            'question_count' => 3,
            'output_format' => 'docx',
            'time_limit' => '45 Menit',
        ]);

        $response->assertStatus(200);
        $response->assertHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
    }

    public function test_validation_errors_when_required_inputs_are_missing(): void
    {
        $response = $this->actingAs($this->teacherUser)->postJson('/offline-exams/generate', []);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'school_class_id',
            'learning_objective_id',
            'question_type',
            'question_count',
            'output_format',
        ]);
    }

    public function test_teacher_cannot_generate_exam_for_unassigned_tp_and_class_idor_protection(): void
    {
        // Another teacher
        $otherUser = User::factory()->create(['role' => 'teacher', 'name' => 'Guru Lain']);
        $otherTeacher = Teacher::create([
            'user_id' => $otherUser->id,
            'name' => 'Guru Lain',
            'nip' => '199002022015011002',
        ]);

        // Another teacher's class
        $otherClass = SchoolClass::create(['name' => 'Kelas 9Z', 'academic_year_id' => $this->academicYear->id]);
        $otherTp = LmsLearningObjective::create([
            'teacher_id' => $otherTeacher->id,
            'subject_id' => $this->subject->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id' => $this->semester->id,
            'code' => 'TP 9.1',
            'description' => 'Materi Guru Lain',
        ]);

        // Teacher Budi attempts to access other teacher's class & TP
        $response = $this->actingAs($this->teacherUser)->postJson('/offline-exams/generate', [
            'school_class_id' => $otherClass->id,
            'learning_objective_id' => $otherTp->id,
            'question_type' => 'multiple_choice',
            'question_count' => 5,
            'output_format' => 'preview',
        ]);

        $response->assertStatus(403);
    }
}
