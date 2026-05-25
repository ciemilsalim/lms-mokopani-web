<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\GradebookFinalScore;
use App\Models\LmsAssignment;
use App\Models\LmsCapaianPembelajaran;
use App\Models\LmsComment;
use App\Models\LmsLearningObjective;
use App\Models\LmsMaterial;
use App\Models\LmsP5Dimensi;
use App\Models\LmsP5Project;
use App\Models\LmsP5ProjectScore;
use App\Models\LmsReflection;
use App\Models\LmsRemedialRecord;
use App\Models\LmsStudentMaterial;
use App\Models\LmsSubmission;
use App\Models\Schedule;
use App\Models\SchoolClass;
use App\Models\Semester;
use App\Models\Setting;
use App\Models\Student;
use App\Models\StudentDiagnosticResult;
use App\Models\StudentNonCognitiveDiagnostic;
use App\Models\Subject;
use App\Models\SubjectAttendance;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class LmsMockDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Membuat data simulasi lengkap untuk LMS Mokopani Web
     * mencakup seluruh modul: Pembelajaran, Asesmen, Analitik,
     * Early Warning System, E-Rapor, Diagnostik, P5, dan Remedial.
     */
    public function run(): void
    {
        $this->command->info('🚀 Memulai seeder data tiruan LMS Mokopani...');

        // ──────────────────────────────────────────────
        // 1. Tahun Akademik & Semester
        // ──────────────────────────────────────────────
        $this->command->info('📅 Membuat Tahun Akademik & Semester...');

        $academicYear = AcademicYear::firstOrCreate(
            ['name' => '2025/2026'],
            ['is_active' => true]
        );

        $semester1 = Semester::firstOrCreate(
            ['academic_year_id' => $academicYear->id, 'name' => 'Ganjil'],
            ['is_active' => false]
        );

        $semester2 = Semester::firstOrCreate(
            ['academic_year_id' => $academicYear->id, 'name' => 'Genap'],
            ['is_active' => true]
        );

        $activeSemester = $semester2;

        // ──────────────────────────────────────────────
        // 2. Kelas
        // ──────────────────────────────────────────────
        $this->command->info('🏫 Membuat Kelas...');

        $classesData = [
            ['name' => 'X-1', 'level_id' => 1],
            ['name' => 'X-2', 'level_id' => 1],
            ['name' => 'XI-1', 'level_id' => 2],
        ];

        $classes = [];
        foreach ($classesData as $cls) {
            $classes[] = SchoolClass::firstOrCreate(
                ['name' => $cls['name']],
                ['teacher_id' => null, 'level_id' => $cls['level_id']]
            );
        }

        // ──────────────────────────────────────────────
        // 3. Mata Pelajaran
        // ──────────────────────────────────────────────
        $this->command->info('📚 Membuat Mata Pelajaran...');

        $subjectsData = [
            ['name' => 'Informatika',       'code' => 'INF', 'description' => 'Ilmu Komputer dan Pemrograman',      'fase' => 'E', 'kktp' => 75],
            ['name' => 'Matematika',         'code' => 'MTK', 'description' => 'Aljabar, Geometri, dan Statistika', 'fase' => 'E', 'kktp' => 70],
            ['name' => 'Bahasa Indonesia',   'code' => 'BIN', 'description' => 'Sastra, Tata Bahasa, dan Komunikasi', 'fase' => 'E', 'kktp' => 72],
        ];

        $subjects = [];
        foreach ($subjectsData as $subj) {
            $subjects[] = Subject::firstOrCreate(
                ['code' => $subj['code']],
                $subj
            );
        }

        // ──────────────────────────────────────────────
        // 4. Guru (3 Guru + 1 Admin)
        // ──────────────────────────────────────────────
        $this->command->info('👨‍🏫 Membuat akun Guru...');

        $teachersData = [
            ['name' => 'Budi Santoso, S.Kom.',  'email' => 'budi.guru@mokopani.sch.id',   'nip' => '198501012010011001', 'phone_number' => '08123456781'],
            ['name' => 'Siti Aminah, S.Pd.',     'email' => 'siti.guru@mokopani.sch.id',   'nip' => '198703152012012002', 'phone_number' => '08123456782'],
            ['name' => 'Rahmat Hidayat, M.Pd.',  'email' => 'rahmat.guru@mokopani.sch.id', 'nip' => '199005202015011003', 'phone_number' => '08123456783'],
        ];

        $teachers = [];
        foreach ($teachersData as $idx => $td) {
            $user = User::firstOrCreate(
                ['email' => $td['email']],
                [
                    'name'     => $td['name'],
                    'password' => Hash::make('password'),
                    'role'     => 'teacher',
                ]
            );
            $teacher = Teacher::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'name'         => $td['name'],
                    'nip'          => $td['nip'],
                    'phone_number' => $td['phone_number'],
                ]
            );
            $teachers[] = $teacher;
        }

        // Assign wali kelas
        $classes[0]->update(['teacher_id' => $teachers[0]->id]); // Budi => X-1
        $classes[1]->update(['teacher_id' => $teachers[1]->id]); // Siti => X-2
        $classes[2]->update(['teacher_id' => $teachers[2]->id]); // Rahmat => XI-1

        // Admin user
        User::firstOrCreate(
            ['email' => 'admin@mokopani.sch.id'],
            [
                'name'     => 'Admin Mokopani',
                'password' => Hash::make('password'),
                'role'     => 'admin',
            ]
        );

        // ──────────────────────────────────────────────
        // 5. Siswa (10 per kelas = 30 total)
        // ──────────────────────────────────────────────
        $this->command->info('🎓 Membuat akun Siswa...');

        $studentNames = [
            // Kelas X-1
            ['Ahmad Fauzan', 'Bintang Pratama', 'Citra Dewi', 'Dina Safitri', 'Eko Prasetyo',
             'Fajar Nugroho', 'Gita Puspita', 'Hana Kusuma', 'Irfan Maulana', 'Jasmine Putri'],
            // Kelas X-2
            ['Kevin Wijaya', 'Lina Marlina', 'Muhammad Rizky', 'Nadia Permata', 'Oscar Hakim',
             'Putri Ayu', 'Qori Ramadhan', 'Rina Sari', 'Surya Darma', 'Tania Hartono'],
            // Kelas XI-1
            ['Umar Faruq', 'Vina Anggraeni', 'Wawan Setiawan', 'Xena Olivia', 'Yusuf Habibi',
             'Zahra Amelia', 'Adi Nugraha', 'Bella Permata', 'Cahyo Wibowo', 'Della Safira'],
        ];

        $allStudents = []; // indexed by class index
        foreach ($classes as $classIdx => $class) {
            $allStudents[$classIdx] = [];
            foreach ($studentNames[$classIdx] as $studentIdx => $name) {
                $nis = sprintf('2025%02d%02d', $classIdx + 1, $studentIdx + 1);
                $email = strtolower(str_replace(' ', '.', $name)) . '@siswa.mokopani.sch.id';

                $user = User::firstOrCreate(
                    ['email' => $email],
                    [
                        'name'     => $name,
                        'password' => Hash::make('password'),
                        'role'     => 'student',
                    ]
                );

                $student = Student::firstOrCreate(
                    ['user_id' => $user->id],
                    [
                        'name'            => $name,
                        'nis'             => $nis,
                        'school_class_id' => $class->id,
                        'unique_id'       => \Illuminate\Support\Str::random(12),
                    ]
                );

                $allStudents[$classIdx][] = $student;
            }
        }

        // ──────────────────────────────────────────────
        // 6. Tugas Mengajar & Jadwal
        // ──────────────────────────────────────────────
        $this->command->info('📋 Membuat Tugas Mengajar & Jadwal...');

        // Guru -> Mapel mapping:
        // Budi (0)    => Informatika (0)
        // Siti (1)    => Matematika (1)
        // Rahmat (2)  => Bahasa Indonesia (2)
        $teacherSubjectMap = [0 => 0, 1 => 1, 2 => 2];

        $teachingAssignments = [];
        $schedules = [];
        $daysOfWeek = [1, 2, 3, 4, 5];
        $timeSlots = [
            ['07:30', '09:00'],
            ['09:15', '10:45'],
            ['11:00', '12:30'],
        ];

        foreach ($teacherSubjectMap as $teacherIdx => $subjectIdx) {
            foreach ($classes as $classIdx => $class) {
                $ta = TeachingAssignment::firstOrCreate([
                    'school_class_id' => $class->id,
                    'subject_id'      => $subjects[$subjectIdx]->id,
                    'teacher_id'      => $teachers[$teacherIdx]->id,
                ]);
                $teachingAssignments[] = $ta;

                // Buat jadwal: satu hari per kelas untuk setiap guru
                $dayIdx = ($teacherIdx + $classIdx) % count($daysOfWeek);
                $timeIdx = $classIdx % count($timeSlots);

                $schedule = Schedule::firstOrCreate([
                    'teaching_assignment_id' => $ta->id,
                ], [
                    'day_of_week' => $daysOfWeek[$dayIdx],
                    'start_time'  => $timeSlots[$timeIdx][0],
                    'end_time'    => $timeSlots[$timeIdx][1],
                ]);
                $schedules[] = $schedule;
            }
        }

        // Attach pivot subject_teacher
        foreach ($teacherSubjectMap as $teacherIdx => $subjectIdx) {
            $subjects[$subjectIdx]->teachers()->syncWithoutDetaching([$teachers[$teacherIdx]->id]);
        }

        // ──────────────────────────────────────────────
        // 7. Capaian Pembelajaran (CP)
        // ──────────────────────────────────────────────
        $this->command->info('🎯 Membuat Capaian Pembelajaran (CP)...');

        $cpData = [
            // Informatika
            [
                'subject_idx' => 0,
                'items' => [
                    ['kode' => 'CP-INF-E-01', 'fase' => 'E', 'elemen' => 'Berpikir Komputasional', 'deskripsi' => 'Peserta didik mampu menerapkan strategi algoritmik untuk menyelesaikan permasalahan sehari-hari, termasuk dekomposisi, pengenalan pola, abstraksi, dan perancangan algoritma.'],
                    ['kode' => 'CP-INF-E-02', 'fase' => 'E', 'elemen' => 'Teknologi Informasi dan Komunikasi', 'deskripsi' => 'Peserta didik mampu memanfaatkan berbagai aplikasi dan layanan digital secara bijak, aman, dan bertanggung jawab untuk mendukung aktivitas pembelajaran dan kehidupan sehari-hari.'],
                ],
            ],
            // Matematika
            [
                'subject_idx' => 1,
                'items' => [
                    ['kode' => 'CP-MTK-E-01', 'fase' => 'E', 'elemen' => 'Bilangan', 'deskripsi' => 'Peserta didik mampu memahami dan menerapkan konsep bilangan rasional dan irasional dalam konteks pemecahan masalah matematis.'],
                    ['kode' => 'CP-MTK-E-02', 'fase' => 'E', 'elemen' => 'Aljabar', 'deskripsi' => 'Peserta didik mampu menyusun, menyederhanakan, dan menyelesaikan persamaan serta pertidaksamaan linear dan kuadrat.'],
                ],
            ],
            // Bahasa Indonesia
            [
                'subject_idx' => 2,
                'items' => [
                    ['kode' => 'CP-BIN-E-01', 'fase' => 'E', 'elemen' => 'Menyimak', 'deskripsi' => 'Peserta didik mampu memahami, menganalisis, dan mengevaluasi informasi berupa gagasan, pikiran, perasaan, dan pendapat yang disampaikan secara lisan.'],
                    ['kode' => 'CP-BIN-E-02', 'fase' => 'E', 'elemen' => 'Menulis', 'deskripsi' => 'Peserta didik mampu menulis berbagai jenis teks (naratif, eksposisi, argumentasi) dengan memperhatikan kaidah kebahasaan, struktur teks, dan konteks sosial budaya.'],
                ],
            ],
        ];

        $allCps = [];
        foreach ($cpData as $group) {
            foreach ($group['items'] as $cp) {
                $allCps[] = LmsCapaianPembelajaran::firstOrCreate(
                    ['kode' => $cp['kode']],
                    array_merge($cp, ['subject_id' => $subjects[$group['subject_idx']]->id])
                );
            }
        }

        // ──────────────────────────────────────────────
        // 8. Tujuan Pembelajaran (TP) — 3 TP per mapel per kelas
        // ──────────────────────────────────────────────
        $this->command->info('📝 Membuat Tujuan Pembelajaran (TP)...');

        $tpTemplates = [
            // Informatika
            0 => [
                ['code' => 'TP-INF-01', 'description' => 'Menerapkan konsep algoritma sekuensial, percabangan, dan pengulangan dalam pemrograman dasar', 'competence' => 'Berpikir Komputasional', 'content' => 'Algoritma dan Pemrograman Dasar'],
                ['code' => 'TP-INF-02', 'description' => 'Menganalisis dan merancang solusi permasalahan menggunakan diagram alir (flowchart)', 'competence' => 'Dekomposisi dan Abstraksi', 'content' => 'Diagram Alir dan Pseudocode'],
                ['code' => 'TP-INF-03', 'description' => 'Menerapkan prinsip keamanan digital dan etika penggunaan teknologi informasi', 'competence' => 'Literasi Digital', 'content' => 'Keamanan Digital dan Etika TIK'],
            ],
            // Matematika
            1 => [
                ['code' => 'TP-MTK-01', 'description' => 'Menyelesaikan persamaan dan pertidaksamaan linear satu variabel dalam berbagai konteks', 'competence' => 'Penalaran Aljabar', 'content' => 'Persamaan Linear Satu Variabel'],
                ['code' => 'TP-MTK-02', 'description' => 'Menganalisis sifat-sifat bangun datar dan bangun ruang serta menghitung luas dan volumenya', 'competence' => 'Pemahaman Geometri', 'content' => 'Geometri Bangun Datar dan Ruang'],
                ['code' => 'TP-MTK-03', 'description' => 'Mengumpulkan, mengolah, dan menafsirkan data menggunakan ukuran pemusatan dan penyebaran', 'competence' => 'Analisis Data', 'content' => 'Statistika Deskriptif'],
            ],
            // Bahasa Indonesia
            2 => [
                ['code' => 'TP-BIN-01', 'description' => 'Mengidentifikasi struktur, kaidah kebahasaan, dan unsur intrinsik teks naratif (cerpen/novel)', 'competence' => 'Analisis Sastra', 'content' => 'Teks Naratif: Cerpen dan Novel'],
                ['code' => 'TP-BIN-02', 'description' => 'Menulis teks eksposisi dengan argumen yang logis, data pendukung, dan struktur yang tepat', 'competence' => 'Menulis Argumentatif', 'content' => 'Teks Eksposisi'],
                ['code' => 'TP-BIN-03', 'description' => 'Menyajikan informasi lisan secara terstruktur dalam presentasi akademik dan diskusi kelompok', 'competence' => 'Komunikasi Lisan', 'content' => 'Presentasi dan Diskusi'],
            ],
        ];

        $allTps = []; // [subjectIdx][classIdx] => [tp1, tp2, tp3]
        foreach ($teacherSubjectMap as $teacherIdx => $subjectIdx) {
            $allTps[$subjectIdx] = [];
            foreach ($classes as $classIdx => $class) {
                $allTps[$subjectIdx][$classIdx] = [];
                $cpForSubject = array_slice($allCps, $subjectIdx * 2, 2);
                foreach ($tpTemplates[$subjectIdx] as $tpIdx => $tpData) {
                    $tp = LmsLearningObjective::firstOrCreate(
                        [
                            'code'       => $tpData['code'] . '-' . $class->name,
                            'subject_id' => $subjects[$subjectIdx]->id,
                            'school_class_id' => $class->id,
                        ],
                        [
                            'teacher_id'       => $teachers[$teacherIdx]->id,
                            'academic_year_id' => $academicYear->id,
                            'semester_id'      => $activeSemester->id,
                            'description'      => $tpData['description'],
                            'competence'       => $tpData['competence'],
                            'content'          => $tpData['content'],
                            'order'            => $tpIdx + 1,
                            'cp_id'            => $cpForSubject[0]->id ?? null,
                            'formulation_method' => 'direct',
                        ]
                    );

                    // Attach pivot TP-CP
                    foreach ($cpForSubject as $cp) {
                        $tp->capaianPembelajarans()->syncWithoutDetaching([$cp->id]);
                    }

                    $allTps[$subjectIdx][$classIdx][] = $tp;
                }
            }
        }

        // ──────────────────────────────────────────────
        // 9. Materi Pembelajaran — 2 Materi per TP
        // ──────────────────────────────────────────────
        $this->command->info('📖 Membuat Materi Pembelajaran...');

        $pedagogicalModels = ['Inquiry', 'PjBL', 'PBL', 'Discovery'];
        $environments = ['Hybrid', 'Virtual', 'Physical'];

        $materialTemplates = [
            0 => [ // Informatika
                ['Pengenalan Algoritma dan Logika Pemrograman', 'Memahami konsep dasar algoritma: sekuensial, percabangan (if-else), dan pengulangan (loop).'],
                ['Praktik Pemrograman Python Dasar', 'Menulis program sederhana menggunakan Python: variabel, tipe data, input/output, dan struktur kontrol.'],
                ['Membuat Flowchart Pemecahan Masalah', 'Merancang diagram alir untuk menyelesaikan masalah sehari-hari seperti perhitungan diskon dan konversi satuan.'],
                ['Pseudocode dan Tabel Pelacakan', 'Menulis pseudocode terstruktur dan melacak eksekusi algoritma menggunakan tabel pelacakan.'],
                ['Keamanan Password dan Data Pribadi', 'Memahami pentingnya keamanan siber, membuat password kuat, dan melindungi data pribadi di internet.'],
                ['Etika Digital dan Hak Cipta', 'Mempelajari netiquette, hak cipta konten digital, dan tanggung jawab pengguna media sosial.'],
            ],
            1 => [ // Matematika
                ['Persamaan Linear Satu Variabel', 'Menyelesaikan persamaan linear ax + b = c dan menerapkannya dalam soal cerita.'],
                ['Pertidaksamaan Linear', 'Menentukan himpunan penyelesaian pertidaksamaan linear dan menyajikannya pada garis bilangan.'],
                ['Sifat-Sifat Bangun Datar', 'Mengidentifikasi sifat-sifat segitiga, segiempat, dan lingkaran serta menghitung keliling dan luasnya.'],
                ['Volume Bangun Ruang', 'Menghitung volume kubus, balok, prisma, tabung, kerucut, dan bola.'],
                ['Ukuran Pemusatan Data', 'Menghitung mean, median, dan modus dari data tunggal dan data berkelompok.'],
                ['Penyajian dan Penyebaran Data', 'Menyajikan data dalam diagram batang, lingkaran, dan histogram serta menghitung rentang dan simpangan.'],
            ],
            2 => [ // Bahasa Indonesia
                ['Struktur Teks Cerpen', 'Menganalisis struktur abstrak, orientasi, komplikasi, evaluasi, resolusi, dan koda dalam teks cerpen.'],
                ['Unsur Intrinsik Novel', 'Mengidentifikasi tema, tokoh, penokohan, alur, latar, sudut pandang, dan amanat dalam novel.'],
                ['Struktur Teks Eksposisi', 'Memahami tesis, argumentasi, dan penegasan ulang dalam teks eksposisi serta menganalisis contohnya.'],
                ['Praktik Menulis Teks Eksposisi', 'Menulis teks eksposisi berdasarkan isu aktual dengan didukung data dan fakta yang relevan.'],
                ['Teknik Presentasi Akademik', 'Mempelajari teknik penyampaian materi: bahasa tubuh, kontak mata, intonasi, dan penggunaan media visual.'],
                ['Praktik Diskusi Kelompok', 'Melakukan diskusi kelompok dengan format debat dan menuliskan notulensi hasil diskusi secara terstruktur.'],
            ],
        ];

        $allMaterials = []; // [subjectIdx][classIdx] => [mat1, mat2, ...]
        foreach ($teacherSubjectMap as $teacherIdx => $subjectIdx) {
            $allMaterials[$subjectIdx] = [];
            foreach ($classes as $classIdx => $class) {
                $allMaterials[$subjectIdx][$classIdx] = [];
                $tps = $allTps[$subjectIdx][$classIdx];

                foreach ($tps as $tpIdx => $tp) {
                    // 2 materi per TP
                    for ($m = 0; $m < 2; $m++) {
                        $matDataIdx = ($tpIdx * 2) + $m;
                        $matData = $materialTemplates[$subjectIdx][$matDataIdx] ?? ['Materi Tambahan', 'Deskripsi materi tambahan.'];

                        $material = LmsMaterial::firstOrCreate(
                            [
                                'title'      => $matData[0],
                                'subject_id' => $subjects[$subjectIdx]->id,
                                'school_class_id' => $class->id,
                            ],
                            [
                                'teacher_id'           => $teachers[$teacherIdx]->id,
                                'academic_year_id'     => $academicYear->id,
                                'semester_id'          => $activeSemester->id,
                                'learning_objective_id' => $tp->id,
                                'content'              => '<p>' . $matData[1] . '</p><p>Pada pertemuan ini, siswa diharapkan mampu memahami dan menerapkan konsep yang dipelajari melalui aktivitas diskusi dan praktik langsung.</p>',
                                'pedagogical_model'    => $pedagogicalModels[($tpIdx + $m) % count($pedagogicalModels)],
                                'learning_environment' => $environments[($classIdx + $m) % count($environments)],
                                'understanding_activity' => 'Siswa mengamati contoh-contoh kasus dan mendiskusikan pola yang ditemukan bersama kelompok.',
                                'application_activity'   => 'Siswa mengerjakan latihan soal dan proyek mini secara berpasangan untuk menerapkan konsep.',
                                'reflection_activity'    => 'Siswa menuliskan jurnal refleksi tentang hal yang dipahami dan yang masih membingungkan.',
                                'order'                => $matDataIdx + 1,
                            ]
                        );

                        $allMaterials[$subjectIdx][$classIdx][] = $material;
                    }
                }
            }
        }

        // ──────────────────────────────────────────────
        // 10. Tugas / Asesmen — 2 tugas per TP (formatif + sumatif)
        // ──────────────────────────────────────────────
        $this->command->info('📝 Membuat Tugas & Asesmen...');

        $assessmentTypes = ['formative', 'summative'];
        $instrumentTypes = ['quiz_survey', 'rubric', 'written_test', 'project', 'performance', 'observation_checklist'];

        $assignmentTemplates = [
            0 => [ // Informatika
                ['Kuis: Konsep Dasar Algoritma',            'Jawab 10 soal pilihan ganda tentang konsep algoritma sekuensial, percabangan, dan pengulangan.'],
                ['Proyek: Program Python Kalkulator Sederhana', 'Buat program kalkulator sederhana menggunakan Python dengan fitur operasi aritmatika dasar.'],
                ['Kuis: Flowchart dan Pseudocode',           'Uji pemahaman membaca dan menyusun flowchart serta pseudocode.'],
                ['Tugas: Merancang Flowchart Aplikasi',      'Rancang flowchart untuk aplikasi perpustakaan digital sederhana.'],
                ['Kuis: Keamanan Digital',                    'Jawab soal-soal tentang keamanan password, phishing, dan privasi data.'],
                ['Esai: Etika Penggunaan Media Sosial',      'Tulis esai argumentatif tentang tanggung jawab pengguna media sosial di era digital.'],
            ],
            1 => [ // Matematika
                ['Kuis: Persamaan Linear',                    'Selesaikan 15 soal persamaan linear satu variabel dari konteks kehidupan sehari-hari.'],
                ['Tugas: Pertidaksamaan Linear Kontekstual',  'Selesaikan masalah pertidaksamaan linear dalam konteks belanja dan anggaran rumah tangga.'],
                ['Kuis: Bangun Datar',                        'Hitung keliling dan luas berbagai bangun datar: segitiga, persegi, dan lingkaran.'],
                ['Proyek: Miniatur Bangun Ruang',             'Buat miniatur bangun ruang (prisma/tabung) dari karton dan hitung volumenya.'],
                ['Kuis: Statistika Dasar',                    'Tentukan mean, median, dan modus dari data yang disajikan.'],
                ['Proyek: Survei dan Analisis Data Kelas',    'Lakukan survei tentang hobi siswa, olah data, sajikan dalam diagram, dan tulis kesimpulan.'],
            ],
            2 => [ // Bahasa Indonesia
                ['Kuis: Struktur Cerpen',                     'Identifikasi struktur dan unsur intrinsik cerpen yang diberikan.'],
                ['Tugas: Menulis Resensi Novel',              'Baca novel pilihan dan tulis resensi lengkap mencakup sinopsis, analisis, dan penilaian.'],
                ['Kuis: Teks Eksposisi',                      'Kenali struktur dan kaidah kebahasaan teks eksposisi dari contoh yang diberikan.'],
                ['Tugas: Menulis Teks Eksposisi',             'Tulis teks eksposisi 500-700 kata tentang isu lingkungan di sekitarmu.'],
                ['Presentasi: Topik Bebas',                   'Siapkan dan sampaikan presentasi 5-7 menit tentang topik yang kamu kuasai.'],
                ['Diskusi: Debat Pro-Kontra',                 'Ikuti debat kelompok tentang topik "Penggunaan AI dalam pendidikan" dan tulis notulensi.'],
            ],
        ];

        $allAssignments = []; // [subjectIdx][classIdx] => [asgn1, asgn2, ...]
        foreach ($teacherSubjectMap as $teacherIdx => $subjectIdx) {
            $allAssignments[$subjectIdx] = [];
            foreach ($classes as $classIdx => $class) {
                $allAssignments[$subjectIdx][$classIdx] = [];
                $tps = $allTps[$subjectIdx][$classIdx];

                foreach ($tps as $tpIdx => $tp) {
                    for ($a = 0; $a < 2; $a++) {
                        $asgnDataIdx = ($tpIdx * 2) + $a;
                        $asgnData = $assignmentTemplates[$subjectIdx][$asgnDataIdx] ?? ['Tugas Tambahan', 'Deskripsi tugas tambahan.'];

                        $dueDate = Carbon::now()->subDays(rand(1, 30))->setHour(23)->setMinute(59);
                        $instrumentType = $instrumentTypes[($tpIdx + $a) % count($instrumentTypes)];

                        $assignment = LmsAssignment::firstOrCreate(
                            [
                                'title'      => $asgnData[0],
                                'subject_id' => $subjects[$subjectIdx]->id,
                                'school_class_id' => $class->id,
                            ],
                            [
                                'teacher_id'           => $teachers[$teacherIdx]->id,
                                'learning_objective_id' => $tp->id,
                                'academic_year_id'     => $academicYear->id,
                                'semester_id'          => $activeSemester->id,
                                'assessment_type'      => $assessmentTypes[$a],
                                'instrument_type'      => $instrumentType,
                                'description'          => $asgnData[1],
                                'due_date'             => $dueDate,
                                'max_points'           => 100,
                                'passing_grade'        => $subjects[$subjectIdx]->kktp ?? 70,
                                'order'                => $asgnDataIdx + 1,
                            ]
                        );

                        $allAssignments[$subjectIdx][$classIdx][] = $assignment;
                    }
                }
            }
        }

        // ──────────────────────────────────────────────
        // 11. Pengumpulan Tugas (Submissions) + Refleksi + Komentar
        // ──────────────────────────────────────────────
        $this->command->info('📨 Membuat Pengumpulan Tugas, Refleksi, & Komentar...');

        $understandingLevels = [3, 4, 5];
        $feedbackTemplates = [
            'Bagus sekali! Pertahankan kerja kerasmu.',
            'Sudah cukup baik, perbaiki di bagian argumentasi.',
            'Masih perlu lebih banyak latihan. Jangan menyerah!',
            'Pekerjaan yang luar biasa, sangat detail dan terstruktur.',
            'Coba perbaiki format penulisan dan lengkapi daftar pustaka.',
        ];

        $commentTemplates = [
            'Materinya sangat menarik dan mudah dipahami!',
            'Saya masih bingung di bagian ini, bisa dijelaskan lagi?',
            'Terima kasih bu/pak, saya jadi paham sekarang.',
            'Apakah ada contoh soal tambahan untuk latihan di rumah?',
            'Diskusi kelompok hari ini sangat seru dan bermanfaat!',
            'Saya suka cara penyampaian materinya, sangat interaktif.',
        ];

        foreach ($teacherSubjectMap as $teacherIdx => $subjectIdx) {
            foreach ($classes as $classIdx => $class) {
                $students = $allStudents[$classIdx];
                $assignments = $allAssignments[$subjectIdx][$classIdx];
                $materials = $allMaterials[$subjectIdx][$classIdx];

                foreach ($students as $studentIdx => $student) {
                    // Submissions untuk setiap assignment
                    foreach ($assignments as $asgnIdx => $assignment) {
                        // 85% siswa mengumpulkan tugas
                        if (rand(1, 100) <= 85) {
                            // Variasi skor berdasarkan posisi siswa (top, middle, bottom)
                            if ($studentIdx < 3) {
                                $score = rand(80, 100); // Top students
                            } elseif ($studentIdx < 7) {
                                $score = rand(60, 85);  // Middle students
                            } else {
                                $score = rand(40, 70);  // Struggling students
                            }

                            LmsSubmission::firstOrCreate(
                                [
                                    'assignment_id' => $assignment->id,
                                    'student_id'    => $student->id,
                                ],
                                [
                                    'content'      => 'Jawaban siswa untuk tugas "' . $assignment->title . '". [Konten simulasi]',
                                    'score'        => $score,
                                    'attempts'     => rand(1, 3),
                                    'feedback'     => $feedbackTemplates[array_rand($feedbackTemplates)],
                                    'submitted_at' => Carbon::now()->subDays(rand(1, 25)),
                                ]
                            );
                        }
                    }

                    // Refleksi untuk setiap materi (70% siswa mengisi)
                    foreach ($materials as $matIdx => $material) {
                        if (rand(1, 100) <= 70) {
                            LmsReflection::firstOrCreate(
                                [
                                    'student_id'  => $student->id,
                                    'material_id' => $material->id,
                                ],
                                [
                                    'understanding_level' => $understandingLevels[array_rand($understandingLevels)],
                                    'interesting_thing'   => 'Saya tertarik dengan konsep ' . strtolower($material->title) . ' karena bisa diterapkan dalam kehidupan sehari-hari.',
                                    'difficulty'          => rand(1, 100) > 60 ? 'Masih bingung membedakan beberapa konsep dasar' : null,
                                ]
                            );
                        }

                        // Student Material Progress (60% sudah selesai)
                        if (rand(1, 100) <= 60) {
                            LmsStudentMaterial::firstOrCreate(
                                [
                                    'student_id'  => $student->id,
                                    'material_id' => $material->id,
                                ],
                                [
                                    'completed_at' => Carbon::now()->subDays(rand(1, 20)),
                                ]
                            );
                        }
                    }

                    // Komentar — 2-3 komentar per siswa secara acak
                    $commentCount = rand(2, 3);
                    for ($c = 0; $c < $commentCount; $c++) {
                        $targetMaterial = $materials[array_rand($materials)] ?? null;
                        $targetAssignment = $assignments[array_rand($assignments)] ?? null;

                        if ($targetMaterial && rand(0, 1)) {
                            LmsComment::create([
                                'user_id'     => $student->user_id,
                                'material_id' => $targetMaterial->id,
                                'body'        => $commentTemplates[array_rand($commentTemplates)],
                            ]);
                        } elseif ($targetAssignment) {
                            LmsComment::create([
                                'user_id'       => $student->user_id,
                                'assignment_id' => $targetAssignment->id,
                                'body'          => $commentTemplates[array_rand($commentTemplates)],
                            ]);
                        }
                    }
                }

                // Komentar guru pada beberapa materi
                foreach ($materials as $mat) {
                    if (rand(1, 100) <= 50) {
                        LmsComment::create([
                            'user_id'     => $teachers[$teacherIdx]->user_id,
                            'material_id' => $mat->id,
                            'body'        => 'Jangan lupa kerjakan latihan di akhir materi ini ya. Kalau ada yang belum paham, tanyakan di forum.',
                        ]);
                    }
                }
            }
        }

        // ──────────────────────────────────────────────
        // 12. Presensi / Absensi Mata Pelajaran
        // ──────────────────────────────────────────────
        $this->command->info('✅ Membuat Riwayat Presensi...');

        $statusOptions = ['hadir', 'sakit', 'izin', 'alpa'];
        $statusWeights = [80, 8, 7, 5]; // probability weights

        foreach ($schedules as $schedule) {
            $ta = $schedule->teachingAssignment;
            if (!$ta) continue;

            $classId = $ta->school_class_id;
            $teacherId = $ta->teacher_id;

            // Cari classIdx
            $classIdx = null;
            foreach ($classes as $idx => $cls) {
                if ($cls->id === $classId) {
                    $classIdx = $idx;
                    break;
                }
            }
            if ($classIdx === null) continue;

            $students = $allStudents[$classIdx];

            // 12 pertemuan (simulasi satu semester)
            for ($meeting = 0; $meeting < 12; $meeting++) {
                foreach ($students as $studentIdx => $student) {
                    // Weighted random status
                    $rand = rand(1, 100);
                    if ($rand <= $statusWeights[0]) {
                        $status = 'hadir';
                    } elseif ($rand <= $statusWeights[0] + $statusWeights[1]) {
                        $status = 'sakit';
                    } elseif ($rand <= $statusWeights[0] + $statusWeights[1] + $statusWeights[2]) {
                        $status = 'izin';
                    } else {
                        $status = 'alpa';
                        // Siswa bawah lebih sering alpa
                        if ($studentIdx < 5 && rand(1, 100) <= 70) {
                            $status = 'hadir';
                        }
                    }

                    SubjectAttendance::create([
                        'schedule_id'      => $schedule->id,
                        'student_id'       => $student->id,
                        'teacher_id'       => $teacherId,
                        'status'           => $status,
                        'notes'            => $status !== 'hadir' ? 'Catatan presensi meeting ke-' . ($meeting + 1) : null,
                        'academic_year_id' => $academicYear->id,
                        'semester_id'      => $activeSemester->id,
                        'created_at'       => Carbon::now()->subWeeks(12 - $meeting),
                        'updated_at'       => Carbon::now()->subWeeks(12 - $meeting),
                    ]);
                }
            }
        }

        // ──────────────────────────────────────────────
        // 13. Diagnostik Kognitif & Non-Kognitif
        // ──────────────────────────────────────────────
        $this->command->info('🧠 Membuat Data Diagnostik...');

        $learningStyles = ['visual', 'auditory', 'kinesthetic', 'reading_writing'];
        $motivationLevels = ['tinggi', 'sedang', 'rendah'];

        foreach ($classes as $classIdx => $class) {
            foreach ($allStudents[$classIdx] as $studentIdx => $student) {
                foreach ($subjects as $subjectIdx => $subject) {
                    // Diagnostik Kognitif (hasil asesmen awal)
                    $firstAssignment = $allAssignments[$subjectIdx][$classIdx][0] ?? null;
                    $firstTp = $allTps[$subjectIdx][$classIdx][0] ?? null;

                    if ($firstAssignment && $firstTp) {
                        $totalScore = $studentIdx < 3 ? rand(75, 95) : ($studentIdx < 7 ? rand(50, 80) : rand(30, 60));

                        StudentDiagnosticResult::firstOrCreate(
                            [
                                'student_id'    => $student->id,
                                'assignment_id' => $firstAssignment->id,
                            ],
                            [
                                'subject_id'           => $subject->id,
                                'learning_objective_id' => $firstTp->id,
                                'total_score'          => $totalScore,
                                'pass_threshold'       => $subject->kktp ?? 70,
                                'is_passed'            => $totalScore >= ($subject->kktp ?? 70),
                                'topic_breakdown'      => [
                                    ['topic' => 'Konsep Dasar',       'score' => rand(40, 100), 'max' => 100],
                                    ['topic' => 'Penerapan',          'score' => rand(30, 95),  'max' => 100],
                                    ['topic' => 'Analisis',           'score' => rand(20, 90),  'max' => 100],
                                ],
                                'recommendations' => $totalScore < ($subject->kktp ?? 70)
                                    ? ['Perlu pendampingan ekstra pada materi dasar', 'Ikuti sesi remidi di luar jam pelajaran']
                                    : ['Lanjutkan ke materi pengayaan', 'Bisa menjadi tutor sebaya'],
                            ]
                        );
                    }

                    // Diagnostik Non-Kognitif
                    StudentNonCognitiveDiagnostic::firstOrCreate(
                        [
                            'student_id' => $student->id,
                            'subject_id' => $subject->id,
                        ],
                        [
                            'learning_style'        => $learningStyles[array_rand($learningStyles)],
                            'learning_style_detail' => [
                                'primary'   => $learningStyles[array_rand($learningStyles)],
                                'secondary' => $learningStyles[array_rand($learningStyles)],
                                'score'     => ['visual' => rand(30, 90), 'auditory' => rand(30, 90), 'kinesthetic' => rand(30, 90), 'reading_writing' => rand(30, 90)],
                            ],
                            'motivation_level' => [
                                'intrinsic'  => $motivationLevels[array_rand($motivationLevels)],
                                'extrinsic'  => $motivationLevels[array_rand($motivationLevels)],
                            ],
                            'interests' => [
                                'Teknologi', 'Seni', 'Olahraga', 'Membaca', 'Musik',
                            ],
                            'family_background' => [
                                'parent_education' => ['Ayah' => 'S1', 'Ibu' => 'SMA'],
                                'economic_status'  => 'menengah',
                                'study_support'    => rand(0, 1) ? 'tinggi' : 'sedang',
                            ],
                            'notes' => null,
                        ]
                    );
                }
            }
        }

        // ──────────────────────────────────────────────
        // 14. Projek P5 (Profil Pelajar Pancasila)
        // ──────────────────────────────────────────────
        $this->command->info('🌟 Membuat Projek P5 & Penilaian...');

        $dimensiList = LmsP5Dimensi::all();
        $subElements = DB::table('lms_p5_sub_elements')->get();

        if ($dimensiList->isNotEmpty() && $subElements->isNotEmpty()) {
            $p5Projects = [
                ['judul' => 'Kearifan Lokal: Dokumentasi Budaya Daerah',     'deskripsi' => 'Siswa mendokumentasikan satu kearifan lokal daerahnya dalam bentuk video pendek dan esai reflektif.', 'tema' => 'Kearifan Lokal'],
                ['judul' => 'Bangunlah Jiwa dan Raganya: Kampanye Hidup Sehat', 'deskripsi' => 'Siswa merancang dan menjalankan kampanye hidup sehat di lingkungan sekolah selama satu minggu.', 'tema' => 'Bangunlah Jiwa dan Raganya'],
            ];

            foreach ($classes as $classIdx => $class) {
                foreach ($p5Projects as $pIdx => $pData) {
                    $randomSubElementIds = $subElements->random(min(3, $subElements->count()))->pluck('id')->toArray();
                    $randomDimensiIds = $dimensiList->random(min(2, $dimensiList->count()))->pluck('id')->toArray();

                    $project = LmsP5Project::firstOrCreate(
                        [
                            'judul'           => $pData['judul'],
                            'school_class_id' => $class->id,
                        ],
                        [
                            'deskripsi'        => $pData['deskripsi'],
                            'tema'             => $pData['tema'],
                            'academic_year_id' => $academicYear->id,
                            'semester_id'      => $activeSemester->id,
                            'dimensi_ids'      => $randomDimensiIds,
                            'sub_element_ids'  => $randomSubElementIds,
                            'alokasi_waktu'    => 40,
                            'status'           => 'active',
                        ]
                    );

                    // Skor P5 per siswa per sub-element
                    $scoreLabels = ['BB', 'MB', 'BSH', 'SB'];
                    $scoreTexts = [
                        'BB' => 'Belum Berkembang',
                        'MB' => 'Mulai Berkembang',
                        'BSH' => 'Berkembang Sesuai Harapan',
                        'SB' => 'Sangat Baik'
                    ];

                    foreach ($allStudents[$classIdx] as $student) {
                        $subElementId = $randomSubElementIds[array_rand($randomSubElementIds)];
                        $randomScore = $scoreLabels[array_rand($scoreLabels)];
                        LmsP5ProjectScore::firstOrCreate(
                            [
                                'project_id'     => $project->id,
                                'student_id'     => $student->id,
                                'sub_element_id' => $subElementId,
                            ],
                            [
                                'nilai'   => $randomScore,
                                'catatan' => 'Siswa menunjukkan partisipasi ' . strtolower($scoreTexts[$randomScore]) . ' dalam projek ini.',
                            ]
                        );
                    }
                }
            }
        }

        // ──────────────────────────────────────────────
        // 15. Remedial Records
        // ──────────────────────────────────────────────
        $this->command->info('🔄 Membuat Data Remedial...');

        foreach ($teacherSubjectMap as $teacherIdx => $subjectIdx) {
            foreach ($classes as $classIdx => $class) {
                $assignments = $allAssignments[$subjectIdx][$classIdx];
                $students = $allStudents[$classIdx];

                foreach ($assignments as $assignment) {
                    // Siswa dengan skor di bawah KKM yang perlu remedial
                    $submissions = LmsSubmission::where('assignment_id', $assignment->id)
                        ->where('score', '<', $assignment->passing_grade ?? 70)
                        ->get();

                    foreach ($submissions as $submission) {
                        $remedialScore = min($submission->score + rand(10, 30), 100);
                        LmsRemedialRecord::firstOrCreate(
                            [
                                'student_id'    => $submission->student_id,
                                'assignment_id' => $assignment->id,
                            ],
                            [
                                'subject_id'     => $subjects[$subjectIdx]->id,
                                'teacher_id'     => $teachers[$teacherIdx]->id,
                                'type'           => rand(0, 1) ? 'remedial' : 'pengayaan',
                                'initial_score'  => $submission->score,
                                'remedial_score' => $remedialScore,
                                'description'    => 'Siswa mengerjakan ulang tugas "' . $assignment->title . '" untuk memperbaiki nilai.',
                                'due_date'       => Carbon::now()->addDays(rand(3, 10)),
                                'status'         => $remedialScore >= ($assignment->passing_grade ?? 70) ? 'completed' : 'in_progress',
                            ]
                        );
                    }
                }
            }
        }

        // ──────────────────────────────────────────────
        // 16. Gradebook Final Scores
        // ──────────────────────────────────────────────
        $this->command->info('📊 Menghitung Nilai Akhir Gradebook...');

        foreach ($teacherSubjectMap as $teacherIdx => $subjectIdx) {
            foreach ($classes as $classIdx => $class) {
                $students = $allStudents[$classIdx];

                foreach ($students as $student) {
                    $submissions = LmsSubmission::whereHas('assignment', function ($q) use ($subjects, $subjectIdx, $class) {
                        $q->where('subject_id', $subjects[$subjectIdx]->id)
                          ->where('school_class_id', $class->id);
                    })->where('student_id', $student->id)->get();

                    if ($submissions->isNotEmpty()) {
                        $avgScore = (int) round($submissions->avg('score'));

                        GradebookFinalScore::firstOrCreate(
                            [
                                'student_id'      => $student->id,
                                'subject_id'      => $subjects[$subjectIdx]->id,
                                'school_class_id' => $class->id,
                                'academic_year_id' => $academicYear->id,
                                'semester_id'     => $activeSemester->id,
                            ],
                            [
                                'score' => $avgScore,
                            ]
                        );
                    }
                }
            }
        }

        // ──────────────────────────────────────────────
        // Selesai!
        // ──────────────────────────────────────────────
        $this->command->newLine();
        $this->command->info('✅ Seeder data tiruan LMS Mokopani berhasil dijalankan!');
        $this->command->table(
            ['Data', 'Jumlah'],
            [
                ['Tahun Akademik', AcademicYear::count()],
                ['Semester', Semester::count()],
                ['Kelas', SchoolClass::count()],
                ['Mata Pelajaran', Subject::count()],
                ['Guru', Teacher::count()],
                ['Siswa', Student::count()],
                ['Tugas Mengajar', TeachingAssignment::count()],
                ['Jadwal', Schedule::count()],
                ['Capaian Pembelajaran', LmsCapaianPembelajaran::count()],
                ['Tujuan Pembelajaran', LmsLearningObjective::count()],
                ['Materi', LmsMaterial::count()],
                ['Tugas/Asesmen', LmsAssignment::count()],
                ['Pengumpulan', LmsSubmission::count()],
                ['Refleksi', LmsReflection::count()],
                ['Komentar', LmsComment::count()],
                ['Presensi', SubjectAttendance::count()],
                ['Diagnostik Kognitif', StudentDiagnosticResult::count()],
                ['Diagnostik Non-Kognitif', StudentNonCognitiveDiagnostic::count()],
                ['Projek P5', LmsP5Project::count()],
                ['Skor P5', LmsP5ProjectScore::count()],
                ['Remedial', LmsRemedialRecord::count()],
                ['Nilai Akhir', GradebookFinalScore::count()],
            ]
        );
    }
}
