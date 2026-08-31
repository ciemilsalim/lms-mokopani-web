<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Rapor {{ $subject?->name }} - {{ $schoolClass?->name }}</title>
    <style>
        @page {
            margin: 12mm 12mm 16mm;
        }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 9px;
            color: #1a1a2e;
            line-height: 1.5;
        }

        .page-frame {
            border: 2px solid #1a1a2e;
            padding: 8px 10px 12px;
        }

        .kop {
            text-align: center;
            padding-bottom: 8px;
            margin-bottom: 6px;
            border-bottom: 3px double #1a1a2e;
        }
        .kop .logo {
            max-height: 50px;
            margin-bottom: 3px;
        }
        .kop h1 {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0 0 1px;
            letter-spacing: 1.5px;
        }
        .kop .address {
            font-size: 8px;
            color: #444;
            margin: 1px 0;
        }
        .kop .contact {
            font-size: 7.5px;
            color: #666;
            margin: 1px 0;
        }

        .title-section {
            text-align: center;
            margin: 6px 0 4px;
        }
        .title-section h2 {
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
        }
        .title-section .sub {
            font-size: 10px;
            font-weight: bold;
            color: #333;
            margin: 1px 0;
        }
        .title-section .kurikulum {
            font-size: 7.5px;
            color: #666;
            margin: 0;
        }

        .student-card {
            border: 1px solid #333;
            padding: 4px 8px;
            margin: 5px 0 6px;
            background: #fafafa;
        }
        .student-card table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5px;
        }
        .student-card table td {
            padding: 1px 3px;
            vertical-align: top;
        }
        .student-card table td.label {
            width: 85px;
            font-weight: bold;
        }

        .assessment-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
            margin: 4px 0;
        }
        .assessment-table thead th {
            background-color: #1a1a2e;
            color: #fff;
            padding: 4px 2px;
            text-align: center;
            font-weight: bold;
            font-size: 7px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border: 1px solid #1a1a2e;
        }
        .assessment-table tbody td {
            padding: 2px 3px;
            border: 1px solid #ccc;
            text-align: center;
            vertical-align: middle;
        }
        .assessment-table tbody tr:nth-child(even) {
            background-color: #f5f6fa;
        }
        .assessment-table tbody td.left {
            text-align: left;
        }
        .assessment-table tfoot td {
            padding: 3px 5px;
            border: 1px solid #ccc;
            font-weight: bold;
            font-size: 7.5px;
        }
        .assessment-table tfoot .label-cell {
            text-align: right;
            padding-right: 6px;
            background-color: #eef2ff;
        }
        .score-pass {
            color: #059669;
            font-weight: bold;
        }
        .score-fail {
            color: #dc2626;
            font-weight: bold;
        }

        .summary-row {
            margin: 4px 0;
            padding: 3px 6px;
            border: 1px solid #ccc;
            background: #fafafa;
            font-size: 8px;
        }
        .summary-row table {
            width: 100%;
            border-collapse: collapse;
        }
        .summary-row table td {
            padding: 1px 4px;
            vertical-align: middle;
        }
        .summary-row .label-sm {
            font-size: 6.5px;
            text-transform: uppercase;
            color: #666;
            letter-spacing: 0.3px;
        }
        .summary-row .value {
            font-size: 10px;
            font-weight: bold;
        }

        .attendance-row {
            margin: 3px 0 4px;
            font-size: 8px;
            padding: 2px 6px;
            border: 1px solid #ddd;
            background: #f8f8fc;
        }
        .attendance-row span {
            margin-right: 10px;
        }
        .attendance-row .att-label {
            font-weight: bold;
        }

        .description-box {
            border: 1px solid #ccc;
            background: #f8f8fc;
            padding: 4px 6px;
            margin: 4px 0;
            font-size: 8px;
        }
        .description-box .desc-label {
            font-weight: bold;
            font-size: 7.5px;
            display: block;
            margin-bottom: 1px;
        }
        .description-box .desc-text {
            font-style: italic;
            line-height: 1.4;
        }

        .signatures {
            margin-top: 18px;
            display: flex;
            justify-content: space-between;
            padding: 0 10px;
        }
        .signatures .sig-box {
            text-align: center;
            width: 38%;
        }
        .signatures .sig-box .sig-label {
            font-size: 8px;
            margin: 1px 0;
        }
        .signatures .sig-box .sig-role {
            font-weight: bold;
            font-size: 8.5px;
            margin: 1px 0;
        }
        .signatures .sig-box .sig-line {
            margin: 30px auto 2px;
            border-top: 1px solid #1a1a2e;
            padding-top: 3px;
            width: 155px;
        }
        .signatures .sig-box .sig-name {
            font-size: 8.5px;
            font-weight: bold;
        }
        .signatures .sig-box .sig-nip {
            font-size: 7px;
            color: #555;
        }

        .footer {
            margin-top: 10px;
            text-align: center;
            font-size: 6.5px;
            color: #999;
            border-top: 1px solid #ddd;
            padding-top: 4px;
        }

        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>

@php
    $logo = school_logo_url();
    $kktp = $kktp ?? 70;
@endphp

<div class="page-frame">

    {{-- ======================== KOP ======================== --}}
    <div class="kop">
        @if($logo)
            <img src="{{ $logo }}" alt="Logo" class="logo">
        @endif
        <h1>{{ $schoolName }}</h1>
        @if($schoolAddress)
            <div class="address">{{ $schoolAddress }}</div>
        @endif
        @if($schoolPhone || $schoolEmail)
            <div class="contact">
                @if($schoolPhone) Telp. {{ $schoolPhone }} @endif
                @if($schoolPhone && $schoolEmail) &nbsp;|&nbsp; @endif
                @if($schoolEmail) Email: {{ $schoolEmail }} @endif
            </div>
        @endif
    </div>

    {{-- ======================== JUDUL ======================== --}}
    <div class="title-section">
        <h2>Laporan Hasil Asesmen Akhir</h2>
        <div class="sub">{{ $subject?->name }}</div>
        <div class="kurikulum">Kurikulum Merdeka</div>
    </div>

    {{-- ======================== PER SISWA ======================== --}}
    @foreach($reportData as $idx => $student)

    @if($idx > 0)
    <div class="page-break"></div>
    @endif

    {{-- Identitas Siswa --}}
    <div class="student-card">
        <table>
            <tr>
                <td class="label">Nama Siswa</td>
                <td>: <strong>{{ $student['name'] }}</strong></td>
                <td class="label">Kelas</td>
                <td>: <strong>{{ $schoolClass?->name }}</strong></td>
            </tr>
            <tr>
                <td class="label">NIS</td>
                <td>: <strong>{{ $student['nis'] }}</strong></td>
                <td class="label">Semester</td>
                <td>: <strong>{{ $period }}</strong></td>
            </tr>
            <tr>
                <td class="label">Mata Pelajaran</td>
                <td>: <strong>{{ $subject?->name }}</strong></td>
                <td class="label">Guru Pengampu</td>
                <td>: <strong>{{ $teacher?->teacher?->name ?? '-' }}</strong></td>
            </tr>
        </table>
    </div>

    {{-- Tabel Nilai --}}
    <table class="assessment-table">
        <thead>
            <tr>
                <th style="width:25px;">No</th>
                <th style="width:55px;">Kode TP</th>
                <th>Deskripsi Tujuan Pembelajaran</th>
                <th style="width:38px;">Nilai</th>
                <th style="width:34px;">KKTP</th>
                <th style="width:45px;">Ket.</th>
            </tr>
        </thead>
        <tbody>
            @foreach($student['tp_scores'] as $i => $tp)
            @php
                $scoreVal = $tp['score'];
                $passed = ($scoreVal !== null && $scoreVal !== '') ? ($scoreVal >= $kktp) : false;
                $descText = $tp['description'] ?? '-';
            @endphp
            <tr>
                <td>{{ $i + 1 }}</td>
                <td><strong>{{ $tp['code'] }}</strong></td>
                <td class="left">{{ $descText }}</td>
                <td class="{{ $scoreVal !== null ? ($passed ? 'score-pass' : 'score-fail') : '' }}">{{ $scoreVal !== null ? $scoreVal : '-' }}</td>
                <td>{{ $kktp }}</td>
                <td>
                    <span style="font-size:6.5px; text-transform:uppercase; font-weight:bold; color:{{ $scoreVal !== null ? ($passed ? '#059669' : '#dc2626') : '#666' }};">
                        {{ $scoreVal !== null ? ($passed ? 'Tuntas' : 'Blm Tuntas') : 'Belum Diuji' }}
                    </span>
                </td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3" class="label-cell">Rata-rata Nilai Sumatif (TP)</td>
                <td class="{{ ($student['average'] ?? $student['final_score']) >= $kktp ? 'score-pass' : 'score-fail' }}" style="text-align:center; background:#eef2ff;">
                    {{ $student['average'] ?? $student['final_score'] }}
                </td>
                <td style="text-align:center; background:#eef2ff;">{{ $kktp }}</td>
                <td style="text-align:center; background:#eef2ff;">
                    <span style="font-size:6.5px; text-transform:uppercase; font-weight:bold; color:{{ ($student['average'] ?? $student['final_score']) >= $kktp ? '#059669' : '#dc2626' }};">
                        {{ ($student['average'] ?? $student['final_score']) >= $kktp ? 'Tuntas' : 'Blm Tuntas' }}
                    </span>
                </td>
            </tr>
            @if(isset($student['sas_score']) && $student['sas_score'] !== null && $student['sas_score'] !== '')
            <tr>
                <td colspan="3" class="label-cell">Nilai Sumatif Akhir Semester (SAS)</td>
                <td class="{{ $student['sas_score'] >= $kktp ? 'score-pass' : 'score-fail' }}" style="text-align:center; background:#f1f5f9;">
                    {{ $student['sas_score'] }}
                </td>
                <td style="text-align:center; background:#f1f5f9;">{{ $kktp }}</td>
                <td style="text-align:center; background:#f1f5f9;">
                    <span style="font-size:6.5px; text-transform:uppercase; font-weight:bold; color:{{ $student['sas_score'] >= $kktp ? '#059669' : '#dc2626' }};">
                        {{ $student['sas_score'] >= $kktp ? 'Tuntas' : 'Blm Tuntas' }}
                    </span>
                </td>
            </tr>
            @endif
            <tr>
                <td colspan="3" class="label-cell">Nilai Akhir (Rapor)</td>
                <td class="{{ $student['final_score'] >= $kktp ? 'score-pass' : 'score-fail' }}" style="text-align:center; background:#fef3c7;">
                    <strong>{{ $student['final_score'] }}</strong>
                </td>
                <td style="text-align:center; background:#fef3c7;">{{ $kktp }}</td>
                <td style="text-align:center; background:#fef3c7;">
                    <span style="font-size:6.5px; text-transform:uppercase; font-weight:bold; color:{{ $student['final_score'] >= $kktp ? '#059669' : '#dc2626' }};">
                        {{ $student['final_score'] >= $kktp ? 'Tuntas' : 'Blm Tuntas' }}
                    </span>
                </td>
            </tr>
        </tfoot>
    </table>

    {{-- Ringkasan Nilai --}}
    <div class="summary-row">
        <table>
            <tr>
                <td style="width:20%; text-align:center;">
                    <div class="label-sm">Nilai Akhir</div>
                    <div class="value" style="color:{{ $student['final_score'] >= $kktp ? '#059669' : '#dc2626' }};">
                        {{ $student['final_score'] }}
                    </div>
                </td>
                <td style="width:15%; text-align:center;">
                    <div class="label-sm">KKTP</div>
                    <div class="value">{{ $kktp }}</div>
                </td>
                <td style="width:20%; text-align:center;">
                    <div class="label-sm">Status</div>
                    <div class="value" style="font-size:9px; color:{{ $student['final_score'] >= $kktp ? '#059669' : '#dc2626' }};">
                        {{ $student['final_score'] >= $kktp ? 'Tuntas' : 'Belum Tuntas' }}
                    </div>
                </td>
                <td style="width:20%; text-align:center;">
                    <div class="label-sm">Pertemuan</div>
                    <div class="value">{{ $student['total_meetings'] }}x</div>
                </td>
                <td style="width:25%; text-align:center;">
                    <div class="label-sm">Presensi</div>
                    <div class="value" style="font-size:9px;">
                        H: {{ $student['total_meetings'] - $student['sick'] - $student['permit'] - $student['absent'] }}x
                    </div>
                </td>
            </tr>
        </table>
    </div>

    {{-- Kehadiran detail --}}
    <div class="attendance-row">
        <span class="att-label">Rincian Kehadiran:</span>
        <span>Total: {{ $student['total_meetings'] }} pertemuan</span>
        <span style="color:#059669;">Hadir: {{ $student['total_meetings'] - $student['sick'] - $student['permit'] - $student['absent'] }}x</span>
        <span style="color:#0369a1;">Sakit: {{ $student['sick'] }}x</span>
        <span style="color:#d97706;">Izin: {{ $student['permit'] }}x</span>
        <span style="color:#dc2626;">Alpa: {{ $student['absent'] }}x</span>
    </div>

    {{-- Deskripsi Capaian Kompetensi --}}
    <div class="description-box">
        <span class="desc-label">Deskripsi Capaian Kompetensi:</span>
        <span class="desc-text">{{ $student['description'] ?: 'Belum ada data penilaian yang cukup untuk mendeskripsikan capaian kompetensi siswa.' }}</span>
    </div>

    {{-- ======================== P5 ======================== --}}
    @if(isset($p5Structure) && count($p5Structure) > 0)
    <div style="margin:6px 0 4px;">
        <div style="font-size:9px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px; padding:2px 4px; background:#1a1a2e; color:#fff; text-align:center;">
            Projek Penguatan Profil Pelajar Pancasila (P5)
        </div>

        @foreach($p5Structure as $p5item)
        @php
            $project = $p5item['project'];
            $dimensiList = $p5item['dimensi'];
        @endphp
        <div style="margin:4px 0 3px; padding:2px 4px; background:#eef2ff; border:1px solid #ccc; font-size:8px;">
            <strong>{{ $project->judul }}</strong>
            @if($project->tema)
                <span style="color:#666;"> — Tema: {{ $project->tema }}</span>
            @endif
        </div>

        @foreach($dimensiList as $dimensi)
        <table class="assessment-table" style="margin:1px 0 3px;">
            <thead>
                <tr>
                    <th style="width:20px;">No</th>
                    <th style="width:90px;">Dimensi</th>
                    <th style="width:100px;">Elemen</th>
                    <th>Sub-Elemen</th>
                    <th style="width:40px;">Nilai</th>
                    <th style="width:80px;">Catatan</th>
                </tr>
            </thead>
            <tbody>
                @php
                    $rowNum = 1;
                @endphp
                @foreach($dimensi->elements as $element)
                    @foreach($element->subElements as $subElement)
                    @php
                        $scoreKey = $project->id . '-' . $subElement->id;
                        $scoreRow = $student['p5_scores']->get($scoreKey);
                        $nilai = $scoreRow?->nilai ?? '-';
                        $catatan = $scoreRow?->catatan ?? '';
                        $nilaiLabels = ['BB' => 'BB', 'MB' => 'MB', 'BSH' => 'BSH', 'SB' => 'SB'];
                        $nilaiColors = ['BB' => '#dc2626', 'MB' => '#d97706', 'BSH' => '#059669', 'SB' => '#1d4ed8'];
                        $nilaiFull = ['BB' => 'Belum Berkembang', 'MB' => 'Mulai Berkembang', 'BSH' => 'Berkembang Sesuai Harapan', 'SB' => 'Sangat Berkembang'];
                    @endphp
                    <tr>
                        <td>{{ $rowNum++ }}</td>
                        <td class="left" style="font-size:7px;">{{ $dimensi->nama }}</td>
                        <td class="left" style="font-size:7px;">{{ $element->nama }}</td>
                        <td class="left" style="font-size:7px;">{{ $subElement->nama }}</td>
                        <td style="color:{{ $nilai !== '-' ? ($nilaiColors[$nilai] ?? '#333') : '#999' }}; font-weight:bold;">
                            {{ $nilai }}
                        </td>
                        <td style="font-size:6.5px; text-align:left; max-width:80px; word-wrap:break-word;">
                            {{ $catatan ?: '-' }}
                        </td>
                    </tr>
                    @endforeach
                @endforeach
            </tbody>
        </table>
        @endforeach
        @endforeach
    </div>
    @endif

    @endforeach

    {{-- ======================== TANDA TANGAN ======================== --}}
    <div class="signatures">
        <div class="sig-box">
            <div class="sig-label">Mengetahui,</div>
            <div class="sig-role">Kepala Sekolah</div>
            <div class="sig-line"></div>
            <div class="sig-name">{{ $headmasterName ?: '...................................................' }}</div>
            @if($headmasterNip)
                <div class="sig-nip">NIP. {{ $headmasterNip }}</div>
            @endif
        </div>
        <div class="sig-box">
            <div class="sig-label">{{ \Carbon\Carbon::now()->locale('id')->isoFormat('D MMMM Y') }}</div>
            <div class="sig-role">Guru Mata Pelajaran</div>
            <div class="sig-line"></div>
            <div class="sig-name">{{ $teacher?->teacher?->name ?? '...................................................' }}</div>
            @if($teacher?->teacher?->nip ?? null)
                <div class="sig-nip">NIP. {{ $teacher->teacher->nip }}</div>
            @endif
        </div>
    </div>

    {{-- ======================== FOOTER ======================== --}}
    <div class="footer">
        Dokumen ini digenerate secara otomatis dari sistem {{ $schoolName }} &mdash; LMS Mokopani
    </div>

</div>{{-- /.page-frame --}}

</body>
</html>
