<?php

namespace Database\Seeders;

use App\Models\LmsP5Dimensi;
use App\Models\LmsP5Element;
use App\Models\LmsP5SubElement;
use Illuminate\Database\Seeder;

class P5Seeder extends Seeder
{
    public function run(): void
    {
        $data = [
            [
                'kode' => 'BERIMAN',
                'nama' => 'Beriman dan Bertakwa kepada Tuhan YME dan Berakhlak Mulia',
                'deskripsi' => 'Pelajar Indonesia yang beriman dan bertakwa kepada Tuhan YME serta berakhlak mulia dalam hubungannya dengan Tuhan, sesama, alam, dan tanah air.',
                'elements' => [
                    [
                        'nama' => 'Akhlak Beragama',
                        'sub_elements' => [
                            ['nama' => 'Mengenal dan mencintai Tuhan YME', 'jenjang' => 'SD'],
                            ['nama' => 'Pemahaman agama/kepercayaan', 'jenjang' => 'SMP'],
                            ['nama' => 'Pelaksanaan ibadah sesuai ajaran agama/kepercayaan', 'jenjang' => 'SMA'],
                        ],
                    ],
                    [
                        'nama' => 'Akhlak Pribadi',
                        'sub_elements' => [
                            ['nama' => 'Integritas', 'jenjang' => 'SMP'],
                            ['nama' => 'Merawat diri secara fisik, mental, dan spiritual', 'jenjang' => 'SMP'],
                        ],
                    ],
                    [
                        'nama' => 'Akhlak kepada Manusia',
                        'sub_elements' => [
                            ['nama' => 'Mengutamakan persamaan dan menghargai perbedaan', 'jenjang' => 'SMP'],
                            ['nama' => 'Berempati kepada orang lain', 'jenjang' => 'SMP'],
                        ],
                    ],
                    [
                        'nama' => 'Akhlak kepada Alam',
                        'sub_elements' => [
                            ['nama' => 'Memahami keterhubungan ekosistem bumi', 'jenjang' => 'SMP'],
                            ['nama' => 'Menjaga lingkungan alam sekitar', 'jenjang' => 'SMP'],
                        ],
                    ],
                    [
                        'nama' => 'Akhlak Bernegara',
                        'sub_elements' => [
                            ['nama' => 'Melaksanakan hak dan kewajiban sebagai warga negara', 'jenjang' => 'SMA'],
                            ['nama' => 'Nasionalisme dan cinta tanah air', 'jenjang' => 'SMP'],
                        ],
                    ],
                ],
            ],
            [
                'kode' => 'BERKEBINEKAAN',
                'nama' => 'Berkebinekaan Global',
                'deskripsi' => 'Pelajar Indonesia mempertahankan budaya luhur, lokalitas dan identitasnya, dan tetap berpikiran terbuka dalam berinteraksi dengan budaya lain.',
                'elements' => [
                    [
                        'nama' => 'Mengenal dan Menghargai Budaya',
                        'sub_elements' => [
                            ['nama' => 'Mendalami budaya dan identitas budaya', 'jenjang' => 'SMP'],
                            ['nama' => 'Menghargai keragaman budaya', 'jenjang' => 'SD'],
                        ],
                    ],
                    [
                        'nama' => 'Komunikasi dan Interaksi Antar Budaya',
                        'sub_elements' => [
                            ['nama' => 'Berperilaku terbuka terhadap perbedaan', 'jenjang' => 'SMP'],
                            ['nama' => 'Kemampuan komunikasi lintas budaya', 'jenjang' => 'SMA'],
                        ],
                    ],
                    [
                        'nama' => 'Refleksi dan Bertanggung Jawab terhadap Pengalaman Kebinekaan',
                        'sub_elements' => [
                            ['nama' => 'Refleksi atas pengalaman kebinekaan', 'jenjang' => 'SMP'],
                            ['nama' => 'Menghilangkan stereotip dan prasangka', 'jenjang' => 'SMA'],
                        ],
                    ],
                    [
                        'nama' => 'Berkeadilan Sosial',
                        'sub_elements' => [
                            ['nama' => 'Aktif dalam isu-isu keadilan sosial', 'jenjang' => 'SMA'],
                            ['nama' => 'Partisipasi dalam kegiatan sosial', 'jenjang' => 'SMP'],
                        ],
                    ],
                ],
            ],
            [
                'kode' => 'GOTONG_ROYONG',
                'nama' => 'Gotong Royong',
                'deskripsi' => 'Pelajar Indonesia memiliki kemampuan gotong-royong, yaitu kemampuan untuk melakukan kegiatan bersama secara sukarela.',
                'elements' => [
                    [
                        'nama' => 'Kolaborasi',
                        'sub_elements' => [
                            ['nama' => 'Kerja sama dalam tim', 'jenjang' => 'SD'],
                            ['nama' => 'Komunikasi dalam kelompok', 'jenjang' => 'SMP'],
                            ['nama' => 'Negosiasi dan resolusi konflik', 'jenjang' => 'SMA'],
                        ],
                    ],
                    [
                        'nama' => 'Kepedulian',
                        'sub_elements' => [
                            ['nama' => 'Peka terhadap lingkungan sosial', 'jenjang' => 'SD'],
                            ['nama' => 'Memberi bantuan pada yang membutuhkan', 'jenjang' => 'SMP'],
                        ],
                    ],
                    [
                        'nama' => 'Berbagi',
                        'sub_elements' => [
                            ['nama' => 'Memberi dan menerima hal yang berarti', 'jenjang' => 'SMP'],
                            ['nama' => 'Bergotong royong dalam kegiatan bersama', 'jenjang' => 'SD'],
                        ],
                    ],
                ],
            ],
            [
                'kode' => 'MANDIRI',
                'nama' => 'Mandiri',
                'deskripsi' => 'Pelajar Indonesia merupakan pelajar mandiri yang bertanggung jawab atas proses dan hasil belajarnya.',
                'elements' => [
                    [
                        'nama' => 'Kesadaran akan Diri dan Situasi',
                        'sub_elements' => [
                            ['nama' => 'Mengenali kualitas dan minat diri', 'jenjang' => 'SMP'],
                            ['nama' => 'Refleksi diri', 'jenjang' => 'SMA'],
                        ],
                    ],
                    [
                        'nama' => 'Regulasi Diri',
                        'sub_elements' => [
                            ['nama' => 'Manajemen waktu dan tugas', 'jenjang' => 'SMP'],
                            ['nama' => 'Inisiatif dan kemandirian belajar', 'jenjang' => 'SD'],
                            ['nama' => 'Ketangguhan dalam menghadapi tantangan', 'jenjang' => 'SMA'],
                        ],
                    ],
                ],
            ],
            [
                'kode' => 'BERNALAR_KREATIF',
                'nama' => 'Bernalar Kritis',
                'deskripsi' => 'Pelajar Indonesia mampu memproses informasi secara objektif, menganalisis, mengevaluasi, dan menyimpulkan.',
                'elements' => [
                    [
                        'nama' => 'Memperoleh dan Memproses Informasi dan Gagasan',
                        'sub_elements' => [
                            ['nama' => 'Mengajukan pertanyaan relevan', 'jenjang' => 'SD'],
                            ['nama' => 'Mengidentifikasi dan mengklarifikasi informasi', 'jenjang' => 'SMP'],
                            ['nama' => 'Menganalisis argumen', 'jenjang' => 'SMA'],
                        ],
                    ],
                    [
                        'nama' => 'Menganalisis dan Mengevaluasi Penalaran',
                        'sub_elements' => [
                            ['nama' => 'Mengecek kebenaran informasi', 'jenjang' => 'SMP'],
                            ['nama' => 'Mengevaluasi bukti dan argumen', 'jenjang' => 'SMA'],
                        ],
                    ],
                    [
                        'nama' => 'Refleksi Pemikiran dan Proses Berpikir',
                        'sub_elements' => [
                            ['nama' => 'Merefleksikan proses berpikir sendiri', 'jenjang' => 'SMA'],
                        ],
                    ],
                ],
            ],
            [
                'kode' => 'KREATIF',
                'nama' => 'Kreatif',
                'deskripsi' => 'Pelajar Indonesia mampu menghasilkan gagasan, karya, dan tindakan yang orisinal.',
                'elements' => [
                    [
                        'nama' => 'Menghasilkan Gagasan yang Orisinal',
                        'sub_elements' => [
                            ['nama' => 'Memunculkan ide baru', 'jenjang' => 'SD'],
                            ['nama' => 'Mengembangkan ide yang sudah ada', 'jenjang' => 'SMP'],
                        ],
                    ],
                    [
                        'nama' => 'Menghasilkan Karya dan Tindakan yang Orisinal',
                        'sub_elements' => [
                            ['nama' => 'Mewujudkan ide menjadi karya nyata', 'jenjang' => 'SMP'],
                            ['nama' => 'Mengambil risiko kreatif', 'jenjang' => 'SMA'],
                        ],
                    ],
                    [
                        'nama' => 'Memiliki Keluwesan Berpikir dalam Mencari Alternatif Solusi',
                        'sub_elements' => [
                            ['nama' => 'Mencoba berbagai alternatif solusi', 'jenjang' => 'SMP'],
                            ['nama' => 'Beradaptasi dengan perubahan', 'jenjang' => 'SMA'],
                        ],
                    ],
                ],
            ],
        ];

        foreach ($data as $dimensiData) {
            $dimensi = LmsP5Dimensi::create([
                'kode' => $dimensiData['kode'],
                'nama' => $dimensiData['nama'],
                'deskripsi' => $dimensiData['deskripsi'],
            ]);

            foreach ($dimensiData['elements'] as $elementData) {
                $element = LmsP5Element::create([
                    'dimensi_id' => $dimensi->id,
                    'nama' => $elementData['nama'],
                ]);

                foreach ($elementData['sub_elements'] as $subData) {
                    LmsP5SubElement::create([
                        'element_id' => $element->id,
                        'nama' => $subData['nama'],
                        'jenjang' => $subData['jenjang'],
                    ]);
                }
            }
        }

        $this->command->info('P5 dimensions, elements, and sub-elements seeded successfully!');
    }
}
