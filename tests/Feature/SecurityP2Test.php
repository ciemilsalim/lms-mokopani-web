<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\LmsAssignment;
use App\Models\LmsModulAjar;
use App\Models\LmsRaporReport;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityP2Test extends TestCase
{
    use RefreshDatabase;

    protected function createTeacherWithUser(string $name = 'Guru Test'): array
    {
        $user = User::factory()->create(['role' => 'teacher', 'name' => $name]);
        $teacher = Teacher::create([
            'user_id' => $user->id,
            'name'    => $name,
            'nip'     => '19800101' . rand(1000, 9999),
        ]);
        return [$user, $teacher];
    }

    public function test_teacher_cannot_delete_another_teachers_assignment()
    {
        [$user1, $teacher1] = $this->createTeacherWithUser('Guru Satu');
        [$user2, $teacher2] = $this->createTeacherWithUser('Guru Dua');

        $assignment = LmsAssignment::create([
            'teacher_id'      => $teacher1->id,
            'subject_id'      => 1,
            'title'           => 'Tugas Guru Satu',
            'description'     => 'Deskripsi Tugas',
            'max_points'      => 100,
            'assessment_type' => 'formative',
            'due_date'        => now()->addDays(7),
        ]);

        // Guru 2 coba menghapus tugas milik Guru 1 -> Wajib 403 Forbidden
        $response = $this->actingAs($user2)->delete("/assignments/{$assignment->id}");
        $response->assertStatus(403);
        $this->assertDatabaseHas('lms_assignments', ['id' => $assignment->id]);

        // Guru 1 (pemilik) menghapus tugasnya sendiri -> Berhasil (302 Redirect)
        $responseOwner = $this->actingAs($user1)->delete("/assignments/{$assignment->id}");
        $responseOwner->assertStatus(302);
        $this->assertDatabaseMissing('lms_assignments', ['id' => $assignment->id]);
    }

    public function test_teacher_cannot_grade_another_teachers_assignment()
    {
        [$user1, $teacher1] = $this->createTeacherWithUser('Guru Satu');
        [$user2, $teacher2] = $this->createTeacherWithUser('Guru Dua');

        $subject = Subject::create(['name' => 'Matematika']);

        $assignment = LmsAssignment::create([
            'teacher_id'      => $teacher1->id,
            'subject_id'      => $subject->id,
            'title'           => 'Asesmen Matematika',
            'description'     => 'Soal Asesmen',
            'max_points'      => 100,
            'assessment_type' => 'formative',
            'due_date'        => now()->addDays(7),
        ]);

        $student = Student::create([
            'name'      => 'Siswa Test',
            'nis'       => '12345',
            'unique_id' => 'STU-12345',
        ]);

        // Guru 2 coba memberi nilai pada tugas Guru 1 -> Wajib 403 Forbidden
        $response = $this->actingAs($user2)->post('/assignments/grade', [
            'assignment_id' => $assignment->id,
            'student_id'    => $student->id,
            'score'         => 90,
        ]);
        $response->assertStatus(403);
    }

    public function test_teacher_cannot_update_final_score_for_unassigned_class()
    {
        [$user, $teacher] = $this->createTeacherWithUser('Guru Kimia');

        $class = SchoolClass::create(['name' => 'Kelas 7A']);
        $subject = Subject::create(['name' => 'Kimia']);
        $student = Student::create(['name' => 'Siswa A', 'nis' => '111', 'unique_id' => 'STU-111', 'school_class_id' => $class->id]);

        // Guru tidak memiliki TeachingAssignment di kelas & mapel ini
        $response = $this->actingAs($user)->post('/gradebook/final-score', [
            'student_id' => $student->id,
            'subject_id' => $subject->id,
            'class_id'   => $class->id,
            'score'      => 85,
        ]);
        $response->assertStatus(403);
    }

    public function test_teacher_cannot_access_unauthorized_rapor_report()
    {
        [$user1, $teacher1] = $this->createTeacherWithUser('Guru Pembuat');
        [$user2, $teacher2] = $this->createTeacherWithUser('Guru Lain');

        $class = SchoolClass::create(['name' => 'Kelas 8B']);
        $subject = Subject::create(['name' => 'Biologi']);
        $student = Student::create(['name' => 'Siswa B', 'nis' => '222', 'unique_id' => 'STU-222', 'school_class_id' => $class->id]);

        $report = LmsRaporReport::create([
            'student_id'        => $student->id,
            'subject_id'        => 1,
            'school_class_id'   => $class->id,
            'academic_year_id'  => 1,
            'semester_id'       => 1,
            'final_score'       => 88,
            'final_score_rounded' => 88,
            'calculation_method' => 'average',
            'created_by'        => $user1->id,
        ]);

        // Guru 2 yang tidak mengajar dan bukan wali kelas mencoba akses laporan -> 403 Forbidden
        $response = $this->actingAs($user2)->get("/rapor/{$report->id}");
        $response->assertStatus(403);

        $responsePdf = $this->actingAs($user2)->get("/rapor/{$report->id}/export/pdf");
        $responsePdf->assertStatus(403);
    }

    public function test_teacher_cannot_delete_another_teachers_material()
    {
        [$user1, $teacher1] = $this->createTeacherWithUser('Guru IPA 1');
        [$user2, $teacher2] = $this->createTeacherWithUser('Guru IPA 2');

        $material = \App\Models\LmsMaterial::create([
            'teacher_id' => $teacher1->id,
            'subject_id' => 1,
            'title'      => 'Materi Fotosintesis',
            'content'    => 'Isi materi',
        ]);

        // Guru 2 coba hapus materi Guru 1 -> 403 Forbidden
        $response = $this->actingAs($user2)->delete("/materials/{$material->id}");
        $response->assertStatus(403);
        $this->assertDatabaseHas('lms_materials', ['id' => $material->id]);

        // Guru 1 (pemilik) menghapus materi -> 302 Redirect
        $responseOwner = $this->actingAs($user1)->delete("/materials/{$material->id}");
        $responseOwner->assertStatus(302);
        $this->assertDatabaseMissing('lms_materials', ['id' => $material->id]);
    }

    public function test_teacher_cannot_delete_another_teachers_modul_ajar()
    {
        [$user1, $teacher1] = $this->createTeacherWithUser('Guru PAI 1');
        [$user2, $teacher2] = $this->createTeacherWithUser('Guru PAI 2');

        $tp = \App\Models\LmsLearningObjective::create([
            'teacher_id'       => $teacher1->id,
            'subject_id'       => 1,
            'academic_year_id' => 1,
            'semester_id'      => 1,
            'code'             => 'TP-01',
            'description'      => 'Tujuan Pembelajaran 1',
        ]);

        $material1 = \App\Models\LmsMaterial::create([
            'teacher_id' => $teacher1->id,
            'subject_id' => 1,
            'title'      => 'Materi Modul 1',
        ]);

        $modul = LmsModulAjar::create([
            'teacher_id'            => $teacher1->id,
            'subject_id'            => 1,
            'learning_objective_id' => $tp->id,
            'material_id'           => $material1->id,
        ]);

        // Guru 2 coba hapus modul ajar milik Guru 1 -> 404 (karena query scoped by teacher_id) atau 403
        $response = $this->actingAs($user2)->delete("/lesson-plans/{$modul->id}");
        $this->assertTrue(in_array($response->status(), [403, 404]));
        $this->assertDatabaseHas('lms_modul_ajars', ['id' => $modul->id]);

        // Guru 1 (pemilik) menghapus modul ajar -> 302 Redirect
        $responseOwner = $this->actingAs($user1)->delete("/lesson-plans/{$modul->id}");
        $responseOwner->assertStatus(302);
        $this->assertDatabaseMissing('lms_modul_ajars', ['id' => $modul->id]);
    }

    public function test_admin_can_manage_material_and_modul_ajar()
    {
        $admin = User::factory()->create(['role' => 'admin', 'name' => 'Administrator']);
        [$user, $teacher] = $this->createTeacherWithUser('Guru Biasa');

        $material = \App\Models\LmsMaterial::create([
            'teacher_id' => $teacher->id,
            'subject_id' => 1,
            'title'      => 'Materi Admin Test',
        ]);

        $tp = \App\Models\LmsLearningObjective::create([
            'teacher_id'       => $teacher->id,
            'subject_id'       => 1,
            'academic_year_id' => 1,
            'semester_id'      => 1,
            'code'             => 'TP-ADM',
            'description'      => 'Tujuan Admin Test',
        ]);

        $modul = LmsModulAjar::create([
            'teacher_id'            => $teacher->id,
            'subject_id'            => 1,
            'learning_objective_id' => $tp->id,
            'material_id'           => $material->id,
        ]);

        // Admin menghapus materi guru -> Berhasil 302
        $responseMat = $this->actingAs($admin)->delete("/materials/{$material->id}");
        $responseMat->assertStatus(302);
        $this->assertDatabaseMissing('lms_materials', ['id' => $material->id]);

        // Admin menghapus modul ajar guru -> Berhasil 302
        $responseMod = $this->actingAs($admin)->delete("/lesson-plans/{$modul->id}");
        $responseMod->assertStatus(302);
        $this->assertDatabaseMissing('lms_modul_ajars', ['id' => $modul->id]);
    }
}
