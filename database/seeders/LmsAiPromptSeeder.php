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
3. **Ide Gambar Relevan**: Deskripsi detail (minimal 2 kalimat) ilustrasi visual atau infografis yang relevan untuk memvisualisasikan konsep abstrak tersebut agar lebih mudah dipahami murid. Dalam bentuk teks biasa.
4. **Tahapan Kegiatan Pembelajaran (RPP)**: 
   - Tahap Memahami (Understanding): Langkah operasional guru memicu rasa ingin tahu murid (stimulus/pertanyaan pemantik yang menantang tapi dikemas sederhana), eksplorasi mandiri murid, dan diskusi kelas terarah. Tulis secara detail berupa aktivitas nyata (minimal 4 kalimat detail).
   - Tahap Mengaplikasi (Application): Skenario aktivitas praktis, studi kasus nyata, atau mini-projek kelompok yang ramah anak SMP di mana murid secara konkret mengimplementasikan konsep tersebut untuk memecahkan masalah. (minimal 4 kalimat detail).
   - Tahap Merefleksi (Reflection): Aktivitas metakognisi terstruktur di mana murid menilai pemahaman mereka dengan bahasa sederhana, mendiskusikan miskonsepsi yang sempat terjadi, dan merumuskan kaitan materi ini dengan masa depan mereka (minimal 4 kalimat detail).
5. **Lembar Kerja Peserta Didik (LKPD)**: Lembar aktivitas mandiri/kelompok yang memuat Petunjuk Belajar, Tugas/Kegiatan terperinci menggunakan bahasa sederhana, Pertanyaan Esensial, dan Kriteria Evaluasi sederhana.

===== ATURAN FORMAT HTML WAJIB =====
Semua field yang berisi teks panjang (content, understanding, application, reflection, lkpd) WAJIB ditulis menggunakan HTML semantik yang bersih dan profesional. Gunakan tag berikut:
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
  "image_prompt": "Deskripsi gambar visual ilustrasi (teks biasa)...",
  "understanding": "HTML terformat untuk kegiatan memahami...",
  "application": "HTML terformat untuk kegiatan mengaplikasikan...",
  "reflection": "HTML terformat untuk kegiatan merefleksikan...",
  "lkpd": "HTML terformat rancangan LKPD yang rapi..."
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
                'placeholders' => ['{tp}', '{content}', '{instrument_label}'],
                'prompt_text' => <<<PROMPT
Kamu adalah asisten cerdas perancang instrumen asesmen Kurikulum Merdeka Indonesia yang terintegrasi, kontekstual, dan mudah dipahami oleh siswa SMP (usia 12-15 tahun).

Konteks:
- Tujuan Pembelajaran: {tp}
- Konten/Materi Utama: {content}
- Jenis Instrumen: {instrument_label}

Buatkan instrumen asesmen lengkap dalam format JSON sesuai jenis instrumen yang diminta.
Pastikan instrumen dirancang secara profesional, tidak generik, serta menggunakan bahasa yang sederhana, jelas, komunikatif, dan ramah dipahami siswa SMP. Hindari penggunaan istilah ilmiah atau akademis yang terlalu tinggi. Jika ada istilah teknis, berikan penjelasan singkat di dalam tanda kurung.

PENTING: Kembalikan HANYA JSON valid tanpa penjelasan tambahan, tanpa markdown code fence (```json ... ```).

Format JSON sesuai jenis instrumen yang diminta:

Untuk jenis rubrik/penilaian bertingkat ("rubric" atau "oral_qa"):
{
  "stimulus": "Deskripsi stimulus/konteks asesmen yang menarik, kontekstual, dan mudah dipahami anak SMP",
  "criteria": "Nama kriteria yang dinilai",
  "levels": [
    {"name": "Perlu Bimbingan", "desc": "Deskripsi kriteria performa murid yang belum memadai"},
    {"name": "Cukup", "desc": "Deskripsi kriteria performa murid yang mencapai standar minimal"},
    {"name": "Baik", "desc": "Deskripsi kriteria performa murid yang menguasai materi dengan baik"},
    {"name": "Sangat Baik", "desc": "Deskripsi kriteria performa murid yang melampaui ekspektasi"}
  ],
  "kktp": {"approach": "rubric", "passing_level": "Baik"}
}

Untuk jenis tes/kuis ("quiz_survey" atau "written_test"):
{
  "questions": [
    {"id": "q1", "type": "multiple_choice", "text": "Pertanyaan yang dikemas dengan kalimat ringkas dan bersahabat bagi anak SMP...", "options": [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}, {"id": "c", "text": "..."}, {"id": "d", "text": "..."}], "answer": "a"},
    {"id": "q2", "type": "short_answer", "text": "Pertanyaan esai singkat dengan bahasa yang sederhana..."}
  ],
  "levels": [
    {"name": "Perlu Bimbingan", "desc": "Penjelasan tindak lanjut skor rendah"},
    {"name": "Cukup", "desc": "Penjelasan tindak lanjut skor sedang"},
    {"name": "Baik", "desc": "Penjelasan tindak lanjut skor baik (Tuntas)"},
    {"name": "Sangat Baik", "desc": "Penjelasan tindak lanjut skor sangat baik (Pengayaan)"}
  ],
  "kktp": {"approach": "rubric", "passing_level": "Baik"}
}

Untuk jenis lembar observasi ("observation_checklist", "self_assessment", "peer_assessment", atau "performance"):
{
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
{
  "stimulus": "Instruksi/ stimulus pemantik refleksi bagi murid dengan kalimat sederhana",
  "questions": [
    {"text": "Pertanyaan refleksi sederhana dan ramah anak 1"},
    {"text": "Pertanyaan refleksi sederhana dan ramah anak 2"},
    {"text": "Pertanyaan refleksi sederhana dan ramah anak 3"}
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
