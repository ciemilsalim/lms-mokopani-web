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
                'description' => 'Prompt utama yang digunakan untuk merancang seluruh materi, RPP, asesmen awal/formatif/sumatif, rubrik, dan LKPD secara terpadu dalam sekali klik.',
                'placeholders' => ['{subject}', '{class}', '{tp}', '{pedagogical_model}'],
                'prompt_text' => <<<PROMPT
Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka dengan konsep Pembelajaran Mendalam (Deep Learning) tingkat SMP di Indonesia.
Tugasmu adalah merancang pembelajaran mendalam yang komprehensif, kaya konten, sangat detail, dan tidak bersifat umum/generik berdasarkan informasi berikut:
- Mata Pelajaran: {subject}
- Fase/Kelas: {class}
- Tujuan Pembelajaran (TP): {tp}
- Model Pedagogis: {pedagogical_model}

Buatkan rancangan utuh dan mendalam yang terdiri dari:
1. **Judul Materi**: Buat judul materi yang spesifik, profesional, kreatif, dan secara langsung mencerminkan kompetensi & materi inti dari TP (hindari judul yang terlalu umum).
2. **Uraian Materi Utama**: Tulis penjelasan konsep inti secara lengkap, terstruktur, ilmiah namun mudah dipahami anak SMP. Uraian HARUS sangat kaya konten (minimal 4-5 paragraf panjang), menyertakan definisi formal, contoh analogi kehidupan nyata, rumus/prinsip jika ada, dan pembahasan mendalam (BUKAN ringkasan poin-poin singkat atau placeholder). Format dalam HTML/Markdown bersih dengan tag <h3>, <p>, <strong>, dan <ul>/<ol> agar rapi dan profesional saat dicetak.
3. **Ide Gambar Relevan**: Deskripsi detail (minimal 2 kalimat) ilustrasi visual atau infografis yang relevan untuk memvisualisasikan konsep abstrak tersebut agar lebih mudah dipahami murid.
4. **Tahapan Kegiatan Pembelajaran (RPP)**: 
   - Tahap Memahami (Understanding): Langkah operasional guru memicu rasa ingin tahu murid (stimulus/pertanyaan pemantik yang menantang), eksplorasi mandiri murid, dan diskusi kelas terarah. Tulis secara detail berupa aktivitas nyata (minimal 4 kalimat detail).
   - Tahap Mengaplikasi (Application): Skenario aktivitas praktis, studi kasus nyata, atau mini-projek kelompok di mana murid secara konkret mengimplementasikan konsep tersebut untuk memecahkan masalah. Jabarkan instruksi kerja dan langkah pengerjaannya secara rinci (minimal 4 kalimat detail).
   - Tahap Merefleksi (Reflection): Aktivitas metakognisi terstruktur di mana murid menilai pemahaman mereka sendiri, mendiskusikan miskonsepsi yang sempat terjadi, dan merumuskan kaitan materi ini dengan masa depan mereka (minimal 4 kalimat detail).
5. **Lembar Kerja Peserta Didik (LKPD)**: Lembar aktivitas mandiri/kelompok yang memuat Petunjuk Belajar, Tugas/Kegiatan terperinci, Pertanyaan Esensial, dan Kriteria Evaluasi sederhana. Ditulis dalam format HTML/Markdown yang sangat rapi dan profesional.
6. **Asesmen Awal (Diagnostik)**: Satu instrumen asesmen diagnostik lengkap (kuis, tanya jawab lisan, atau observasi) dengan stimulus, rubrik kriteria 4 tingkat (Perlu Bimbingan, Cukup, Baik, Sangat Baik), dan KKTP.
7. **Asesmen Formatif**: Satu instrumen formatif yang selaras (Jurnal Reflektif, Exit Ticket, atau Observasi Kinerja) lengkap dengan stimulus, instrumen penilaian, dan kriteria KKTP.
8. **Asesmen Sumatif**: Satu instrumen sumatif (Tes Tertulis, Unjuk Kerja, atau Projek) lengkap dengan stimulus, daftar soal/instruksi, kriteria penilaian bertingkat, dan KKTP.

PENTING:
- Keluarkan respons HANYA berupa JSON valid utuh tanpa awalan/akhiran penjelasan, dan TANPA markdown code fences (```json ... ```).
- Skema JSON wajib mengikuti struktur berikut secara presisi:
{
  "title": "Judul materi...",
  "content": "HTML/Markdown isi materi...",
  "image_prompt": "Deskripsi gambar visual ilustrasi...",
  "understanding": "Paragraf kegiatan memahami...",
  "application": "Paragraf kegiatan mengaplikasikan...",
  "reflection": "Paragraf kegiatan merefleksikan...",
  "lkpd": "HTML/Markdown rancangan LKPD yang rapi...",
  "initial": {
    "instrument_type": "quiz_survey / oral_qa / observation_checklist",
    "title": "Judul Asesmen Awal...",
    "instrument_config": {
      "stimulus": "Deskripsi stimulus...",
      "questions": [
        {"id": "q1", "type": "multiple_choice", "text": "Pertanyaan...", "options": [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}]},
        {"id": "q2", "type": "short_answer", "text": "Pertanyaan..."}
      ],
      "levels": [
        {"name": "Perlu Bimbingan", "desc": "Deskripsi kriteria..."},
        {"name": "Cukup", "desc": "Deskripsi kriteria..."},
        {"name": "Baik", "desc": "Deskripsi kriteria..."},
        {"name": "Sangat Baik", "desc": "Deskripsi kriteria..."}
      ],
      "kktp": {"approach": "rubric", "passing_level": "Baik"}
    }
  },
  "formative": {
    "instrument_type": "reflective_journal / self_assessment / exit_ticket / performance_observation",
    "title": "Judul Asesmen Formatif...",
    "instrument_config": {
      "stimulus": "Deskripsi stimulus...",
      "questions": [{"text": "Pertanyaan refleksi..."}],
      "levels": [
        {"name": "Perlu Bimbingan", "desc": "Deskripsi..."},
        {"name": "Cukup", "desc": "Deskripsi..."},
        {"name": "Baik", "desc": "Deskripsi..."},
        {"name": "Sangat Baik", "desc": "Deskripsi..."}
      ],
      "kktp": {"approach": "criteria_description", "min_criteria": 2}
    }
  },
  "summative": {
    "instrument_type": "written_test / performance / project",
    "title": "Judul Asesmen Sumatif...",
    "instrument_config": {
      "stimulus": "Deskripsi stimulus...",
      "questions": [
        {"id": "q1", "type": "multiple_choice", "text": "Pertanyaan...", "options": [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}], "answer": "a"},
        {"id": "q2", "type": "short_answer", "text": "Pertanyaan..."}
      ],
      "levels": [
        {"name": "Perlu Bimbingan", "desc": "Deskripsi..."},
        {"name": "Cukup", "desc": "Deskripsi..."},
        {"name": "Baik", "desc": "Deskripsi..."},
        {"name": "Sangat Baik", "desc": "Deskripsi..."}
      ],
      "kktp": {"approach": "score_interval", "passing_min": 60}
    }
  }
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

Buatkan rancangan 3 tahap kegiatan pembelajaran yang sangat menarik, detail, kontekstual, dan sesuai Kurikulum Merdeka dengan prinsip Pembelajaran Mendalam (Deep Learning):

1. **Tahap Memahami (Understanding):** Tuliskan skenario detail langkah demi langkah bagaimana guru memberikan stimulus menantang, mengajukan pertanyaan pemantik eksploratif, serta bagaimana murid mengeksplorasi konsep dasar secara aktif dan berkolaborasi. (HARUS detail, minimal 4-5 kalimat konkret dan praktis).

2. **Tahap Mengaplikasi (Application):** Tuliskan skenario pengerjaan aktivitas/praktik nyata, studi kasus konkret, atau mini-projek kelompok di mana murid secara langsung menerapkan teori ke dalam pemecahan masalah riil. Jabarkan apa peran guru dan apa yang harus dilakukan kelompok murid secara operasional. (HARUS detail, minimal 4-5 kalimat konkret dan praktis).

3. **Tahap Merefleksi (Reflection):** Tuliskan aktivitas metakognitif di mana murid mengidentifikasi miskonsepsi mereka sendiri, mengevaluasi proses belajar kelompok/mandiri, serta merumuskan tindak lanjut konkret. (HARUS detail, minimal 4-5 kalimat konkret dan praktis).

PENTING:
- Berikan jawaban langsung untuk setiap tahap (BUKAN dalam format JSON).
- Setiap tahap harus berupa paragraf panjang yang spesifik, praktis, dan langsung actionable untuk guru (hindari kalimat umum/generik seperti "Guru menjelaskan materi lalu siswa mendengarkan").
- Gunakan bahasa Indonesia yang baku, profesional, dan inspiratif.
- Hindari paragraf pembuka atau penutup yang generik.

Format jawaban wajib menggunakan header ## persis seperti ini:

## Memahami
[isi kegiatan memahami]

## Mengaplikasi
[isi kegiatan mengaplikasi]

## Merefleksi
[isi kegiatan merefleksi]
PROMPT
            ],
            [
                'teacher_id' => null,
                'key' => 'assessment',
                'name' => 'Rancang Instrumen Asesmen',
                'description' => 'Prompt yang digunakan saat meregenerasi atau mendesain satu instrumen asesmen tertentu (Awal, Formatif, Sumatif) berdasarkan jenis instrumen yang dipilih guru.',
                'placeholders' => ['{tp}', '{content}', '{instrument_label}'],
                'prompt_text' => <<<PROMPT
Kamu adalah asisten cerdas perancang instrumen asesmen Kurikulum Merdeka Indonesia yang terintegrasi dan kontekstual.

Konteks:
- Tujuan Pembelajaran: {tp}
- Konten/Materi Utama: {content}
- Jenis Instrumen: {instrument_label}

Buatkan instrumen asesmen lengkap dalam format JSON sesuai jenis instrumen yang diminta.
Pastikan instrumen dirancang secara profesional, tidak generik, dan sesuai untuk tingkat sekolah menengah.

PENTING: Kembalikan HANYA JSON valid tanpa penjelasan tambahan, tanpa markdown code fence (```json ... ```).

Format JSON sesuai jenis instrumen yang diminta:

Untuk jenis rubrik/penilaian bertingkat ("rubric" atau "oral_qa"):
{
  "stimulus": "Deskripsi stimulus/konteks asesmen yang menarik dan kontekstual",
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
    {"id": "q1", "type": "multiple_choice", "text": "Pertanyaan berbobot...", "options": [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}, {"id": "c", "text": "..."}, {"id": "d", "text": "..."}], "answer": "a"},
    {"id": "q2", "type": "short_answer", "text": "Pertanyaan esai singkat..."}
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
  "stimulus": "Deskripsi konteks observasi/pengamatan langsung",
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
  "stimulus": "Instruksi/ stimulus pemantik refleksi bagi murid",
  "questions": [
    {"text": "Pertanyaan refleksi mendalam 1"},
    {"text": "Pertanyaan refleksi mendalam 2"},
    {"text": "Pertanyaan refleksi mendalam 3"}
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

Pastikan seluruh deskripsi spesifik terhadap konteks materi "{content}" dan tidak bersifat umum/generik.
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

LKPD harus ditulis dalam format HTML/Markdown yang bersih dan terstruktur rapi. Gunakan elemen visual (seperti box info, tabel, atau bullet points) agar menarik saat dicetak atau dibaca murid.

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
