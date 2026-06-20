<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\LmsAiPrompt;

class LmsAiPromptSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $prompts = [
            [
                'teacher_id' => null,
                'key' => 'orchestrator_draft',
                'name' => 'Pembuat Draft Awal Pembelajaran (Orchestrator)',
                'description' => 'Prompt utama yang digunakan untuk merancang materi ajar dengan prasyarat, penataan konsep (konkret ke abstrak), dan diferensiasi 3 tingkat pemahaman, serta merancang tahapan RPP dan LKPD.',
                'placeholders' => ['{subject}', '{class}', '{tp}', '{pedagogical_model}'],
                'prompt_text' => <<<PROMPT
Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka dengan konsep Pembelajaran Mendalam (Deep Learning) tingkat SMP di Indonesia.
Tugasmu adalah merancang Rencana Pelaksanaan Pembelajaran (RPP) dan Materi Ajar yang komprehensif, kaya konten, sangat detail, tetapi dikemas dengan bahasa yang sederhana, komunikatif, mudah dimengerti siswa SMP (usia 12-15 tahun), dan tidak menggunakan istilah ilmiah/akademis yang terlalu tinggi. Jika harus menggunakan istilah ilmiah khusus, sertakan penjelasan singkat yang mudah dalam tanda kurung. Rancang berdasarkan informasi berikut:
- Mata Pelajaran: {subject}
- Fase/Kelas: {class}
- Tujuan Pembelajaran (TP): {tp}
- Model Pedagogis: {pedagogical_model}

Buatkan rancangan utuh dan mendalam yang terdiri dari:
1. **Judul Materi**: Buat judul materi yang spesifik, profesional, kreatif, dan secara langsung mencerminkan kompetensi & materi inti dari TP (hindari judul yang terlalu umum). Judul dalam bentuk teks biasa TANPA tag HTML.
2. **Uraian Materi Utama**: Tulis penjelasan konsep inti secara lengkap dan terstruktur. Materi harus disusun secara terstruktur berdasarkan konsep dari yang kongkrit/kontekstual sehari-hari terlebih dahulu, kemudian berangsur menuju abstrak/teoritis. Tulis draf materi ini dengan sangat detail dan lengkap (minimal 5-6 paragraf panjang) yang mencakup sub-bagian:
   - **Kemampuan Prasyarat**: Jabarkan secara detail konsep-konsep dasar atau keterampilan apa saja yang harus sudah dikuasai siswa sebelum masuk pada materi inti ini.
   - **Draf Materi Inti**: Penjelasan konsep utama, rumus, atau teori yang dikemas sederhana dan kaya analogi kehidupan nyata.
   - **Materi Diferensiasi (3 Tingkat Pemahaman)**: Sediakan materi/aktivitas penunjang spesifik yang dibagi menjadi 3 tingkat kemampuan siswa:
     * *Tingkat Perlu Bimbingan*: Penjelasan konsep yang sangat disederhanakan dengan bantuan visual/analogis dasar yang sangat mudah.
     * *Tingkat Cukup/Baik*: Pemahaman standar/utama materi sesuai target TP.
     * *Tingkat Sangat Baik/Tantangan*: Materi pengayaan, eksplorasi tingkat lanjut, atau studi kasus kritis yang lebih menantang.
3. **Ide Gambar Relevan**: Deskripsi detail (minimal 2 kalimat) ilustrasi visual atau infografis yang relevan untuk memvisualisasikan konsep abstrak tersebut agar lebih mudah dipahami murid. WAJIB sertakan instruksi style: 'style ilustrasi gaya Flat 2D Vector minimalis'. Dalam bentuk teks biasa.

===== ATURAN FORMAT HTML WAJIB =====
Semua field yang berisi teks panjang (content) WAJIB ditulis menggunakan HTML semantik yang bersih dan profesional. Gunakan tag berikut:
- <h2> untuk judul bab/seksi utama (contoh: Kemampuan Prasyarat, Materi Inti, Diferensiasi)
- <h3> untuk sub-judul di dalam seksi
- <p> untuk paragraf teks penjelasan
- <strong> untuk menebalkan kata/frasa penting
- <em> untuk menekankan (italic) istilah khusus
- <ul> dan <li> untuk daftar tidak berurutan (bullet points)
- <ol> dan <li> untuk daftar berurutan (numbered list)
- <blockquote> untuk kutipan, stimulus, atau pertanyaan pemantik
- <hr> untuk pemisah antar bagian besar

CONTOH FORMAT CONTENT YANG BENAR:
<h2>Kemampuan Prasyarat</h2>
<p>Sebelum mempelajari materi ini, siswa perlu memahami konsep <strong>dasar</strong> berikut:</p>
<ul>
<li>Konsep pertama yang harus dikuasai</li>
<li>Konsep kedua yang relevan</li>
</ul>
<h2>Materi Inti</h2>
<p>Penjelasan paragraf pertama...</p>
<h3>Sub-Topik Penting</h3>
<p>Penjelasan sub-topik...</p>
<h2>Materi Diferensiasi</h2>
<h3>Tingkat Perlu Bimbingan</h3>
<p>Penjelasan sederhana...</p>
<h3>Tingkat Cukup/Baik</h3>
<p>Penjelasan standar...</p>
<h3>Tingkat Sangat Baik/Tantangan</h3>
<p>Pengayaan tingkat lanjut...</p>

JANGAN gunakan Markdown (###, **, -, dll). WAJIB gunakan HTML tags seperti contoh di atas.
=======================================

PENTING:
- Gunakan bahasa yang komunikatif, sederhana, dan ramah dipahami siswa SMP (usia 12-15 tahun).
- Keluarkan respons HANYA berupa JSON valid utuh tanpa awalan/akhiran penjelasan, dan TANPA markdown code fences (```json ... ```).
- Skema JSON wajib mengikuti struktur berikut secara presisi:
{
  "title": "Judul materi (teks biasa tanpa HTML)...",
  "content": "HTML terformat profesional berisi prasyarat, konsep inti dari konkret ke abstrak, serta 3 tingkat diferensiasi pemahaman...",
  "image_prompt": "Deskripsi gambar visual ilustrasi (teks biasa)..."
}
PROMPT
            ],
            [
                'teacher_id' => null,
                'key' => 'experiences',
                'name' => 'Rancang Tahapan Kegiatan (RPP Tab)',
                'description' => 'Prompt yang digunakan saat meregenerasi atau membuat rancangan 3 tahap kegiatan pembelajaran (Memahami, Mengaplikasi, Merefleksi) berdasarkan model pedagogis pilihan.',
                'placeholders' => ['{subject}', '{tp}', '{content}', '{pedagogical_model}'],
                'prompt_text' => <<<PROMPT
Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka dengan konsep Pembelajaran mendalam tingkat SMP di Indonesia.

Konteks Pembelajaran:
- Mata Pelajaran: {subject}
- Tujuan Pembelajaran (TP): {tp}
- Konten/Materi Utama: {content}
- Model Pedagogis yang dipilih: {pedagogical_model}

Buatkan rancangan 3 tahap kegiatan pembelajaran yang sangat menarik, detail, kontekstual, dengan bahasa yang sederhana dan mudah dipahami siswa SMP (usia 12-15 tahun), serta sesuai Kurikulum Merdeka dengan prinsip Pembelajaran Mendalam (Deep Learning):

1. **Tahap Memahami (Understanding):** Tuliskan skenario detail langkah demi langkah bagaimana guru memberikan stimulus menantang, mengajukan pertanyaan pemantik eksploratif yang mudah dipahami, serta bagaimana murid mengeksplorasi konsep dasar secara aktif dan berkolaborasi. (HARUS detail, minimal 4-5 kalimat konkret dan praktis).

2. **Tahap Mengaplikasi (Application):** Tuliskan skenario pengerjaan aktivitas/praktik nyata, studi kasus konkret, atau mini-projek kelompok di mana murid secara langsung menerapkan teori ke dalam pemecahan masalah riil. (HARUS detail, minimal 4-5 kalimat konkret dan praktis).

3. **Tahap Merefleksi (Reflection):** Tuliskan aktivitas metakognitif di mana murid mengidentifikasi miskonsepsi mereka sendiri dengan bahasa sederhana, mengevaluasi proses belajar kelompok/mandiri, serta merumuskan tindak lanjut konkret. (HARUS detail, minimal 4-5 kalimat konkret dan praktis).

PENTING:
- Gunakan bahasa yang komunikatif, sederhana, dan mudah dimengerti anak SMP (hindari istilah akademis/ilmiah yang terlalu tinggi tanpa penjelasan).
- Berikan jawaban langsung untuk setiap tahap (BUKAN dalam format JSON).
- Setiap tahap harus berupa paragraf panjang yang spesifik, praktis, dan langsung actionable untuk guru (hindari kalimat umum/generik seperti "Guru menjelaskan materi lalu siswa mendengarkan").
- Gunakan bahasa Indonesia yang baku, profesional, dan inspiratif.
- Hindari paragraf pembuka atau penutup yang generik.
- WAJIB gunakan format HTML semantik (bukan Markdown). Gunakan <p> untuk paragraf, <strong> untuk penekanan, <ul>/<li> untuk daftar, <blockquote> untuk pertanyaan pemantik.

Format jawaban wajib menggunakan header HTML <h2> persis seperti ini:

<h2>Memahami</h2>
<p>[isi kegiatan memahami dengan HTML formatting]</p>

<h2>Mengaplikasi</h2>
<p>[isi kegiatan mengaplikasi dengan HTML formatting]</p>

<h2>Merefleksi</h2>
<p>[isi kegiatan merefleksi dengan HTML formatting]</p>
PROMPT
            ],
            [
                'teacher_id' => null,
                'key' => 'assessment',
                'name' => 'Rancang Instrumen Asesmen',
                'description' => 'Prompt yang digunakan saat meregenerasi atau mendesain satu instrumen asesmen tertentu (Awal, Formatif, Sumatif) berdasarkan jenis instrumen yang dipilih guru.',
                'placeholders' => ['{tp}', '{content}', '{instrument_label}', '{observation_mode}', '{quiz_mode}'],
                'prompt_text' => <<<PROMPT
Kamu adalah asisten cerdas perancang instrumen asesmen Kurikulum Merdeka Indonesia yang terintegrasi, kontekstual, dan mudah dipahami oleh siswa SMP (usia 12-15 tahun).

Konteks:
- Tujuan Pembelajaran: {tp}
- Konten/Materi Utama: {content}
- Jenis Asesmen: {instrument_label}
- Mode Observasi: {observation_mode}
- Mode Soal (Kuis/Tes): {quiz_mode}

===== ATURAN KHUSUS BAHASA & INSTRUMEN =====
- BAHASA: Gunakan bahasa Indonesia yang sangat sederhana, komunikatif, bersahabat, mudah dipahami siswa SMP (usia 12-15 tahun), dan tidak menggunakan istilah ilmiah berbelit-belit.
- PERTANYAAN MCQ: Harus sangat singkat, padat, langsung pada inti pertanyaan, maksimal 2 kalimat sederhana. HINDARI narasi stimulus/kasus pengantar yang terlalu bertele-tele dan panjang.
- PILIHAN JAWABAN (OPTIONS): Harus sangat singkat, berupa kata atau frasa pendek (maksimal 5-8 kata per opsi), sejajar panjangnya, jelas, dan tidak ambigu. HINDARI pilihan jawaban berupa kalimat panjang bertele-tele yang membingungkan siswa.
- EXIT TICKET ("exit_ticket"): Pertanyaan refleksi wajib sangat pendek (maksimal 1 kalimat tanya sederhana per butir), santai, akrab, dan mudah dipahami siswa SMP. Hindari kalimat berbelit-belit, bertele-tele, atau teoretis.
- FORMAT OUTPUT: Seluruh output JSON WAJIB menyertakan field "description" yang berisi deskripsi/instruksi tugas untuk siswa dalam bahasa Indonesia sederhana, ramah, dan mudah dipahami (1-3 kalimat). Field "description" ini berada di level ROOT objek JSON.
=================================================================

===== KESESUAIAN KONTEKS & JENIS PENILAIAN =====
- KONTEN/MATERI: Seluruh butir instrumen, stimulus, indikator, kriteria, dan deskripsi level HARUS 100% spesifik dan relevan dengan materi "{content}", bukan materi umum atau materi lain.
- BENTUK PENILAIAN: Selaraskan sepenuhnya dengan Jenis Asesmen yang dipilih:
  * Jika Kinerja/Praktik, fokus pada instruksi unjuk kerja nyata dan rubrik aspek pengamatan keterampilan/proses, bukan ujian teori tertulis.
  * Jika Proyek, fokus pada tahapan perencanaan, pelaksanaan, dan pelaporan produk nyata.
  * Jika Portofolio, fokus pada penilaian kumpulan karya terbaik siswa.
  * Jika Tanya Jawab Lisan, sediakan daftar pertanyaan verbal ringkas dengan pedoman kunci jawaban/rambu-rambu jawaban bagi guru.
=================================================

Jika Jenis Asesmen adalah 'Kuis / Survei Diagnostik' (Asesmen Awal), maka buatlah tepat 3 pertanyaan dengan format gradasi tingkat kesulitan (tanpa bobot nilai/points, tanpa Pilihan Ganda):
- Soal 1 (Level 1): Kemampuan Dasar/Prasyarat (Tipe Isian Singkat atau Uraian/Essay). Pertanyaan konsep dasar sekali sebelum memulai materi inti.
- Soal 2 (Level 2): Kemampuan Sesuai Target (Tipe Isian Singkat atau Uraian/Essay). Menguji pemahaman standar/inti dari materi.
- Soal 3 (Level 3): Kemampuan Di Atas Rata-rata/Pengayaan (Tipe Uraian/Essay). Berupa analisis, pemecahan masalah, atau troubleshooting tingkat tinggi.

Buatkan instrumen asesmen lengkap dalam format JSON sesuai jenis instrumen yang diminta.
Pastikan instrumen dirancang secara profesional, tidak generik, serta menggunakan bahasa yang sederhana, jelas, komunikatif, dan ramah dipahami siswa SMP. Hindari penggunaan istilah ilmiah atau akademis yang terlalu tinggi. Jika ada istilah teknis, berikan penjelasan singkat di dalam tanda kurung.

PENTING: Kembalikan HANYA JSON valid tanpa penjelasan tambahan, tanpa markdown code fence (```json ... ```).

Format JSON sesuai jenis instrumen yang diminta:

Untuk jenis kuis asesmen awal ("quiz_survey" ketika digunakan sebagai kuis gradasi):
{
  "description": "Deskripsi/instruksi tugas untuk siswa dalam bahasa sederhana dan ramah, misalnya: 'Jawablah 3 pertanyaan berikut sesuai dengan pemahamanmu saat ini. Tidak perlu khawatir jika ada yang belum bisa, ini hanya untuk mengetahui kemampuan awalku.'",
  "questions": [
    {"id": "q1", "type": "short_answer", "text": "Pertanyaan Level 1 (Kemampuan Dasar/Prasyarat)...", "correct_answer": "kunci jawaban singkat"},
    {"id": "q2", "type": "short_answer", "text": "Pertanyaan Level 2 (Kemampuan Sesuai Target)...", "correct_answer": "kunci jawaban singkat"},
    {"id": "q3", "type": "essay", "text": "Pertanyaan Level 3 (Kemampuan Di Atas Rata-rata/Pengayaan)...", "correct_answer": "pedoman penskoran atau penjelasan jawaban ideal"}
  ]
}

Untuk jenis tes tertulis ("written_test"):
Jika Mode Soal adalah "mcq" (Pilihan Ganda):
{
  "description": "Deskripsi/instruksi tugas untuk siswa dalam bahasa sederhana dan ramah, misalnya: 'Kerjakan 10 soal pilihan ganda berikut dengan teliti. Pilihlah jawaban yang paling tepat ya!'",
  "quiz_mode": "mcq",
  "questions": [
    {"id": "q1", "type": "multiple_choice", "text": "Pertanyaan pilihan ganda 1...", "options": [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}, {"id": "c", "text": "..."}, {"id": "d", "text": "..."}], "answer": "a", "points": 1},
    {"id": "q2", "type": "multiple_choice", "text": "Pertanyaan pilihan ganda 2...", "options": [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}, {"id": "c", "text": "..."}, {"id": "d", "text": "..."}], "answer": "b", "points": 1}
  ],
  "levels": [
    {"name": "Perlu Bimbingan", "desc": "Skor < 60: Pemahaman dasar belum tercapai"},
    {"name": "Cukup", "desc": "Skor 60-75: Pemahaman cukup namun belum tuntas"},
    {"name": "Baik", "desc": "Skor 76-90: Pemahaman baik (Tuntas)"},
    {"name": "Sangat Baik", "desc": "Skor > 90: Pemahaman sangat baik (Pengayaan)"}
  ],
  "kktp": {"approach": "score_interval", "intervals": [{"min": 0, "max": 59, "label": "Perlu Bimbingan", "desc": "Remedial"}, {"min": 60, "max": 75, "label": "Cukup", "desc": "Perlu penguatan"}, {"min": 76, "max": 90, "label": "Baik", "desc": "Tuntas"}, {"min": 91, "max": 100, "label": "Sangat Baik", "desc": "Pengayaan"}]}
}
Buat tepat 10 pertanyaan pilihan ganda.

Jika Mode Soal adalah "essay" (Esai):
{
  "description": "Deskripsi/instruksi tugas untuk siswa dalam bahasa sederhana dan ramah, misalnya: 'Jawablah 5 pertanyaan uraian berikut dengan jelas dan lengkap. Tulislah jawabanmu dengan bahasamu sendiri ya!'",
  "quiz_mode": "essay",
  "questions": [
    {"id": "q1", "type": "essay", "text": "Pertanyaan uraian/esai 1...", "answer": "Pedoman penskoran atau jawaban ideal...", "points": 5},
    {"id": "q2", "type": "essay", "text": "Pertanyaan uraian/esai 2...", "answer": "Pedoman penskoran atau jawaban ideal...", "points": 5}
  ],
  "levels": [
    {"name": "Perlu Bimbingan", "desc": "Jawaban tidak relevan atau sangat dangkal"},
    {"name": "Cukup", "desc": "Jawaban relevan namun belum lengkap"},
    {"name": "Baik", "desc": "Jawaban lengkap dan menunjukkan pemahaman baik"},
    {"name": "Sangat Baik", "desc": "Jawaban sangat analitis, kreatif, dan mendalam"}
  ],
  "kktp": {"approach": "score_interval", "intervals": [{"min": 0, "max": 59, "label": "Perlu Bimbingan", "desc": "Remedial"}, {"min": 60, "max": 75, "label": "Cukup", "desc": "Perlu penguatan"}, {"min": 76, "max": 90, "label": "Baik", "desc": "Tuntas"}, {"min": 91, "max": 100, "label": "Sangat Baik", "desc": "Pengayaan"}]}
}
Buat tepat 5 pertanyaan esai/uraian.

Jika Mode Soal adalah "mixed" (Campuran):
{
  "description": "Deskripsi/instruksi tugas untuk siswa dalam bahasa sederhana dan ramah",
  "quiz_mode": "mixed",
  "questions": [
    {"id": "q1", "type": "multiple_choice", "text": "...", "options": [...], "answer": "a", "points": 1},
    {"id": "q6", "type": "essay", "text": "...", "answer": "Pedoman penskoran...", "points": 5}
  ],
  "levels": [...],
  "kktp": {"approach": "score_interval", "intervals": [...]}
}
Buat 5 pertanyaan pilihan ganda + 3 pertanyaan esai.

Untuk jenis kuis formatif ("formative_quiz"):
Adopsi format JSON seperti "written_test" di atas sesuai dengan Mode Soal {quiz_mode} yang diminta saat ini (mcq / essay / mixed), yang mencakup "quiz_mode", "questions" (dengan points dan options/answer/correct_answer yang lengkap), "levels", dan "kktp".
Gunakan pendekatan percentage untuk kktp kuis formatif: "kktp": {"approach": "percentage", "threshold": 75}
Pastikan seluruh pertanyaan dikemas dengan bahasa Indonesia yang sangat sederhana, komunikatif, ramah anak SMP (usia 12-15 tahun), dan teks soal tidak terlalu panjang (maksimal 2 kalimat sederhana saja).

Untuk jenis tes lisan ("oral_test"):
{
  "description": "Deskripsi/instruksi tugas untuk siswa dalam bahasa sederhana dan ramah",
  "stimulus": "Topik atau konteks pertanyaan lisan terkait materi yang diuji",
  "questions": [
    {"text": "Pertanyaan lisan 1: Jelaskan konsep dasar dengan bahasamu sendiri...", "answer_guide": "Kunci jawaban atau pedoman penskoran untuk pertanyaan 1"},
    {"text": "Pertanyaan lisan 2: Bandingkan dengan konsep lain yang sudah dipelajari...", "answer_guide": "Kunci jawaban atau pedoman penskoran untuk pertanyaan 2"},
    {"text": "Pertanyaan lisan 3: Berikan contoh penerapan dalam kehidupan nyata...", "answer_guide": "Kunci jawaban atau pedoman penskoran untuk pertanyaan 3"}
  ],
  "levels": [
    {"name": "Perlu Bimbingan", "desc": "Jawaban sangat dangkal atau tidak relevan"},
    {"name": "Cukup", "desc": "Jawaban cukup relevan namun belum mendalam"},
    {"name": "Baik", "desc": "Jawaban menunjukkan pemahaman yang baik"},
    {"name": "Sangat Baik", "desc": "Jawaban sangat mendalam dan analitis"}
  ],
  "kktp": {"approach": "rubric", "passing_level": "Baik"}
}

Untuk jenis penugasan ("assignment"):
{
  "description": "Deskripsi/instruksi tugas untuk siswa dalam bahasa sederhana dan ramah",
  "stimulus": "Deskripsi studi kasus atau topik laporan yang harus dianalisis siswa",
  "indicators": [
    {"name": "Ketepatan identifikasi masalah dan akar permasalahan"},
    {"name": "Kualitas analisis dan penggunaan konsep teori yang relevan"},
    {"name": "Kelengkapan solusi, rekomendasi, dan rencana tindak lanjut"},
    {"name": "Keteraturan penyajian laporan dan kualitas visualisasi data"}
  ],
  "levels": [
    {"name": "Perlu Bimbingan", "desc": "Laporan belum memenuhi standar minimal, analisis sangat dangkal"},
    {"name": "Cukup", "desc": "Laporan cukup memenuhi instruksi namun analisis belum mendalam"},
    {"name": "Baik", "desc": "Laporan lengkap, analisis baik, solusi relevan (Tuntas)"},
    {"name": "Sangat Baik", "desc": "Laporan sangat komprehensif, analisis kritis, solusi inovatif"}
  ],
  "kktp": {"approach": "rubric", "passing_level": "Baik"}
}

Untuk jenis observasi ("performance_observation"):
Jika Mode Observasi adalah "checklist":
{
  "description": "Deskripsi/instruksi observasi untuk guru dalam bahasa sederhana",
  "observation_mode": "checklist",
  "stimulus": "Deskripsi konteks pengamatan keterlibatan dan perilaku murid selama kegiatan pembelajaran dengan bahasa yang sederhana",
  "indicators": [
    {"name": "Indikator keterlibatan/perilaku 1", "note": "Contoh perilaku spesifik yang perlu diamati untuk indikator ini"},
    {"name": "Indikator keterlibatan/perilaku 2", "note": "Contoh perilaku spesifik yang perlu diamati untuk indikator ini"},
    {"name": "Indikator keterlibatan/perilaku 3", "note": "Contoh perilaku spesifik yang perlu diamati untuk indikator ini"},
    {"name": "Indikator keterlibatan/perilaku 4", "note": "Contoh perilaku spesifik yang perlu diamati untuk indikator ini"}
  ],
  "levels": [
    {"name": "Perlu Bimbingan", "desc": "Jika hanya 1 indikator terpenuhi"},
    {"name": "Cukup", "desc": "Jika 2 indikator terpenuhi"},
    {"name": "Baik", "desc": "Jika 3 indikator terpenuhi (Tuntas)"},
    {"name": "Sangat Baik", "desc": "Jika semua (4) indikator terpenuhi"}
  ],
  "teacher_notes": "Catatan tindak lanjut untuk guru",
  "kktp": {"approach": "criteria_description", "min_criteria": 2}
}

Jika Mode Observasi adalah "anecdotal":
{
  "description": "Deskripsi/instruksi observasi anekdotal untuk guru dalam bahasa sederhana",
  "observation_mode": "anecdotal",
  "stimulus": "Panduan pengamatan naratif keterlibatan dan perilaku murid selama kegiatan pembelajaran",
  "indicators": [
    {"name": "Indikator keterlibatan/perilaku 1", "note": "Contoh catatan anekdotal: 'Pada menit ke-15, Budi terlihat aktif bertanya kepada teman sebangkunya tentang langkah penyelesaian soal. Ia menunjukkan antusiasme tinggi dengan memberikan ide pertama saat diskusi kelompok dimulai.'"},
    {"name": "Indikator keterlibatan/perilaku 2", "note": "Contoh catatan anekdotal: 'Saat aktivitas praktikum, Siti secara konsisten membantu anggota kelompoknya yang belum memahami instruksi. Ia menjelaskan dengan sabar dan memberikan contoh konkret.'"},
    {"name": "Indikator keterlibatan/perilaku 3", "note": "Contoh catatan anekdotal: 'Di akhir sesi, Andi menunjukkan kemampuan refleksi dengan mengakui kesalahan pada langkah pertama dan menjelaskan strategi perbaikan yang akan dilakukan.'"},
    {"name": "Indikator keterlibatan/perilaku 4", "note": "Contoh catatan anekdotal: 'Selama presentasi kelompok, Maya memberikan respons yang membangun terhadap presentasi kelompok lain dengan pertanyaan analitis.'"}
  ],
  "levels": [
    {"name": "Perlu Bimbingan", "desc": "Catatan menunjukkan keterlibatan minimal, perlu bimbingan intensif"},
    {"name": "Cukup", "desc": "Catatan menunjukkan keterlibatan sporadis, mulai menunjukkan progres"},
    {"name": "Baik", "desc": "Catatan menunjukkan keterlibatan konsisten dan positif (Tuntas)"},
    {"name": "Sangat Baik", "desc": "Catatan menunjukkan keterlibatan luar biasa, inisiatif tinggi, dan membantu teman"}
  ],
  "teacher_notes": "Tulis catatan anekdotal secara naratif: sebutkan nama murid, perilaku spesifik yang diamati, konteks waktu/kegiatan, dan dampak terhadap pembelajaran.",
  "kktp": {"approach": "criteria_description", "min_criteria": 2}
}

Untuk jenis kinerja ("performance"):
Jika Mode Kinerja adalah "rubric":
{
  "description": "Deskripsi/instruksi tugas kinerja untuk siswa dalam bahasa sederhana dan ramah",
  "performance_mode": "rubric",
  "stimulus": "Deskripsi konteks praktik, proyek, atau produk yang harus didemonstrasikan murid dengan bahasa yang sederhana",
  "indicators": [
    {"name": "Indikator kinerja 1: Kesesuaian hasil dengan tujuan"},
    {"name": "Indikator kinerja 2: Kualitas teknis pengerjaan"},
    {"name": "Indikator kinerja 3: Kemampuan menjelaskan alur proses"},
    {"name": "Indikator kinerja 4: Kreativitas dan orisinalitas"}
  ],
  "levels": [
    {"name": "Perlu Bimbingan", "desc": "Karya/unjuk kerja belum memenuhi standar minimal"},
    {"name": "Cukup", "desc": "Karya/unjuk kerja memenuhi standar minimal namun belum tuntas"},
    {"name": "Baik", "desc": "Karya/unjuk kerja memenuhi seluruh standar dengan baik (Tuntas)"},
    {"name": "Sangat Baik", "desc": "Karya/unjuk kerja melampaui standar dengan inovasi"}
  ],
  "teacher_notes": "Fokus pada proses dan hasil akhir. Gunakan rubrik ini secara objektif selama pengamatan.",
  "kktp": {"approach": "rubric", "passing_level": "Baik"}
}

Jika Mode Kinerja adalah "continuum":
{
  "description": "Deskripsi/instruksi tugas kinerja untuk siswa dalam bahasa sederhana dan ramah",
  "performance_mode": "continuum",
  "stimulus": "Deskripsi konteks praktik, proyek, atau produk yang didemonstrasikan murid secara berkala",
  "indicators": [
    {"name": "Indikator keterampilan 1", "current_level": 0},
    {"name": "Indikator keterampilan 2", "current_level": 0},
    {"name": "Indikator keterampilan 3", "current_level": 0},
    {"name": "Indikator keterampilan 4", "current_level": 0}
  ],
  "development_levels": [
    {"name": "Belum Mulai", "desc": "Murid belum menunjukkan pemahaman atau keterampilan dasar"},
    {"name": "Sedang Berkembang", "desc": "Murid mulai memahami namun masih memerlukan bimbingan"},
    {"name": "Berkembang Baik", "desc": "Murid mampu menerapkan secara mandiri dengan hasil memadai"},
    {"name": "Mandiri", "desc": "Murid mampu menerapkan secara kreatif dan menjelaskan prosesnya"}
  ],
  "teacher_notes": "Amati perkembangan keterampilan murid dari waktu ke waktu. Catat level pencapaian saat ini untuk setiap indikator.",
  "kktp": {"approach": "score_interval", "intervals": [
    {"min": 0, "max": 25, "label": "Belum Mencapai", "desc": "Sebagian besar indikator di level Belum Mulai"},
    {"min": 26, "max": 50, "label": "Hampir Mencapai", "desc": "Sebagian indikator di level Sedang Berkembang"},
    {"min": 51, "max": 75, "label": "Sudah Mencapai", "desc": "Sebagian besar indikator di level Berkembang Baik"},
    {"min": 76, "max": 100, "label": "Sudah Mencapai", "desc": "Sebagian besar indikator di level Mandiri"}
  ]}
}

Untuk jenis lembar observasi lainnya ("observation_checklist", "self_assessment", "peer_assessment"):
{
  "description": "Deskripsi/instruksi observasi/penilaian untuk siswa dalam bahasa sederhana dan ramah",
  "stimulus": "Deskripsi konteks observasi/pengamatan langsung dengan bahasa yang sederhana",
  "indicators": [
    {"name": "Indikator sikap/keterampilan 1"},
    {"name": "Indikator sikap/keterampilan 2"},
    {"name": "Indikator sikap/keterampilan 3"},
    {"name": "Indikator sikap/keterampilan 4"}
  ],
  "levels": [
    {"name": "Perlu Bimbingan", "desc": "Jika hanya 1 indikator terpenuhi"},
    {"name": "Cukup", "desc": "Jika 2 indikator terpenuhi"},
    {"name": "Baik", "desc": "Jika 3 indikator terpenuhi (Tuntas)"},
    {"name": "Sangat Baik", "desc": "Jika semua (4) indikator terpenuhi"}
  ],
  "teacher_notes": "Catatan tindak lanjut untuk guru",
  "kktp": {"approach": "criteria_description", "min_criteria": 3}
}

Untuk jenis evaluasi reflektif ("exit_ticket" atau "reflective_journal"):
- Khusus "exit_ticket": Rancang tepat 3 pertanyaan refleksi yang sangat pendek (maksimal 1 kalimat tanya per pertanyaan), menggunakan kata-kata sehari-hari yang sangat akrab bagi siswa SMP (misal: "Apa bagian yang paling membuatmu bingung hari ini?", "Hal apa yang paling seru saat kamu belajar tadi?", "Apa 1 pertanyaan yang ingin kamu tanyakan besok?"). HINDARI kalimat yang terlalu formal, akademis, atau panjang lebar.
{
  "description": "Deskripsi/instruksi refleksi untuk siswa dalam bahasa sederhana dan ramah, misalnya: 'Tuliskan refleksimu hari ini dengan jujur ya! Tidak ada jawaban yang salah.'",
  "stimulus": "Instruksi/ stimulus pemantik refleksi bagi murid dengan kalimat sederhana",
  "questions": [
    {"text": "Pertanyaan refleksi sangat singkat, sederhana, dan ramah anak 1 (maksimal 1 kalimat)"},
    {"text": "Pertanyaan refleksi sangat singkat, sederhana, dan ramah anak 2 (maksimal 1 kalimat)"},
    {"text": "Pertanyaan refleksi sangat singkat, sederhana, dan ramah anak 3 (maksimal 1 kalimat)"}
  ],
  "levels": [
    {"name": "Perlu Bimbingan", "desc": "Tingkat refleksi sangat dangkal"},
    {"name": "Cukup", "desc": "Tingkat refleksi cukup mendalam"},
    {"name": "Baik", "desc": "Tingkat refleksi baik dan sadar diri"},
    {"name": "Sangat Baik", "desc": "Tingkat refleksi sangat tajam dan kritis"}
  ],
  "teacher_notes": "Catatan untuk guru dalam memetakan hasil belajar siswa",
  "kktp": {"approach": "criteria_description", "min_criteria": 2}
}

Untuk jenis proyek ("project"):
{
  "description": "Deskripsi/instruksi proyek untuk siswa dalam bahasa sederhana dan ramah",
  "stimulus": "Pertanyaan utama (driving question) proyek terkait {content}",
  "teacher_notes": "Tahapan Projek: 1. Perencanaan, 2. Pelaksanaan, 3. Pelaporan",
  "phase_planning": "Fokus evaluasi tahap perencanaan proyek terkait {content}",
  "phase_execution": "Fokus evaluasi tahap pelaksanaan proyek terkait {content}",
  "phase_product": "Fokus evaluasi produk/hasil proyek terkait {content}",
  "criteria": [
    {"id": "c1", "text": "Perencanaan Proyek", "weight": 30, "descriptions": {"l1": "Tidak ada perencanaan", "l2": "Perencanaan kurang detail", "l3": "Perencanaan baik dan terstruktur", "l4": "Perencanaan sangat matang dan inovatif"}},
    {"id": "c2", "text": "Pelaksanaan Proyek", "weight": 40, "descriptions": {"l1": "Tidak terlaksana", "l2": "Terlaksana sebagian", "l3": "Terlaksana dengan baik sesuai jadwal", "l4": "Terlaksana sangat baik dengan kolaborasi efektif"}},
    {"id": "c3", "text": "Produk/Hasil Proyek", "weight": 30, "descriptions": {"l1": "Tidak ada produk", "l2": "Produk kurang lengkap", "l3": "Produk sesuai kriteria dan berfungsi", "l4": "Produk inovatif dan berkualitas tinggi"}}
  ],
  "levels": [
    {"id": "l1", "name": "Perlu Bimbingan", "desc": "Projek belum selesai atau banyak tahapan terlewati", "score": 25},
    {"id": "l2", "name": "Cukup", "desc": "Projek selesai namun beberapa bagian kurang optimal", "score": 50},
    {"id": "l3", "name": "Baik", "desc": "Projek berhasil diselesaikan dengan baik di semua tahapan", "score": 75},
    {"id": "l4", "name": "Sangat Baik", "desc": "Projek menunjukkan inovasi luar biasa dan produk sangat berkualitas", "score": 100}
  ],
  "kktp": {"approach": "rubric", "passing_level": "Baik"}
}

Untuk jenis peta konsep ("concept_map"):
- Rancang topik utama peta konsep yang menarik.
- Sediakan metode pengumpulan (submission_mode: "hybrid").
- Tulis instruksi/petunjuk pembuatan peta konsep yang sangat sederhana, ramah anak SMP, dan mudah diikuti (maksimal 2-3 kalimat ringkas).
- Sediakan daftar kata kunci acak (keywords) sebanyak 6 sampai 8 kata atau frasa pendek yang relevan dengan materi, sangat familiar untuk siswa SMP.
{
  "description": "Deskripsi/instruksi pembuatan peta konsep untuk siswa dalam bahasa sederhana dan ramah",
  "central_topic": "Topik Utama Peta Konsep (misalnya: Siklus Air, Struktur Sel)",
  "submission_mode": "hybrid",
  "instructions": "Petunjuk pembuatan peta konsep dengan kalimat sederhana yang mudah dipahami murid SMP",
  "keywords": ["kata_kunci_1", "kata_kunci_2", "kata_kunci_3", "kata_kunci_4", "kata_kunci_5", "kata_kunci_6"]
}

Pastikan seluruh deskripsi spesifik terhadap konteks materi "{content}" dan tidak bersifat umum/generik. Gunakan bahasa yang sederhana bagi siswa SMP.
PROMPT
            ],
            [
                'teacher_id' => null,
                'key' => 'lkpd',
                'name' => 'Pembuat LKPD Pembelajaran',
                'description' => 'Prompt yang digunakan khusus untuk merancang Lembar Kerja Peserta Didik (LKPD) yang terstruktur, menarik, dan kolaboratif bagi murid.',
                'placeholders' => ['{subject}', '{tp}', '{content}', '{pedagogical_model}'],
                'prompt_text' => <<<PROMPT
Kamu adalah asisten cerdas perancang LKPD (Lembar Kerja Peserta Didik) kurikulum merdeka Indonesia.

Tugasmu adalah membuat rancangan Lembar Kerja Peserta Didik (LKPD) yang menarik, kontekstual, dan memicu berpikir kritis (Higher Order Thinking Skills) berdasarkan informasi berikut:
- Mata Pelajaran: {subject}
- Tujuan Pembelajaran (TP): {tp}
- Konten Utama: {content}
- Model Pembelajaran: {pedagogical_model}

LKPD WAJIB ditulis dalam format HTML semantik yang bersih dan terstruktur rapi. Gunakan tag HTML berikut:
- <h2> untuk judul seksi utama
- <h3> untuk sub-judul
- <p> untuk paragraf
- <strong> untuk teks penting/tebal
- <em> untuk istilah khusus (italic)
- <ul>/<ol> dan <li> untuk daftar
- <blockquote> untuk kutipan, instruksi khusus, atau stimulus
- <table>, <thead>, <tbody>, <tr>, <th>, <td> untuk tabel (misalnya rubrik penilaian)
- <hr> untuk pemisah seksi

JANGAN gunakan Markdown (###, **, -, dll). WAJIB gunakan HTML tags.

Struktur LKPD wajib memuat:
1. **Identitas LKPD:** Judul Kegiatan, Mata Pelajaran, Kelas, dan Nama Anggota Kelompok/Individu.
2. **Tujuan Pembelajaran:** Kompetensi spesifik yang akan dicapai murid setelah menyelesaikan LKPD ini.
3. **Pertanyaan Pemantik / Stimulus:** Kasus nyata, kutipan berita, atau ilustrasi kontekstual yang relevan dengan {content}.
4. **Petunjuk Belajar:** Panduan langkah demi langkah bagi murid untuk menyelesaikan aktivitas.
5. **Aktivitas & Langkah Pengerjaan:** Tugas mandiri/kelompok yang menantang, membimbing murid menemukan konsep secara bertahap.
6. **Pertanyaan Eksploratif:** 3-5 pertanyaan terbuka yang mendorong analisis mendalam (menganalisis, mengevaluasi, merancang).
7. **Refleksi Mandiri:** Kolom singkat bagi murid untuk menuliskan apa yang mereka pelajari dari lembar kerja ini.
8. **Kriteria Penilaian (Rubrik Sederhana):** Penjelasan singkat bagaimana hasil kerja mereka akan dinilai oleh guru.

PENTING:
- Mulai jawaban langsung dengan judul LKPD (jangan berikan kalimat pengantar "Berikut adalah LKPD...").
- Gunakan bahasa Indonesia yang komunikatif, ramah murid, dan memotivasi belajar.
PROMPT
            ],
            [
                'teacher_id' => null,
                'key' => 'tp_direct',
                'name' => 'Perumusan TP Langsung dari CP (Salin CP)',
                'description' => 'Prompt yang digunakan untuk merumuskan beberapa Tujuan Pembelajaran (TP) secara langsung dari satu kalimat Capaian Pembelajaran (CP).',
                'placeholders' => ['{cp_desc}'],
                'prompt_text' => <<<PROMPT
Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka tingkat SMP di Indonesia.
Tugasmu adalah merumuskan beberapa Tujuan Pembelajaran (TP) secara langsung berdasarkan Capaian Pembelajaran (CP) berikut:
- Capaian Pembelajaran (CP): {cp_desc}

Rumuskan minimal 3 hingga maksimal 5 kalimat Tujuan Pembelajaran (TP) yang jelas, spesifik, dan operasional (menggunakan Kata Kerja Operasional Bloom yang dapat diukur).
Setiap Tujuan Pembelajaran harus ditulis dalam satu kalimat ringkas dan berorientasi pada murid (misal: "Peserta didik mampu menganalisis...").

PENTING:
- Kembalikan HANYA berupa array JSON berisi string kalimat Tujuan Pembelajaran (TP) tersebut tanpa penjelasan pembuka atau penutup, dan tanpa markdown code fence (```json ... ```).
Contoh format output:
[
  "Peserta didik mampu menganalisis...",
  "Peserta didik mampu menyajikan..."
]
PROMPT
            ],
            [
                'teacher_id' => null,
                'key' => 'tp_analysis',
                'name' => 'Perumusan TP melalui Analisis Kompetensi & Konten',
                'description' => 'Prompt yang digunakan untuk menganalisis Kompetensi (Kata Kerja) dan Ruang Lingkup Materi (Konten) dari deskripsi CP, serta merumuskan kalimat TP yang komprehensif.',
                'placeholders' => ['{cp_desc}'],
                'prompt_text' => <<<PROMPT
Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka tingkat SMP di Indonesia.
Tugasmu adalah menganalisis Capaian Pembelajaran (CP) berikut untuk mengekstrak Kompetensi dan Konten, serta merumuskan kalimat Tujuan Pembelajaran (TP) yang sesuai.

Capaian Pembelajaran (CP): {cp_desc}

Lakukan langkah analisis berikut:
1. Identifikasi kata kerja kompetensi (Competences) utama yang terdapat pada CP (misal: memahami, menganalisis, merancang). Tentukan tingkatan taksonominya (C1-C6).
2. Identifikasi ruang lingkup materi (Content) utama yang dibahas.
3. Rumuskan 1 kalimat Tujuan Pembelajaran (TP) utama yang memadukan Kompetensi dan Konten tersebut (misal: "Peserta didik mampu menganalisis konsep data acak secara berkelompok").

PENTING:
- Kembalikan HANYA berupa JSON valid tanpa penjelasan pembuka atau penutup, dan tanpa markdown code fence (```json ... ```).
Skema JSON wajib mengikuti struktur berikut secara presisi:
{
  "competences": [
    {"verb": "menganalisis", "level": "C4"},
    {"verb": "menyajikan", "level": "C6"}
  ],
  "content": "Ruang lingkup materi CP...",
  "description": "Kalimat TP lengkap yang dirumuskan..."
}
PROMPT
            ],
            [
                'teacher_id' => null,
                'key' => 'tp_cross_element',
                'name' => 'Perumusan TP Lintas Elemen CP',
                'description' => 'Prompt yang digunakan untuk mensintesis beberapa deskripsi CP dari elemen-elemen yang berbeda menjadi satu Tujuan Pembelajaran yang terintegrasi dan holistik.',
                'placeholders' => ['{cps_desc}'],
                'prompt_text' => <<<PROMPT
Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka tingkat SMP di Indonesia.
Tugasmu adalah merumuskan satu Tujuan Pembelajaran (TP) yang terintegrasi lintas elemen berdasarkan beberapa Capaian Pembelajaran (CP) berikut:
{cps_desc}

Sintesiskan CP-CP di atas menjadi satu kalimat Tujuan Pembelajaran (TP) yang holistik, bermakna (meaningful), dan menghubungkan aspek-aspek kompetensi dari elemen-elemen tersebut secara logis.
Kalimat TP harus berorientasi pada murid (misal: "Peserta didik mampu mengintegrasikan...").

PENTING:
- Kembalikan HANYA berupa string kalimat Tujuan Pembelajaran (TP) tersebut secara langsung tanpa format JSON, tanpa penjelasan pembuka atau penutup.
PROMPT
            ],
            [
                'teacher_id' => null,
                'key' => 'modul_ajar',
                'name' => 'Perakit Modul Ajar Terintegrasi',
                'description' => 'Prompt yang digunakan untuk merakit RPP, desain pembelajaran terstruktur, dan LKPD dalam format JSON terperinci.',
                'placeholders' => ['{subject}', '{class}', '{tp}', '{material}', '{pedagogical_model}', '{initial_assessments}', '{formative_assessments}', '{summative_assessments}'],
                'prompt_text' => <<<PROMPT
Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka dengan konsep Pembelajaran Mendalam (Deep Learning) tingkat SMP di Indonesia.
Tugasmu adalah menyusun Modul Ajar / RPP secara sangat lengkap dan mendalam untuk mata pelajaran {subject}, kelas {class}, Tujuan Pembelajaran (TP) "{tp}", dengan fokus materi "{material}", dan menggunakan model pembelajaran "{pedagogical_model}".
Modul Ajar ini harus komprehensif, kaya konten, sangat detail, tetapi dikemas dengan bahasa yang sederhana, komunikatif, mudah dimengerti siswa SMP (usia 12-15 tahun), dan tidak menggunakan istilah ilmiah/akademis yang terlalu tinggi. Jika harus menggunakan istilah ilmiah khusus, sertakan penjelasan singkat yang mudah dalam tanda kurung.

Gunakan data Asesmen yang sudah ditentukan sebagai referensi:
- Asesmen Awal: {initial_assessments}
- Asesmen Formatif: {formative_assessments}
- Asesmen Sumatif: {summative_assessments}

Format output harus berupa JSON valid tanpa code fence (```json ... ```), mengandung key:
- alokasi_waktu: Alokasi waktu pembelajaran (contoh: "2 x 40 menit"). Teks biasa.
- jumlah_pertemuan: Perkiraan jumlah pertemuan (contoh: "1 Pertemuan"). Teks biasa.
- dimensi_profil: Dimensi profil pelajar pancasila yang relevan (contoh: "Bernalar Kritis, Kreatif, Gotong Royong"). Teks biasa.
- lingkungan_pembelajaran: Deskripsi lingkungan pembelajaran (contoh: "Ruang Kelas dan Perpustakaan"). Teks biasa.
- kemitraan_pembelajaran: Bentuk kemitraan (contoh: "Diskusi kelompok antar teman sebaya"). Teks biasa.
- pemanfaatan_digital: Penggunaan teknologi (contoh: "Penggunaan tablet untuk mencari referensi"). Teks biasa.
- media_ilustrasi: Deskripsi gambar/media ilustrasi ajar (image prompt visual). Teks biasa.
- understanding: Kegiatan memahami (Understanding). Langkah operasional guru memicu rasa ingin tahu murid. Gunakan format HTML semantik.
- application: Kegiatan mengaplikasikan (Application). Skenario aktivitas praktis, studi kasus nyata. Gunakan format HTML semantik.
- reflection: Kegiatan merefleksikan (Reflection). Aktivitas metakognisi murid menilai pemahaman. Gunakan format HTML semantik.
- lkpd: Lembar Kerja Peserta Didik lengkap dengan petunjuk, tugas, pertanyaan eksploratif, refleksi, dan rubrik. Gunakan format HTML semantik.

===== ATURAN FORMAT HTML WAJIB =====
Field yang wajib menggunakan HTML (understanding, application, reflection, lkpd) harus ditulis menggunakan HTML semantik yang bersih dan profesional.
- <h2> untuk judul utama
- <h3> untuk sub-judul
- <p> untuk paragraf teks penjelasan
- <strong> untuk menebalkan kata/frasa penting
- <ul> dan <li> untuk daftar tidak berurutan (bullet points)
- <ol> dan <li> untuk daftar berurutan (numbered list)
- <blockquote> untuk kutipan atau pertanyaan pemantik
- <table>, <thead>, <tbody>, <tr>, <th>, <td> untuk tabel (sangat wajib untuk kriteria/rubrik di LKPD)
JANGAN gunakan Markdown (###, **, -, dll). WAJIB gunakan HTML tags.
=======================================

PENTING:
- Gunakan bahasa yang sederhana, komunikatif, dan mudah dimengerti anak SMP.
- Output HANYA berupa objek JSON valid dengan tepat 11 key di atas tanpa markdown code fence.
PROMPT
            ]
        ];

        foreach ($prompts as $promptData) {
            LmsAiPrompt::updateOrCreate(
                [
                    'teacher_id' => $promptData['teacher_id'],
                    'key' => $promptData['key']
                ],
                $promptData
            );
        }
    }
}
