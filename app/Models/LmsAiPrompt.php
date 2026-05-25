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
            'orchestrator_draft' => "Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka dengan konsep Pembelajaran Mendalam (Deep Learning) tingkat SMP di Indonesia. Tugasmu adalah merancang pembelajaran mendalam yang komprehensif, kaya konten, sangat detail, dan tidak bersifat umum/generik berdasarkan mata pelajaran {subject}, kelas {class}, model pedagogis {pedagogical_model}, dan Tujuan Pembelajaran (TP): {tp}.
Format output harus berupa JSON valid tanpa code fence, mengandung key:
- title: Judul materi yang spesifik, kreatif, dan secara langsung mencerminkan kompetensi & materi inti dari TP.
- content: Uraian materi utama (lengkap, terstruktur, ilmiah, minimal 4-5 paragraf panjang, menyertakan definisi formal, contoh analogi kehidupan nyata, rumus/prinsip jika ada, dan pembahasan mendalam, format HTML/Markdown bersih).
- image_prompt: Deskripsi detail (minimal 2 kalimat) ilustrasi visual atau infografis yang relevan.
- understanding: Kegiatan memahami (langkah operasional guru memicu rasa ingin tahu murid dengan stimulus/pertanyaan pemantik, eksplorasi mandiri murid, dan diskusi kelas terarah, minimal 4 kalimat detail).
- application: Kegiatan mengaplikasikan (skenario aktivitas praktis, studi kasus nyata, atau mini-projek kelompok, minimal 4 kalimat detail).
- reflection: Kegiatan merefleksikan (aktivitas metakognisi murid menilai pemahaman, miskonsepsi, dan relevansi, minimal 4 kalimat detail).
- lkpd: Lembar Kerja Peserta Didik lengkap dengan identitas, tujuan, petunjuk belajar, tugas terperinci, pertanyaan eksploratif, refleksi, dan rubrik sederhana (HTML/Markdown sangat rapi dan profesional).
- initial_assessment: {stimulus, instrument_type, title, questions, levels, kktp}
- formative_assessment: Array dari instrumen formative
- summative_assessment: Array dari instrumen summative",
            
            'experiences' => "Kamu adalah asisten cerdas dan pakar Kurikulum Merdeka dengan konsep Pembelajaran Mendalam (Deep Learning) tingkat SMP di Indonesia.
Mata Pelajaran: {subject}
Tujuan Pembelajaran: {tp}
Konten/Materi: {content}
Model Pedagogis: {pedagogical_model}

Buatkan rancangan 3 tahap kegiatan pembelajaran yang sangat menarik, detail, kontekstual, dan sesuai Kurikulum Merdeka dengan prinsip Pembelajaran Mendalam:
1. **Tahap Memahami (Understanding):** Skenario detail langkah demi langkah bagaimana guru memberikan stimulus menantang, mengajukan pertanyaan pemantik eksploratif, serta bagaimana murid mengeksplorasi konsep dasar secara aktif dan berkolaborasi. (minimal 4-5 kalimat konkret dan praktis).
2. **Tahap Mengaplikasi (Application):** Skenario pengerjaan aktivitas/praktik nyata, studi kasus konkret, atau mini-projek kelompok di mana murid secara langsung menerapkan teori ke dalam pemecahan masalah riil. (minimal 4-5 kalimat konkret dan praktis).
3. **Tahap Merefleksi (Reflection):** Aktivitas metakognitif di mana murid mengidentifikasi miskonsepsi mereka sendiri, mengevaluasi proses belajar kelompok/mandiri, serta merumuskan tindak lanjut konkret. (minimal 4-5 kalimat konkret dan praktis).

PENTING:
- Berikan jawaban langsung untuk setiap tahap (BUKAN dalam format JSON).
- Setiap tahap harus berupa paragraf panjang yang spesifik, praktis, dan langsung actionable untuk guru (hindari kalimat umum/generik).
- Gunakan format header ## persis seperti ini:
## Memahami
[isi kegiatan memahami]
## Mengaplikasi
[isi kegiatan mengaplikasi]
## Merefleksi
[isi kegiatan merefleksi]",

            'assessment' => "Kamu adalah asisten cerdas perancang instrumen asesmen Kurikulum Merdeka Indonesia.
Tujuan Pembelajaran: {tp}
Konten/Materi: {content}
Jenis Instrumen: {instrument_label}

Buatkan instrumen asesmen lengkap dalam format JSON sesuai jenis yang diminta. Kembalikan HANYA JSON tanpa markdown code fence.",

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
- Kembalikan HANYA berupa string kalimat Tujuan Pembelajaran (TP) tersebut secara langsung tanpa format JSON, tanpa penjelasan pembuka atau penutup."
        ];

        return $fallbacks[$key] ?? "Buatkan rancangan untuk {tp} pada mata pelajaran {subject}.";
    }
}
