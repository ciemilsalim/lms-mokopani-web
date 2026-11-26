<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\GradebookFinalScore;
use App\Models\LmsAssignment;
use App\Models\LmsLearningObjective;
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

class HomeroomLegerTest extends TestCase
{
    use RefreshDatabase;

    protected AcademicYear $academicYear;
    protected Semester $semester;

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
    }

    public function test_homeroom_teacher_can_view_leger_nilai_with_all_subjects_and_kktp_status(): void
    {
        $waliUser = User::factory()->create(['role' => 'teacher', 'name' => 'Wali Kelas X-A']);
        $waliTeacher = Teacher::create([
            'user_id' => $waliUser->id,
            'name'    => 'Wali Kelas X-A',
            'nip'     => '198001012005011001',
        ]);

        $otherTeacherUser = User::factory()->create(['role' => 'teacher', 'name' => 'Guru Mapel Lain']);
        $otherTeacher = Teacher::create([
            'user_id' => $otherTeacherUser->id,
            'name'    => 'Guru Mapel Lain',
            'nip'     => '198102022006011002',
        ]);

        $classA = SchoolClass::create([
            'name'       => 'Kelas X-A',
            'teacher_id' => $waliTeacher->id,
        ]);

        $student1User = User::factory()->create(['role' => 'student', 'name' => 'Andi']);
        $student1 = Student::create([
            'user_id'         => $student1User->id,
            'school_class_id' => $classA->id,
            'name'            => 'Andi',
            'nis'             => '1001',
            'unique_id'       => 'STU-1001',
        ]);

        $student2User = User::factory()->create(['role' => 'student', 'name' => 'Budi']);
        $student2 = Student::create([
            'user_id'         => $student2User->id,
            'school_class_id' => $classA->id,
            'name'            => 'Budi',
            'nis'             => '1002',
            'unique_id'       => 'STU-1002',
        ]);

        $fisika = Subject::create(['name' => 'Fisika', 'code' => 'FIS', 'kktp' => 75]);
        $matematika = Subject::create(['name' => 'Matematika', 'code' => 'MAT', 'kktp' => 70]);

        TeachingAssignment::create([
            'teacher_id'       => $waliTeacher->id,
            'subject_id'       => $fisika->id,
            'school_class_id'  => $classA->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
        ]);

        TeachingAssignment::create([
            'teacher_id'       => $otherTeacher->id,
            'subject_id'       => $matematika->id,
            'school_class_id'  => $classA->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
        ]);

        // Fisika summative TP + submission
        $tpFisika = LmsLearningObjective::create([
            'teacher_id'       => $waliTeacher->id,
            'subject_id'       => $fisika->id,
            'school_class_id'  => $classA->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'code'             => 'TP 1',
            'description'      => 'Besaran dan Satuan',
        ]);

        $asmFisika = LmsAssignment::create([
            'teacher_id'            => $waliTeacher->id,
            'subject_id'            => $fisika->id,
            'academic_year_id'      => $this->academicYear->id,
            'semester_id'           => $this->semester->id,
            'learning_objective_id' => $tpFisika->id,
            'title'                 => 'Sumatif Besaran',
            'description'           => 'Ujian',
            'assessment_type'       => 'summative',
            'max_points'            => 100,
        ]);
        $asmFisika->schoolClasses()->attach($classA->id);

        LmsSubmission::create([
            'assignment_id' => $asmFisika->id,
            'student_id'    => $student1->id,
            'score'         => 80,
            'submitted_at'  => now(),
        ]);
        LmsSubmission::create([
            'assignment_id' => $asmFisika->id,
            'student_id'    => $student2->id,
            'score'         => 60,
            'submitted_at'  => now(),
        ]);

        // Matematika SAS score (taught by other teacher)
        GradebookFinalScore::create([
            'student_id'       => $student1->id,
            'subject_id'       => $matematika->id,
            'school_class_id'  => $classA->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'score'            => 90,
        ]);
        GradebookFinalScore::create([
            'student_id'       => $student2->id,
            'subject_id'       => $matematika->id,
            'school_class_id'  => $classA->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'score'            => 70,
        ]);

        $response = $this->actingAs($waliUser)->get('/gradebook/leger');
        $response->assertStatus(200);

        $response->assertInertia(fn (Assert $page) => $page
            ->component('gradebook/leger')
            ->where('is_homeroom_teacher', true)
            ->where('homeroom_class.id', $classA->id)
            ->where('school_class.name', 'Kelas X-A')
            ->has('subjects', 2)
            ->has('rows', 2)
            ->where('rows.0.name', 'Andi')
            ->where("rows.0.scores.{$fisika->id}.final_score", 80)
            ->where("rows.0.scores.{$fisika->id}.passed", true)
            ->where("rows.0.scores.{$matematika->id}.final_score", 90)
            ->where('rows.0.overall_average', 85)
            ->where('rows.0.below_kktp_count', 0)
            ->where('rows.1.name', 'Budi')
            ->where("rows.1.scores.{$fisika->id}.final_score", 60)
            ->where("rows.1.scores.{$fisika->id}.passed", false)
            ->where("rows.1.scores.{$matematika->id}.final_score", 70)
            ->where('rows.1.overall_average', 65)
            ->where('rows.1.below_kktp_count', 1)
            ->where('summary.total_students', 2)
            ->where('summary.total_subjects', 2)
            ->where('summary.students_need_attention', 1)
            ->where('summary.class_average', 75)
        );
    }

    public function test_non_homeroom_teacher_cannot_access_leger_nilai_and_gets_403(): void
    {
        $regularUser = User::factory()->create(['role' => 'teacher', 'name' => 'Guru Biasa']);
        Teacher::create([
            'user_id' => $regularUser->id,
            'name'    => 'Guru Biasa',
            'nip'     => '198501012010011099',
        ]);

        $gradebookResponse = $this->actingAs($regularUser)->get('/gradebook');
        $gradebookResponse->assertStatus(200);
        $gradebookResponse->assertInertia(fn (Assert $page) => $page
            ->where('is_homeroom_teacher', false)
            ->where('homeroom_class', null)
        );

        $this->actingAs($regularUser)->get('/gradebook/leger')->assertStatus(403);
        $this->actingAs($regularUser)->get('/gradebook/leger/export-csv')->assertStatus(403);
    }

    public function test_homeroom_teacher_cannot_access_other_class_leger_via_query_param(): void
    {
        $waliUser = User::factory()->create(['role' => 'teacher', 'name' => 'Wali Kelas A']);
        $waliTeacher = Teacher::create([
            'user_id' => $waliUser->id,
            'name'    => 'Wali Kelas A',
            'nip'     => '198001012005011003',
        ]);

        SchoolClass::create(['name' => 'Kelas X-A', 'teacher_id' => $waliTeacher->id]);
        $classB = SchoolClass::create(['name' => 'Kelas X-B']);

        $this->actingAs($waliUser)
            ->get("/gradebook/leger?class_id={$classB->id}")
            ->assertStatus(403);
    }

    public function test_homeroom_teacher_can_export_leger_csv(): void
    {
        $waliUser = User::factory()->create(['role' => 'teacher', 'name' => 'Wali Export']);
        $waliTeacher = Teacher::create([
            'user_id' => $waliUser->id,
            'name'    => 'Wali Export',
            'nip'     => '198001012005011004',
        ]);

        $classA = SchoolClass::create(['name' => 'Kelas X-A', 'teacher_id' => $waliTeacher->id]);
        $studentUser = User::factory()->create(['role' => 'student', 'name' => 'Citra']);
        $student = Student::create([
            'user_id'         => $studentUser->id,
            'school_class_id' => $classA->id,
            'name'            => 'Citra',
            'nis'             => '1003',
            'unique_id'       => 'STU-1003',
        ]);

        $biologi = Subject::create(['name' => 'Biologi', 'code' => 'BIO', 'kktp' => 75]);
        GradebookFinalScore::create([
            'student_id'       => $student->id,
            'subject_id'       => $biologi->id,
            'school_class_id'  => $classA->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'score'            => 88,
        ]);

        $response = $this->actingAs($waliUser)->get('/gradebook/leger/export-csv');
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $csv = $response->streamedContent();
        $this->assertStringContainsString('Citra', $csv);
        $this->assertStringContainsString('Biologi (KKTP 75)', $csv);
        $this->assertStringContainsString('88', $csv);
    }

    public function test_student_cannot_access_leger_nilai(): void
    {
        $classA = SchoolClass::create(['name' => 'Kelas X-A']);
        $studentUser = User::factory()->create(['role' => 'student', 'name' => 'Siswa']);
        Student::create([
            'user_id'         => $studentUser->id,
            'school_class_id' => $classA->id,
            'name'            => 'Siswa',
            'nis'             => '1004',
            'unique_id'       => 'STU-1004',
        ]);

        $this->actingAs($studentUser)->get('/gradebook/leger')->assertStatus(403);
    }

    public function test_homeroom_teacher_with_multi_year_classes_automatically_detects_active_year_class(): void
    {
        $pastYear = AcademicYear::create([
            'name'      => '2025/2026',
            'is_active' => false,
        ]);

        $waliUser = User::factory()->create(['role' => 'teacher', 'name' => 'Ibu Delmiyanti, SE']);
        $waliTeacher = Teacher::create([
            'user_id' => $waliUser->id,
            'name'    => 'Ibu Delmiyanti, SE',
            'nip'     => '198205082022212012',
        ]);

        // Class 7C di tahun ajaran lampau (ID lebih kecil)
        $class7C = SchoolClass::create([
            'name'             => 'Kelas 7C',
            'teacher_id'       => $waliTeacher->id,
            'academic_year_id' => $pastYear->id,
        ]);

        // Class 8C di tahun ajaran aktif ($this->academicYear: 2026/2027)
        $class8C = SchoolClass::create([
            'name'             => 'Kelas 8C',
            'teacher_id'       => $waliTeacher->id,
            'academic_year_id' => $this->academicYear->id,
        ]);

        // 1. Shared props Inertia harus mendeteksi Kelas 8C
        $response = $this->actingAs($waliUser)->get('/gradebook');
        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->where('is_homeroom_teacher', true)
            ->where('homeroom_class.id', $class8C->id)
            ->where('homeroom_class.name', 'Kelas 8C')
        );

        // 2. Endpoint Leger tanpa query param harus otomatis membuka Kelas 8C
        $legerResponse = $this->actingAs($waliUser)->get('/gradebook/leger');
        $legerResponse->assertStatus(200);
        $legerResponse->assertInertia(fn (Assert $page) => $page
            ->where('school_class.id', $class8C->id)
            ->where('school_class.name', 'Kelas 8C')
        );

        // 3. Akses eksplisit ke kelas lampau 7C tetap diizinkan karena merupakan kelas perwaliannya
        $pastResponse = $this->actingAs($waliUser)->get("/gradebook/leger?class_id={$class7C->id}");
        $pastResponse->assertStatus(200);
        $pastResponse->assertInertia(fn (Assert $page) => $page
            ->where('school_class.id', $class7C->id)
            ->where('school_class.name', 'Kelas 7C')
        );
    }

    public function test_wakasek_kurikulum_can_view_and_switch_all_classes_in_leger_nilai_and_export_csv(): void
    {
        $wakasekUser = User::factory()->create([
            'role' => 'wakasek_kurikulum',
            'name' => 'Wakasek Kurikulum',
        ]);

        $waliTeacherUser = User::factory()->create(['role' => 'teacher', 'name' => 'Wali Kelas 7A']);
        $waliTeacher = Teacher::create([
            'user_id' => $waliTeacherUser->id,
            'name'    => 'Wali Kelas 7A',
            'nip'     => '198001012005011011',
        ]);

        $class7A = SchoolClass::create([
            'name'             => 'Kelas 7A',
            'teacher_id'       => $waliTeacher->id,
            'academic_year_id' => $this->academicYear->id,
        ]);

        $class8B = SchoolClass::create([
            'name'             => 'Kelas 8B',
            'academic_year_id' => $this->academicYear->id,
        ]);

        $student7AUser = User::factory()->create(['role' => 'student', 'name' => 'Dewi 7A']);
        $student7A = Student::create([
            'user_id'         => $student7AUser->id,
            'school_class_id' => $class7A->id,
            'name'            => 'Dewi 7A',
            'nis'             => '2001',
            'unique_id'       => 'STU-2001',
        ]);

        $student8BUser = User::factory()->create(['role' => 'student', 'name' => 'Eko 8B']);
        $student8B = Student::create([
            'user_id'         => $student8BUser->id,
            'school_class_id' => $class8B->id,
            'name'            => 'Eko 8B',
            'nis'             => '2002',
            'unique_id'       => 'STU-2002',
        ]);

        $ipa = Subject::create(['name' => 'IPA', 'code' => 'IPA', 'kktp' => 75]);

        GradebookFinalScore::create([
            'student_id'       => $student7A->id,
            'subject_id'       => $ipa->id,
            'school_class_id'  => $class7A->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'score'            => 85,
        ]);

        GradebookFinalScore::create([
            'student_id'       => $student8B->id,
            'subject_id'       => $ipa->id,
            'school_class_id'  => $class8B->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'score'            => 92,
        ]);

        // 1. Mengakses /gradebook bagi wakasek_kurikulum diarahkan langsung ke /gradebook/leger
        $this->actingAs($wakasekUser)
            ->get('/gradebook')
            ->assertRedirect(route('gradebook.leger'));

        // 2. Mengakses /gradebook/leger tanpa parameter menampilkan kelas pertama + daftar seluruh kelas (admin_classes)
        $response = $this->actingAs($wakasekUser)->get('/gradebook/leger');
        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('gradebook/leger')
            ->where('user_role', 'wakasek_kurikulum')
            ->where('is_wakasek_kurikulum', true)
            ->where('is_read_only', true)
            ->where('school_class.id', $class7A->id)
            ->where('school_class.name', 'Kelas 7A')
            ->has('admin_classes', 2)
            ->has('rows', 1)
            ->where('rows.0.name', 'Dewi 7A')
            ->where("rows.0.scores.{$ipa->id}.final_score", 85)
        );

        // 3. Wakasek Kurikulum dapat berpindah ke kelas lain (Kelas 8B) via ?class_id=
        $switchResponse = $this->actingAs($wakasekUser)->get("/gradebook/leger?class_id={$class8B->id}");
        $switchResponse->assertStatus(200);
        $switchResponse->assertInertia(fn (Assert $page) => $page
            ->component('gradebook/leger')
            ->where('school_class.id', $class8B->id)
            ->where('school_class.name', 'Kelas 8B')
            ->has('rows', 1)
            ->where('rows.0.name', 'Eko 8B')
            ->where("rows.0.scores.{$ipa->id}.final_score", 92)
        );

        // 4. Wakasek Kurikulum dapat mengunduh CSV leger nilai kelas mana pun
        $csvResponse = $this->actingAs($wakasekUser)->get("/gradebook/leger/export-csv?class_id={$class8B->id}");
        $csvResponse->assertStatus(200);
        $csvResponse->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('Eko 8B', $csvResponse->streamedContent());
        $this->assertStringContainsString('92', $csvResponse->streamedContent());
    }

    public function test_wakasek_kurikulum_cannot_add_update_or_delete_any_scores(): void
    {
        // Uji akun Wakasek Kurikulum (bahkan jika akun tersebut juga terhubung ke data Teacher)
        $wakasekUser = User::factory()->create([
            'role' => 'wakasek_kurikulum',
            'name' => 'Wakasek Kurikulum Read Only',
        ]);
        $wakasekTeacher = Teacher::create([
            'user_id' => $wakasekUser->id,
            'name'    => 'Wakasek Kurikulum Read Only',
            'nip'     => '197901012005011022',
        ]);

        $classA = SchoolClass::create([
            'name'             => 'Kelas 9A',
            'teacher_id'       => $wakasekTeacher->id,
            'academic_year_id' => $this->academicYear->id,
        ]);

        $studentUser = User::factory()->create(['role' => 'student', 'name' => 'Fajar']);
        $student = Student::create([
            'user_id'         => $studentUser->id,
            'school_class_id' => $classA->id,
            'name'            => 'Fajar',
            'nis'             => '3001',
            'unique_id'       => 'STU-3001',
        ]);

        $subject = Subject::create(['name' => 'Bahasa Indonesia', 'code' => 'BIN', 'kktp' => 75]);

        $assignment = LmsAssignment::create([
            'teacher_id'      => $wakasekTeacher->id,
            'subject_id'      => $subject->id,
            'academic_year_id'=> $this->academicYear->id,
            'semester_id'     => $this->semester->id,
            'title'           => 'Sumatif Teks Laporan',
            'description'     => 'Ujian Sumatif',
            'assessment_type' => 'summative',
            'max_points'      => 100,
        ]);
        $assignment->schoolClasses()->attach($classA->id);

        $submission = LmsSubmission::create([
            'assignment_id' => $assignment->id,
            'student_id'    => $student->id,
            'score'         => 78,
            'submitted_at'  => now(),
        ]);

        $finalScore = GradebookFinalScore::create([
            'student_id'       => $student->id,
            'subject_id'       => $subject->id,
            'school_class_id'  => $classA->id,
            'academic_year_id' => $this->academicYear->id,
            'semester_id'      => $this->semester->id,
            'score'            => 80,
        ]);

        // 1. Tidak bisa menambah atau mengubah nilai akhir (SAS/ASAT) di Gradebook
        $this->actingAs($wakasekUser)
            ->postJson('/gradebook/final-score', [
                'student_id' => $student->id,
                'subject_id' => $subject->id,
                'class_id'   => $classA->id,
                'score'      => 99,
            ])
            ->assertStatus(403);

        $this->assertDatabaseHas('gradebook_final_scores', [
            'id'    => $finalScore->id,
            'score' => 80,
        ]);

        // 2. Tidak bisa menambah atau mengubah nilai tugas/asesmen
        $this->actingAs($wakasekUser)
            ->post('/assignments/grade', [
                'assignment_id' => $assignment->id,
                'student_id'    => $student->id,
                'score'         => 95,
            ])
            ->assertStatus(403);

        $this->assertDatabaseHas('lms_submissions', [
            'id'    => $submission->id,
            'score' => 78,
        ]);

        // 3. Tidak bisa membuat, mengubah, atau menghapus asesmen/nilai
        $this->actingAs($wakasekUser)
            ->post('/assignments', [
                'title'           => 'Asesmen Ilegal',
                'description'     => 'Test',
                'subject_id'      => $subject->id,
                'assessment_type' => 'summative',
                'due_date'        => now()->addDays(3)->toDateString(),
                'school_classes'  => [$classA->id],
            ])
            ->assertStatus(403);

        $this->actingAs($wakasekUser)
            ->post("/assignments/{$assignment->id}", [
                'title' => 'Ubah Asesmen',
            ])
            ->assertStatus(403);

        $this->actingAs($wakasekUser)
            ->delete("/assignments/{$assignment->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('lms_assignments', ['id' => $assignment->id]);

        // 4. Tidak bisa menambah/mengubah nilai P5, remedial, atau generate rapor
        $this->actingAs($wakasekUser)
            ->post('/p5/score', [
                'project_id'     => 1,
                'student_id'     => $student->id,
                'sub_element_id' => 1,
                'nilai'          => 'SB',
            ])
            ->assertStatus(403);

        $this->actingAs($wakasekUser)
            ->post('/remedial', [
                'records' => [],
            ])
            ->assertStatus(403);

        $this->actingAs($wakasekUser)
            ->post('/rapor/generate', [
                'student_id'         => $student->id,
                'calculation_method' => 'average',
                'tp_scores'          => ['TP 1' => 90],
            ])
            ->assertStatus(403);
    }
}
