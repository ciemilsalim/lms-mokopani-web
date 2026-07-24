<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LmsAiPrompt extends Model
{
    protected $table = 'lms_ai_prompts';

    protected $fillable = [
        'teacher_id',
        'key',
        'name',
        'description',
        'prompt_text',
        'placeholders'
    ];

    protected $casts = [
        'placeholders' => 'array'
    ];

    /**
     * Relationship to Teacher
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class, 'teacher_id');
    }

    /**
     * Get the active prompt for a given key, custom for a teacher or fallback to system default.
     */
    public static function getPromptFor(string $key, ?int $teacherId = null): string
    {
        // 1. Try to find the teacher's custom prompt
        if ($teacherId !== null) {
            $customPrompt = self::where('key', $key)
                ->where('teacher_id', $teacherId)
                ->first();

            if ($customPrompt && !empty($customPrompt->prompt_text)) {
                return $customPrompt->prompt_text;
            }
        }

        // 2. Try to find the system default prompt (where teacher_id is null)
        $defaultPrompt = self::where('key', $key)
            ->whereNull('teacher_id')
            ->first();

        if ($defaultPrompt && !empty($defaultPrompt->prompt_text)) {
            return $defaultPrompt->prompt_text;
        }

        // 3. Absolute hardcoded fallback (defensive programming)
        return self::getHardcodedFallback($key);
    }

    /**
     * Return hardcoded fallback prompt if database lacks seeders.
     */
    private static function getHardcodedFallback(string $key): string
    {
        $fallbacks = [
            'orchestrator_draft' => "Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka dengan konsep Pembelajaran Mendalam (Deep Learning) tingkat SMP di Indonesia. Tugasmu adalah merancang Rencana Pelaksanaan Pembelajaran (RPP) dan Materi Ajar yang komprehensif, kaya konten, sangat detail, tetapi dikemas dengan bahasa yang sederhana, komunikatif, mudah dimengerti siswa SMP (usia 12-15 tahun), dan tidak menggunakan istilah ilmiah/akademis yang terlalu tinggi. Jika harus menggunakan istilah ilmiah khusus, sertakan penjelasan singkat yang mudah dalam tanda kurung. Rancang berdasarkan mata pelajaran {subject}, kelas {class}, model pedagogis {pedagogical_model}, dan Tujuan Pembelajaran (TP): {tp}.
Format output harus berupa JSON valid tanpa code fence, mengandung key:
- title: Judul materi yang spesifik, kreatif, dan secara langsung mencerminkan kompetensi & materi inti dari TP. Dalam bentuk teks biasa TANPA tag HTML.
- content: Uraian materi utama yang terstruktur menggunakan HTML semantik (<h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <code>, <blockquote>, <hr>). Materi harus disusun secara terstruktur berdasarkan konsep dari yang kongkrit/kontekstual sehari-hari terlebih dahulu, kemudian berangsur menuju abstrak/teoritis. Tulis draf materi ini dengan sangat detail dan lengkap (minimal 5-6 paragraf panjang) yang mencakup sub-bagian:
  1. <h2>Kemampuan Prasyarat</h2>: Jabarkan secara detail konsep-konsep dasar atau keterampilan apa saja yang harus sudah dikuasai siswa sebelum masuk pada materi inti ini.
  2. <h2>Materi Inti</h2>: Penjelasan konsep utama, rumus, atau teori yang dikemas sederhana dan kaya analogi kehidupan nyata.
  3. <h2>Materi Diferensiasi</h2>: Sediakan materi/aktivitas penunjang spesifik yang dibagi menjadi 3 tingkat kemampuan siswa:
     - <h3>Tingkat Perlu Bimbingan</h3>: Penjelasan konsep yang sangat disederhanakan.
     - <h3>Tingkat Cukup/Baik</h3>: Pemahaman standar/utama materi sesuai target TP.
     - <h3>Tingkat Sangat Baik/Tantangan</h3>: Materi pengayaan, eksplorasi tingkat lanjut.
- image_prompt: Deskripsi detail (minimal 2 kalimat) ilustrasi visual atau infografis yang relevan. WAJIB sertakan instruksi style: 'style ilustrasi gaya Flat 2D Vector minimalis'. Teks biasa tanpa HTML.",
            
            'experiences' => "Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka dengan konsep Pembelajaran Mendalam (Deep Learning) tingkat SMP di Indonesia.
Mata Pelajaran: {subject}
Tujuan Pembelajaran: {tp}
Konten/Materi: {content}
Model Pedagogis: {pedagogical_model}

Buatkan rancangan 3 tahap kegiatan pembelajaran yang sangat menarik, detail, kontekstual, dengan bahasa yang sederhana dan ramah dipahami oleh siswa SMP (usia 12-15 tahun), serta sesuai Kurikulum Merdeka dengan prinsip Pembelajaran Mendalam:
1. **Tahap Memahami (Understanding):** Skenario detail langkah demi langkah bagaimana guru memberikan stimulus menantang, mengajukan pertanyaan pemantik eksploratif yang mudah dipahami, serta bagaimana murid mengeksplorasi konsep dasar secara aktif dan berkolaborasi. (minimal 4-5 kalimat konkret dan praktis).
2. **Tahap Mengaplikasi (Application):** Skenario pengerjaan aktivitas/praktik nyata, studi kasus konkret, atau mini-projek kelompok di mana murid secara langsung menerapkan teori ke dalam pemecahan masalah riil. (minimal 4-5 kalimat konkret dan praktis).
3. **Tahap Merefleksi (Reflection):** Aktivitas metakognitif di mana murid mengidentifikasi miskonsepsi mereka sendiri dengan bahasa refleksi yang sederhana, mengevaluasi proses belajar kelompok/mandiri, serta merumuskan tindak lanjut konkret. (minimal 4-5 kalimat konkret dan praktis).

PENTING:
- Gunakan bahasa yang komunikatif, sederhana, dan mudah dimengerti anak SMP (hindari istilah akademis/ilmiah yang terlalu tinggi tanpa penjelasan).
- Berikan jawaban langsung untuk setiap tahap (BUKAN dalam format JSON).
- Setiap tahap harus berupa paragraf panjang yang spesifik, praktis, dan langsung actionable untuk guru (hindari kalimat umum/generik).
- WAJIB gunakan format HTML semantik (bukan Markdown). Gunakan <p> untuk paragraf, <strong> untuk penekanan, <ul>/<li> untuk daftar, <blockquote> untuk pertanyaan pemantik.
- Gunakan format header HTML <h2> persis seperti ini:
<h2>Memahami</h2>
[isi kegiatan memahami dengan HTML formatting]
<h2>Mengaplikasi</h2>
[isi kegiatan mengaplikasi dengan HTML formatting]
<h2>Merefleksi</h2>
[isi kegiatan merefleksi dengan HTML formatting]",

            'assessment' => "Kamu adalah asisten cerdas perancang instrumen asesmen Kurikulum Merdeka Indonesia yang ramah siswa tingkat SMP (usia 12-15 tahun).
Tujuan Pembelajaran: {tp}
Konten/Materi: {content}
Jenis Asesmen: {instrument_label}

Jika Jenis Asesmen adalah 'Kuis / Survei Diagnostik' (Asesmen Awal), maka buatlah tepat 3 pertanyaan dengan format gradasi tingkat kesulitan (tanpa bobot nilai/points, tanpa Pilihan Ganda) dan wajib menyertakan field 'description' (deskripsi/instruksi tugas untuk siswa):
- Soal 1 (Level 1): Kemampuan Dasar/Prasyarat (Tipe Isian Singkat atau Uraian/Essay). Pertanyaan konsep dasar sekali sebelum memulai materi inti.
- Soal 2 (Level 2): Kemampuan Sesuai Target (Tipe Isian Singkat atau Uraian/Essay). Menguji pemahaman standar/inti dari materi.
- Soal 3 (Level 3): Kemampuan Di Atas Rata-rata/Pengayaan (Tipe Uraian/Essay). Berupa analisis, pemecahan masalah, atau troubleshooting tingkat tinggi.

Buatkan instrumen asesmen lengkap dalam format JSON sesuai jenis yang diminta.
PENTING: Setiap output JSON WAJIB menyertakan field 'description' di level root yang berisi deskripsi/instruksi tugas untuk siswa dalam bahasa Indonesia sederhana, ramah, dan mudah dipahami (1-3 kalimat).
PENTING: Gunakan bahasa yang sederhana, jelas, komunikatif, dan mudah dipahami oleh siswa SMP (usia 12-15 tahun). Hindari penggunaan istilah ilmiah atau akademis yang terlalu tinggi. Jika ada istilah teknis, berikan penjelasan singkat di dalam tanda kurung. Pertanyaan kuis/soal harus dikemas dengan kalimat yang ringkas dan bersahabat bagi anak SMP.
PENTING UNTUK EXIT TICKET: Pertanyaan refleksi wajib sangat pendek (maksimal 1 kalimat tanya sederhana per butir), santai, akrab, dan mudah dipahami siswa SMP. Hindari kalimat berbelit-belit, bertele-tele, atau teoretis.
PENTING UNTUK PETA KONSEP (concept_map): Hasilkan JSON dengan key: 'description' (deskripsi/instruksi pengerjaan untuk siswa), 'central_topic' (topik utama peta konsep), 'submission_mode' (nilai default 'hybrid'), 'instructions' (petunjuk pengerjaan peta konsep yang sangat sederhana, ramah siswa SMP, maks 2-3 kalimat), dan 'keywords' (array 6-8 kata kunci acak yang sangat familiar bagi siswa SMP terkait materi).
Kembalikan HANYA JSON tanpa markdown code fence.",

            'lkpd' => "Kamu adalah asisten cerdas perancang LKPD (Lembar Kerja Peserta Didik) kurikulum merdeka Indonesia.
Buatkan rancangan LKPD terstruktur dan profesional untuk mata pelajaran {subject}, Tujuan Pembelajaran {tp}, menggunakan model {pedagogical_model}.
Tulis dalam format HTML/Markdown bersih dengan komponen:
- Identitas LKPD
- Petunjuk Belajar
- Tugas & Langkah Kegiatan
- Pertanyaan Diskusi
- Kriteria Penilaian sederhana",

            'tp_direct' => "Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka tingkat SMP di Indonesia.
Tugasmu adalah merumuskan beberapa Tujuan Pembelajaran (TP) secara langsung berdasarkan Capaian Pembelajaran (CP) berikut:
- Capaian Pembelajaran (CP): {cp_desc}

Rumuskan minimal 3 hingga maksimal 5 kalimat Tujuan Pembelajaran (TP) yang jelas, spesifik, dan operasional (menggunakan Kata Kerja Operasional Bloom yang dapat diukur).
Setiap Tujuan Pembelajaran harus ditulis dalam satu kalimat ringkas dan berorientasi pada murid (misal: \"Peserta didik mampu menganalisis...\").

PENTING:
- Kembalikan HANYA berupa array JSON berisi string kalimat Tujuan Pembelajaran (TP) tersebut tanpa penjelasan pembuka atau penutup, dan tanpa markdown code fence (```json ... ```).
Contoh format output:
[
  \"Peserta didik mampu menganalisis...\",
  \"Peserta didik mampu menyajikan...\"
]",

            'tp_analysis' => "Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka tingkat SMP di Indonesia.
Tugasmu adalah menganalisis Capaian Pembelajaran (CP) berikut untuk mengekstrak Kompetensi dan Konten, serta merumuskan kalimat Tujuan Pembelajaran (TP) yang sesuai.

Capaian Pembelajaran (CP): {cp_desc}

Lakukan langkah analisis berikut:
1. Identifikasi kata kerja kompetensi (Competences) utama yang terdapat pada CP (misal: memahami, menganalisis, merancang). Tentukan tingkatan taksonominya (C1-C6).
2. Identifikasi ruang lingkup materi (Content) utama yang dibahas.
3. Rumuskan 1 kalimat Tujuan Pembelajaran (TP) utama yang memadukan Kompetensi dan Konten tersebut (misal: \"Peserta didik mampu menganalisis konsep data acak secara berkelompok\").

PENTING:
- Kembalikan HANYA berupa JSON valid tanpa penjelasan pembuka atau penutup, dan tanpa markdown code fence (```json ... ```).
Skema JSON wajib mengikuti struktur berikut secara presisi:
{
  \"competences\": [
    {\"verb\": \"menganalisis\", \"level\": \"C4\"},
    {\"verb\": \"menyajikan\", \"level\": \"C6\"}
  ],
  \"content\": \"Ruang lingkup materi CP...\",
  \"description\": \"Kalimat TP lengkap yang dirumuskan...\"
}",

            'tp_cross_element' => "Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka tingkat SMP di Indonesia.
Tugasmu adalah merumuskan satu Tujuan Pembelajaran (TP) yang terintegrasi lintas elemen berdasarkan beberapa Capaian Pembelajaran (CP) berikut:
{cps_desc}

Sintesiskan CP-CP di atas menjadi satu kalimat Tujuan Pembelajaran (TP) yang holistik, bermakna (meaningful), dan menghubungkan aspek-aspek kompetensi dari elemen-elemen tersebut secara logis.
Kalimat TP harus berorientasi pada murid (misal: \"Peserta didik mampu mengintegrasikan...\").

PENTING:
- Kembalikan HANYA berupa string kalimat Tujuan Pembelajaran (TP) tersebut secara langsung tanpa format JSON, tanpa penjelasan pembuka atau penutup.",
            
            'modul_ajar' => "Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka dengan konsep Pembelajaran Mendalam (Deep Learning) tingkat SMP di Indonesia.
Tugasmu adalah menyusun Modul Ajar / RPP secara sangat lengkap dan mendalam untuk mata pelajaran {subject}, kelas {class}, Tujuan Pembelajaran (TP) \"{tp}\", dengan fokus materi \"{material}\", dan menggunakan model pembelajaran \"{pedagogical_model}\".
Modul Ajar ini harus komprehensif, kaya konten, sangat detail, tetapi dikemas dengan bahasa yang sederhana, komunikatif, mudah dimengerti siswa SMP (usia 12-15 tahun), dan tidak menggunakan istilah ilmiah/akademis yang terlalu tinggi. Jika harus menggunakan istilah ilmiah khusus, sertakan penjelasan singkat yang mudah dalam tanda kurung.

Gunakan data Asesmen yang sudah ditentukan sebagai referensi:
- Asesmen Awal: {initial_assessments}
- Asesmen Formatif: {formative_assessments}
- Asesmen Sumatif: {summative_assessments}

Format output harus berupa JSON valid tanpa code fence (```json ... ```), mengandung key:
- alokasi_waktu: Alokasi waktu pembelajaran dalam JP (contoh: '4 JP'). Sesuaikan dengan kompleksitas materi. Teks biasa.
- jumlah_pertemuan: Hitung otomatis dari alokasi_waktu (Rumus: 2 JP = 1 Pertemuan). Jika 4 JP, maka isikan '2 Pertemuan'. Teks biasa.
- dimensi_profil: Array of strings berisi profil P5 yang sangat relevan dengan materi & kegiatan belajar. Pilih HANYA dari opsi baku berikut (maksimal 3): ["Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia", "Berkebinekaan Global", "Bergotong Royong", "Mandiri", "Bernalar Kritis", "Kreatif"].
- rencana_asesmen_awal: Rencana singkat asesmen awal berdasarkan referensi. Teks biasa.
- lingkungan_pembelajaran: Deskripsi lingkungan pembelajaran (contoh: 'Ruang Kelas dan Perpustakaan'). Teks biasa.
- kemitraan_pembelajaran: Bentuk kemitraan (contoh: 'Diskusi kelompok antar teman sebaya'). Teks biasa.
- pemanfaatan_digital: Penggunaan teknologi (contoh: 'Penggunaan tablet untuk mencari referensi'). Teks biasa.
- media_ilustrasi: Deskripsi gambar/media ilustrasi ajar (image prompt visual). WAJIB sertakan instruksi style: 'style ilustrasi gaya Flat 2D Vector minimalis'. Teks biasa.
- asesmen_formatif: Deskripsi/Rencana detail instrumen asesmen formatif berdasarkan referensi. Gunakan format HTML semantik.
- asesmen_sumatif: Deskripsi/Rencana detail instrumen asesmen sumatif berdasarkan referensi. Gunakan format HTML semantik.
- understanding: Kegiatan memahami (Understanding). Langkah operasional guru memicu rasa ingin tahu murid. Gunakan format HTML semantik. PENTING: Jika jumlah_pertemuan lebih dari 1, pisahkan skenario menggunakan <h3>Pertemuan 1</h3>, <h3>Pertemuan 2</h3>, dst.
- application: Kegiatan mengaplikasikan (Application). Skenario aktivitas praktis, studi kasus nyata. Gunakan format HTML semantik. PENTING: Pisahkan menggunakan <h3>Pertemuan 1</h3>, <h3>Pertemuan 2</h3>, dst, jika lebih dari 1 pertemuan.
- reflection: Kegiatan merefleksikan (Reflection). Aktivitas metakognisi murid. Gunakan format HTML semantik. PENTING: Pisahkan menggunakan <h3>Pertemuan 1</h3>, <h3>Pertemuan 2</h3>, dst, jika lebih dari 1 pertemuan.
- lkpd: Lembar Kerja Peserta Didik lengkap dengan petunjuk, tugas, refleksi, dan rubrik. Gunakan format HTML semantik.

===== ATURAN FORMAT HTML WAJIB =====
Field yang wajib menggunakan HTML (understanding, application, reflection, lkpd) harus ditulis menggunakan HTML semantik yang bersih dan profesional.
- Gunakan <h3> untuk memisahkan setiap Pertemuan.
- <h2> untuk judul utama
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
- Output HANYA berupa objek JSON valid dengan tepat 14 key di atas tanpa markdown code fence."
        ];

        return $fallbacks[$key] ?? "Buatkan rancangan untuk {tp} pada mata pelajaran {subject}.";
    }
}
