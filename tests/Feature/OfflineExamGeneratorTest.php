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
use DOMDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;
use ZipArchive;

class OfflineExamGeneratorTest extends TestCase
{
    use RefreshDatabase;

    protected AcademicYear $academicYear;
    protected Semester $semester;
    protected User $teacherUser;
    protected Teacher $teacher;
    protected SchoolClass $schoolClass;
    protected SchoolClass $schoolClassB;
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

        $this->schoolClassB = SchoolClass::create([
            'name' => 'Kelas 8B',
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

        TeachingAssignment::create([
            'teacher_id' => $this->teacher->id,
            'school_class_id' => $this->schoolClassB->id,
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
            'description' => 'Memahami struktur data & algoritma pencarian sederhana dalam kehidupan sehari-hari.',
            'competence' => 'Memahami dan menganalisis',
            'content' => 'Struktur Data & Algoritma',
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
            ->has('classes', 2)
            ->has('subjects', 1)
            ->where('subjects.0.name', 'Informatika')
            ->has('tps', 1)
            ->where('tps.0.code', 'TP 8.1')
            ->where('teacher.name', 'Budi Santoso, S.Pd.')
        );
    }

    public function test_teacher_can_generate_offline_exam_preview_with_multiple_classes(): void
    {
        // Multi-class checkbox selection: Kelas 8A & Kelas 8B
        $response = $this->actingAs($this->teacherUser)->postJson('/offline-exams/generate', [
            'school_class_ids' => [$this->schoolClass->id, $this->schoolClassB->id],
            'learning_objective_id' => $this->tp->id,
            'question_type' => 'mixed',
            'question_count' => 6,
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
        $this->assertStringContainsString('Kelas 8A', $data['class_name']);
        $this->assertStringContainsString('Kelas 8B', $data['class_name']);
        $this->assertEquals('60 Menit', $data['time_limit']);
        $this->assertCount(6, $data['questions']);
        $this->assertCount(6, $data['blueprint']);
        $this->assertCount(6, $data['answer_keys']);
    }

    public function test_strict_essay_selection_contains_zero_multiple_choice_questions(): void
    {
        // Request 10 essay questions: MUST ONLY contain essay questions
        $response = $this->actingAs($this->teacherUser)->postJson('/offline-exams/generate', [
            'school_class_ids' => [$this->schoolClass->id],
            'learning_objective_id' => $this->tp->id,
            'question_type' => 'essay',
            'question_count' => 10,
            'output_format' => 'preview',
        ]);

        $response->assertStatus(200);
        $data = $response->json('exam');

        $this->assertCount(10, $data['questions']);
        $this->assertCount(0, $data['mc_questions'], 'mc_questions must be strictly empty for essay type');
        $this->assertCount(10, $data['essay_questions']);

        foreach ($data['questions'] as $q) {
            $this->assertEquals('essay', $q['type'], 'Question must be of type essay');
            $this->assertNull($q['options'], 'Options must be null for essay questions');
        }

        foreach ($data['blueprint'] as $bp) {
            $this->assertEquals('Esai / Uraian', $bp['question_type']);
        }
    }

    public function test_strict_multiple_choice_selection_contains_zero_essay_questions(): void
    {
        // Request 10 MC questions: MUST ONLY contain MC questions
        $response = $this->actingAs($this->teacherUser)->postJson('/offline-exams/generate', [
            'school_class_ids' => [$this->schoolClass->id],
            'learning_objective_id' => $this->tp->id,
            'question_type' => 'multiple_choice',
            'question_count' => 8,
            'output_format' => 'preview',
        ]);

        $response->assertStatus(200);
        $data = $response->json('exam');

        $this->assertCount(8, $data['questions']);
        $this->assertCount(8, $data['mc_questions']);
        $this->assertCount(0, $data['essay_questions'], 'essay_questions must be strictly empty for multiple_choice type');

        foreach ($data['questions'] as $q) {
            $this->assertEquals('multiple_choice', $q['type']);
            $this->assertIsArray($q['options']);
            $this->assertArrayHasKey('A', $q['options']);
            $this->assertArrayHasKey('B', $q['options']);
        }
    }

    public function test_teacher_can_generate_and_download_pdf(): void
    {
        $response = $this->actingAs($this->teacherUser)->post('/offline-exams/generate', [
            'school_class_ids' => [$this->schoolClass->id],
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

    public function test_teacher_can_generate_and_download_docx_with_valid_xml(): void
    {
        $response = $this->actingAs($this->teacherUser)->post('/offline-exams/generate', [
            'school_class_ids' => [$this->schoolClass->id, $this->schoolClassB->id],
            'learning_objective_id' => $this->tp->id,
            'question_type' => 'essay',
            'question_count' => 5,
            'output_format' => 'docx',
            'time_limit' => '45 Menit',
        ]);

        $response->assertStatus(200);
        $response->assertHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );

        // Verify the binary docx is valid OOXML and can be opened by Microsoft Word without XML errors
        $tempDocx = tempnam(sys_get_temp_dir(), 'test_exam_') . '.docx';
        $baseResponse = $response->baseResponse;
        if ($baseResponse instanceof \Symfony\Component\HttpFoundation\BinaryFileResponse) {
            $binaryContent = file_get_contents($baseResponse->getFile()->getPathname());
        } else {
            $binaryContent = $response->getContent();
        }
        file_put_contents($tempDocx, $binaryContent);

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($tempDocx), 'Generated DOCX must be a valid zip package');
        $xmlContent = $zip->getFromName('word/document.xml');
        $this->assertNotEmpty($xmlContent, 'DOCX must contain word/document.xml');
        $zip->close();
        @unlink($tempDocx);

        // Validate XML strictly: must not have any entity reference errors
        libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        $isXmlValid = $dom->loadXML($xmlContent);
        $errors = libxml_get_errors();
        libxml_clear_errors();

        $this->assertTrue($isXmlValid, 'word/document.xml must be 100% valid XML with no entity ref errors: ' . ($errors[0]->message ?? ''));
    }

    public function test_teacher_can_select_multiple_tps_and_questions_are_divided_equally(): void
    {
        $tp2 = LmsLearningObjective::create([
            'teacher_id' => $this->teacher->id,
            'subject_id' => $this->subject->id,
            'school_class_id' => $this->schoolClass->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id' => $this->semester->id,
            'code' => 'TP 8.2',
            'description' => 'Menerapkan logika percabangan dan perulangan dalam algoritma pemecahan masalah.',
            'competence' => 'Menerapkan dan mengimplementasikan',
            'content' => 'Logika Percabangan & Perulangan',
            'order' => 2,
        ]);

        // Request 10 questions with 2 selected TPs -> MUST be divided equally: 5 for TP1 and 5 for TP2
        $response = $this->actingAs($this->teacherUser)->postJson('/offline-exams/generate', [
            'school_class_ids' => [$this->schoolClass->id],
            'learning_objective_ids' => [$this->tp->id, $tp2->id],
            'question_type' => 'multiple_choice',
            'question_count' => 10,
            'output_format' => 'preview',
        ]);

        $response->assertStatus(200);
        $data = $response->json('exam');

        $this->assertCount(10, $data['questions']);
        $this->assertEquals(2, $data['total_tps']);
        $this->assertCount(2, $data['tp_allocations']);

        // First 5 questions belong to TP 8.1
        for ($i = 0; $i < 5; $i++) {
            $this->assertEquals('TP 8.1', $data['questions'][$i]['tp_code']);
            $this->assertEquals('TP 8.1', $data['blueprint'][$i]['tp_code']);
        }

        // Remaining 5 questions belong to TP 8.2
        for ($i = 5; $i < 10; $i++) {
            $this->assertEquals('TP 8.2', $data['questions'][$i]['tp_code']);
            $this->assertEquals('TP 8.2', $data['blueprint'][$i]['tp_code']);
        }

        // Verify detailed answer keys with distractor analysis
        $firstAk = $data['answer_keys'][0];
        $this->assertStringContainsString('Analisis Opsi Benar', $firstAk['explanation']);
        $this->assertStringContainsString('Analisis Opsi Pengecoh', $firstAk['explanation']);
    }

    public function test_essay_kunci_jawaban_has_detailed_model_answer_and_tiered_scoring_rubric(): void
    {
        $response = $this->actingAs($this->teacherUser)->postJson('/offline-exams/generate', [
            'school_class_ids' => [$this->schoolClass->id],
            'learning_objective_ids' => [$this->tp->id],
            'question_type' => 'essay',
            'question_count' => 5,
            'output_format' => 'preview',
        ]);

        $response->assertStatus(200);
        $data = $response->json('exam');

        $this->assertCount(5, $data['questions']);
        $this->assertCount(5, $data['answer_keys']);

        // Check detailed rubric in answer keys
        $firstAk = $data['answer_keys'][0];
        $this->assertStringContainsString('Kriteria Model Jawaban Lengkap', $firstAk['answer']);
        $this->assertStringContainsString('Pedoman & Rubrik Penskoran Analitik', $firstAk['explanation']);
        $this->assertStringContainsString('Skor 9 - 10', $firstAk['explanation']);
        $this->assertStringContainsString('Skor 0', $firstAk['explanation']);
    }

    public function test_validation_errors_when_required_inputs_are_missing(): void
    {
        $response = $this->actingAs($this->teacherUser)->postJson('/offline-exams/generate', []);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'school_class_ids',
            'learning_objective_ids',
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
            'school_class_ids' => [$otherClass->id],
            'learning_objective_id' => $otherTp->id,
            'question_type' => 'multiple_choice',
            'question_count' => 5,
            'output_format' => 'preview',
        ]);

        $response->assertStatus(403);
    }
}
