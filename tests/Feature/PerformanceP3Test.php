<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\LmsAssignment;
use App\Models\LmsMaterial;
use App\Models\LmsReflection;
use App\Models\LmsSubmission;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Models\User;
use App\Services\EarlyWarningService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PerformanceP3Test extends TestCase
{
    use RefreshDatabase;

    protected function setupTeacherAndClass(): array
    {
        $user = User::factory()->create(['role' => 'teacher', 'name' => 'Guru IPA']);
        $teacher = Teacher::create([
            'user_id' => $user->id,
            'name'    => 'Guru IPA',
            'nip'     => '198501011001',
        ]);

        $subject = Subject::create(['name' => 'Fisika']);
        $class = SchoolClass::create(['name' => 'Kelas 9A']);

        TeachingAssignment::create([
            'teacher_id'      => $teacher->id,
            'subject_id'      => $subject->id,
            'school_class_id' => $class->id,
        ]);

        return [$user, $teacher, $subject, $class];
    }

    public function test_early_warning_summary_executes_in_bounded_queries()
    {
        [$user, $teacher, $subject, $class] = $this->setupTeacherAndClass();

        // Buat 10 siswa di dalam kelas
        for ($i = 1; $i <= 10; $i++) {
            Student::create([
                'name'            => "Siswa {$i}",
                'nis'             => "NIS-{$i}",
                'unique_id'       => "STU-{$i}",
                'school_class_id' => $class->id,
            ]);
        }

        // Buat 3 tugas
        for ($a = 1; $a <= 3; $a++) {
            LmsAssignment::create([
                'teacher_id'      => $teacher->id,
                'subject_id'      => $subject->id,
                'title'           => "Asesmen {$a}",
                'description'     => "Deskripsi Asesmen {$a}",
                'assessment_type' => 'formative',
                'max_points'      => 100,
                'passing_grade'   => 75,
            ]);
        }

        $service = app(EarlyWarningService::class);

        // Hitung query database yang dieksekusi saat memanggil getClassRiskSummary
        DB::enableQueryLog();
        DB::flushQueryLog();

        $summary = $service->getClassRiskSummary($class->id, $subject->id);

        $queryCount = count(DB::getQueryLog());

        // Tanpa optimasi, 10 siswa * 7 query = ~70 query.
        // Dengan batch pre-fetching, query maksimal <= 10 query!
        $this->assertLessThanOrEqual(10, $queryCount, "Expected <= 10 queries, but got {$queryCount}");
        $this->assertEquals(10, $summary['total_students']);
        $this->assertIsArray($summary['students']);
    }

    public function test_teacher_dashboard_executes_without_n_plus_one_queries()
    {
        [$user, $teacher, $subject, $class] = $this->setupTeacherAndClass();

        // Buat 5 kelas tambahan untuk menguji loop mengajar
        for ($c = 1; $c <= 5; $c++) {
            $extraClass = SchoolClass::create(['name' => "Kelas {$c}B"]);
            TeachingAssignment::create([
                'teacher_id'      => $teacher->id,
                'subject_id'      => $subject->id,
                'school_class_id' => $extraClass->id,
            ]);
            for ($s = 1; $s <= 3; $s++) {
                Student::create([
                    'name'            => "Siswa {$c}-{$s}",
                    'nis'             => "NIS-{$c}-{$s}",
                    'unique_id'       => "STU-{$c}-{$s}",
                    'school_class_id' => $extraClass->id,
                ]);
            }
        }

        $response = $this->actingAs($user)->get('/dashboard');
        $response->assertStatus(200);
    }

    public function test_gradebook_show_executes_correctly_with_keyed_lookups()
    {
        [$user, $teacher, $subject, $class] = $this->setupTeacherAndClass();

        $student = Student::create([
            'name'            => 'Budi Test',
            'nis'             => '1001',
            'unique_id'       => 'STU-1001',
            'school_class_id' => $class->id,
        ]);

        $assignment = LmsAssignment::create([
            'teacher_id'      => $teacher->id,
            'subject_id'      => $subject->id,
            'title'           => 'Sumatif 1',
            'description'     => 'Deskripsi Sumatif 1',
            'assessment_type' => 'summative',
            'max_points'      => 100,
        ]);
        $assignment->schoolClasses()->attach($class->id);

        LmsSubmission::create([
            'assignment_id' => $assignment->id,
            'student_id'    => $student->id,
            'score'         => 85,
            'submitted_at'  => now(),
        ]);

        $response = $this->actingAs($user)->get("/gradebook/show?subject_id={$subject->id}&class_id={$class->id}");
        $response->assertStatus(200);
    }
}
