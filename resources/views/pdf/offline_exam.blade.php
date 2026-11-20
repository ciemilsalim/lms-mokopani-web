<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }} - {{ $subject_name }} {{ $class_name }}</title>
    <style>
        @page {
            margin: 20mm 15mm 20mm 20mm;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 10.5pt;
            color: #1e293b;
            line-height: 1.4;
            margin: 0;
            padding: 0;
        }

        /* Kop Surat */
        .kop-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
        }
        .kop-table td {
            vertical-align: middle;
        }
        .kop-logo {
            width: 75px;
            text-align: center;
        }
        .kop-logo img {
            max-width: 70px;
            max-height: 70px;
        }
        .kop-text {
            text-align: center;
        }
        .kop-text .instansi-1 {
            font-size: 11pt;
            font-weight: bold;
            margin: 0;
            color: #0f172a;
        }
        .kop-text .instansi-2 {
            font-size: 12pt;
            font-weight: bold;
            margin: 0;
            color: #0f172a;
        }
        .kop-text .school-name {
            font-size: 14pt;
            font-weight: 900;
            margin: 2px 0;
            color: #0f172a;
            letter-spacing: 0.5px;
        }
        .kop-text .school-meta {
            font-size: 8.5pt;
            color: #475569;
            margin: 0;
            font-style: italic;
        }
        .kop-divider {
            border-top: 3px double #0f172a;
            margin-top: 6px;
            margin-bottom: 15px;
        }

        /* Exam Title & Period */
        .exam-title-box {
            text-align: center;
            margin-bottom: 12px;
        }
        .exam-title-box h1 {
            font-size: 12pt;
            font-weight: bold;
            margin: 0;
            text-transform: uppercase;
            text-decoration: underline;
            color: #0f172a;
        }
        .exam-title-box p {
            font-size: 9.5pt;
            font-weight: bold;
            margin: 2px 0 0 0;
            color: #334155;
        }

        /* Identity Box Table */
        .identity-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            font-size: 9.5pt;
        }
        .identity-table td {
            padding: 3px 6px;
            vertical-align: top;
        }
        .identity-table .label {
            font-weight: bold;
            width: 18%;
            color: #334155;
        }
        .identity-table .dots {
            border-bottom: 1px dotted #94a3b8;
            min-width: 150px;
            display: inline-block;
        }

        /* Instructions */
        .instructions-box {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 8px 12px;
            margin-bottom: 16px;
            font-size: 8.5pt;
            color: #334155;
        }
        .instructions-box strong {
            display: block;
            margin-bottom: 4px;
            font-size: 9pt;
            color: #0f172a;
        }
        .instructions-box ol {
            margin: 0;
            padding-left: 18px;
        }
        .instructions-box li {
            margin-bottom: 2px;
        }

        /* Questions Section */
        .section-header {
            font-size: 10.5pt;
            font-weight: bold;
            color: #0f172a;
            background-color: #f1f5f9;
            padding: 4px 8px;
            border-left: 3px solid #0f172a;
            margin-top: 14px;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        .section-sub {
            font-size: 8.5pt;
            font-style: italic;
            color: #64748b;
            margin-bottom: 10px;
        }

        .question-item {
            margin-bottom: 12px;
            page-break-inside: avoid;
        }
        .question-stem {
            font-weight: normal;
            margin-bottom: 4px;
        }
        .question-num {
            font-weight: bold;
            display: inline-block;
            width: 22px;
        }
        .options-table {
            width: 100%;
            border-collapse: collapse;
            margin-left: 22px;
            margin-top: 2px;
        }
        .options-table td {
            padding: 2px 4px;
            vertical-align: top;
            font-size: 10pt;
        }
        .opt-letter {
            width: 20px;
            font-weight: bold;
        }

        .essay-space {
            margin-left: 22px;
            margin-top: 6px;
            margin-bottom: 10px;
            border-bottom: 1px dashed #cbd5e1;
            height: 45px;
        }

        /* Page Break for Lampiran */
        .page-break {
            page-break-before: always;
        }

        /* Lampiran Header & Tables */
        .lampiran-header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 6px;
            margin-bottom: 12px;
        }
        .lampiran-header h2 {
            font-size: 11pt;
            font-weight: bold;
            margin: 0;
            color: #0f172a;
            text-transform: uppercase;
        }
        .lampiran-header h3 {
            font-size: 12pt;
            font-weight: 900;
            margin: 2px 0 0 0;
            color: #0f172a;
            text-transform: uppercase;
        }
        .lampiran-meta {
            font-size: 9pt;
            margin-bottom: 12px;
            color: #334155;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            font-size: 8.5pt;
        }
        .data-table th, .data-table td {
            border: 1px solid #94a3b8;
            padding: 4px 6px;
            vertical-align: top;
        }
        .data-table th {
            background-color: #f1f5f9;
            color: #0f172a;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
        }
        .text-center {
            text-align: center;
        }
        .font-bold {
            font-weight: bold;
        }

        /* Signatures */
        .signatures-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 25px;
            font-size: 9.5pt;
        }
        .signatures-table td {
            width: 50%;
            text-align: center;
            vertical-align: top;
        }
        .sig-space {
            height: 50px;
        }
    </style>
</head>
<body>

    <!-- 1. KOP SURAT SEKOLAH -->
    <table class="kop-table">
        <tr>
            @if(!empty($school_logo))
                <td class="kop-logo">
                    <img src="{{ $school_logo }}" alt="Logo Sekolah">
                </td>
            @endif
            <td class="kop-text">
                <p class="instansi-1">PEMERINTAH KABUPATEN BUOL</p>
                <p class="instansi-2">DINAS PENDIDIKAN DAN KEBUDAYAAN</p>
                <p class="school-name">{{ strtoupper($school_name) }}</p>
                <p class="school-meta">{{ $school_address }} | Telp: {{ $school_phone }} | Email: {{ $school_email }}</p>
            </td>
        </tr>
    </table>
    <div class="kop-divider"></div>

    <!-- 2. JUDUL LEMBAR SOAL -->
    <div class="exam-title-box">
        <h1>{{ $title }}</h1>
        <p>TAHUN AJARAN {{ strtoupper($period) }}</p>
    </div>

    <!-- 3. IDENTITAS SOAL & SISWA -->
    <table class="identity-table">
        <tr>
            <td class="label">Mata Pelajaran</td>
            <td>: <strong>{{ $subject_name }}</strong></td>
            <td class="label">Hari / Tanggal</td>
            <td>: .................................................</td>
        </tr>
        <tr>
            <td class="label">Kelas / Rombel</td>
            <td>: {{ $class_name }}</td>
            <td class="label">Alokasi Waktu</td>
            <td>: {{ $time_limit }}</td>
        </tr>
        <tr>
            <td class="label">Nama Peserta</td>
            <td>: .................................................</td>
            <td class="label">Nomor Absen</td>
            <td>: .................................................</td>
        </tr>
    </table>

    <!-- 4. PETUNJUK UMUM -->
    @if(!empty($instructions))
        <div class="instructions-box">
            <strong>PETUNJUK UMUM:</strong>
            <ol>
                @foreach($instructions as $inst)
                    <li>{{ $inst }}</li>
                @endforeach
            </ol>
        </div>
    @endif

    <!-- 5. DAFTAR BUTIR SOAL -->
    @if(!empty($mc_questions))
        <div class="section-header">BAGIAN I: PILIHAN GANDA</div>
        <div class="section-sub">Pilihlah salah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf A, B, C, atau D!</div>

        @foreach($mc_questions as $q)
            <div class="question-item">
                <div class="question-stem">
                    <span class="question-num">{{ $q['number'] }}.</span>
                    {!! nl2br(e($q['question'])) !!}
                </div>
                @if(!empty($q['options']) && is_array($q['options']))
                    <table class="options-table">
                        <tr>
                            <td class="opt-letter">A.</td>
                            <td style="width: 48%;">{{ $q['options']['A'] ?? '-' }}</td>
                            <td class="opt-letter">B.</td>
                            <td style="width: 48%;">{{ $q['options']['B'] ?? '-' }}</td>
                        </tr>
                        <tr>
                            <td class="opt-letter">C.</td>
                            <td>{{ $q['options']['C'] ?? '-' }}</td>
                            <td class="opt-letter">D.</td>
                            <td>{{ $q['options']['D'] ?? '-' }}</td>
                        </tr>
                    </table>
                @endif
            </div>
        @endforeach
    @endif

    @if(!empty($essay_questions))
        <div class="section-header">BAGIAN II: ESAI / URAIAN</div>
        <div class="section-sub">Jawablah pertanyaan-pertanyaan berikut dengan jelas, sistematis, dan tepat!</div>

        @foreach($essay_questions as $q)
            <div class="question-item">
                <div class="question-stem">
                    <span class="question-num">{{ $q['number'] }}.</span>
                    <strong>[Skor Maks: {{ $q['score'] ?? 10 }}]</strong> {!! nl2br(e($q['question'])) !!}
                </div>
                <div class="essay-space"></div>
            </div>
        @endforeach
    @endif

    <!-- ============================================================== -->
    <!-- 6. LEMBAR BERIKUTNYA: LAMPIRAN KISI-KISI SOAL & KUNCI JAWABAN  -->
    <!-- ============================================================== -->
    <div class="page-break"></div>

    <div class="lampiran-header">
        <h2>LAMPIRAN DOKUMEN PENDIDIK (PEGANGAN GURU)</h2>
        <h3>KISI-KISI SOAL, KUNCI JAWABAN & RUBRIK PENILAIAN</h3>
    </div>

    <div class="lampiran-meta">
        <strong>Mata Pelajaran:</strong> {{ $subject_name }} &nbsp;|&nbsp; 
        <strong>Kelas:</strong> {{ $class_name }} &nbsp;|&nbsp; 
        <strong>Tujuan Pembelajaran:</strong> 
        @if(!empty($tp_allocations) && count($tp_allocations) > 1)
            [{{ $tp_code }}] <em>({{ count($tp_allocations) }} TP Diujikan &mdash; Soal Dibagi Rata)</em>
        @else
            [{{ $tp_code }}] {{ $tp_description }}
        @endif
    </div>

    <!-- TABEL 1: KISI-KISI SOAL (BLUEPRINT) -->
    <div style="font-size: 9.5pt; font-weight: bold; margin-bottom: 4px; color: #0f172a;">A. KISI-KISI PENYUSUNAN SOAL (ASSESSMENT BLUEPRINT)</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 15%;">Kode TP</th>
                <th style="width: 25%;">Lingkup Materi</th>
                <th style="width: 35%;">Indikator Ketercapaian Soal</th>
                <th style="width: 12%;">Bentuk</th>
                <th style="width: 8%;">Level</th>
            </tr>
        </thead>
        <tbody>
            @foreach($blueprint as $bp)
                <tr>
                    <td class="text-center font-bold">{{ $bp['number'] ?? '-' }}</td>
                    <td class="font-bold">{{ $bp['tp_code'] ?? $tp_code }}</td>
                    <td>{{ $bp['material'] ?? '-' }}</td>
                    <td>{{ $bp['indicator'] ?? '-' }}</td>
                    <td class="text-center">{{ $bp['question_type'] ?? '-' }}</td>
                    <td class="text-center font-bold">{{ $bp['cognitive_level'] ?? '-' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- TABEL 2: KUNCI JAWABAN & RUBRIK PENSKORAN -->
    <div style="font-size: 9.5pt; font-weight: bold; margin-top: 14px; margin-bottom: 4px; color: #0f172a;">B. KUNCI JAWABAN DAN PEDOMAN PENSKORAN</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 13%;">Bentuk</th>
                <th style="width: 20%;">Kunci / Kriteria</th>
                <th style="width: 54%;">Pembahasan Rinci & Pedoman Rubrik</th>
                <th style="width: 8%;">Skor Maks</th>
            </tr>
        </thead>
        <tbody>
            @foreach($answer_keys as $ak)
                <tr>
                    <td class="text-center font-bold">{{ $ak['number'] ?? '-' }}</td>
                    <td class="text-center">{{ $ak['question_type'] ?? '-' }}</td>
                    <td style="color: #0f172a; font-size: 8.5pt;">{!! nl2br(e($ak['answer'] ?? '-')) !!}</td>
                    <td style="font-size: 8pt; line-height: 1.35;">{!! nl2br(e($ak['explanation'] ?? '-')) !!}</td>
                    <td class="text-center font-bold">{{ $ak['max_score'] ?? '-' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div style="font-size: 8.5pt; font-style: italic; margin-top: 4px; color: #475569;">
        <strong>Pedoman Konversi Nilai:</strong> Nilai Akhir = (Total Skor Perolehan / {{ $total_score }}) &times; 100
    </div>

    <!-- TANDA TANGAN KEPALA SEKOLAH & GURU MAPEL -->
    <table class="signatures-table">
        <tr>
            <td>
                Mengetahui,<br>
                Kepala Sekolah
                <div class="sig-space"></div>
                <strong>{{ $headmaster_name }}</strong><br>
                NIP. {{ $headmaster_nip }}
            </td>
            <td>
                Buol, {{ date('d F Y') }}<br>
                Guru Mata Pelajaran
                <div class="sig-space"></div>
                <strong>{{ $teacher_name }}</strong><br>
                NIP. {{ $teacher_nip }}
            </td>
        </tr>
    </table>

</body>
</html>
