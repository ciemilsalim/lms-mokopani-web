<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan Hasil Belajar (Rapor) - {{ $report->student?->name }}</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 11pt;
            color: #1e293b;
            line-height: 1.5;
            margin: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .header h2 {
            margin: 0;
            font-size: 14pt;
            text-transform: uppercase;
            color: #0f172a;
        }
        .header p {
            margin: 2px 0 0 0;
            font-size: 10pt;
            color: #475569;
        }
        .info-table {
            width: 100%;
            margin-bottom: 20px;
            border-collapse: collapse;
        }
        .info-table td {
            padding: 4px 8px;
            font-size: 10pt;
        }
        .info-table td.label {
            font-weight: bold;
            width: 15%;
            color: #334155;
        }
        .section-title {
            font-size: 11pt;
            font-weight: bold;
            color: #1e1b4b;
            background-color: #f1f5f9;
            padding: 6px 10px;
            border-left: 4px solid #4f46e5;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .data-table th, .data-table td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
            font-size: 10pt;
        }
        .data-table th {
            background-color: #4f46e5;
            color: #ffffff;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 9pt;
        }
        .score-box {
            background-color: #f8fafc;
            border: 2px solid #6366f1;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 20px;
        }
        .score-box .score-title {
            font-size: 10pt;
            font-weight: bold;
            color: #4338ca;
            margin-bottom: 4px;
        }
        .score-box .score-value {
            font-size: 20pt;
            font-weight: bold;
            color: #1e1b4b;
        }
        .desc-box {
            background-color: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 25px;
            font-size: 10pt;
            color: #14532d;
        }
        .signatures {
            width: 100%;
            margin-top: 40px;
            border-collapse: collapse;
        }
        .signatures td {
            width: 50%;
            text-align: center;
            font-size: 10pt;
            vertical-align: top;
        }
        .signature-space {
            height: 60px;
        }
    </style>
</head>
<body>

    <!-- Header / Kop -->
    <div class="header">
        <h2>PEMERINTAH KABUPATEN BUOL</h2>
        <h2>DINAS PENDIDIKAN DAN KEBUDAYAAN</h2>
        <p><strong>{{ $school_name }}</strong></p>
        <p>LAPORAN HASIL BELAJAR (RAPOR KURIKULUM MERDEKA - PPA 2025)</p>
    </div>

    <!-- Student Metadata -->
    <table class="info-table">
        <tr>
            <td class="label">Nama Siswa</td>
            <td>: <strong>{{ $report->student?->name }}</strong></td>
            <td class="label">Kelas</td>
            <td>: {{ $report->schoolClass?->name ?? 'VII' }}</td>
        </tr>
        <tr>
            <td class="label">NIS / NISN</td>
            <td>: {{ $report->student?->nis ?? $report->student?->nisn ?? '-' }}</td>
            <td class="label">Mata Pelajaran</td>
            <td>: {{ $report->subject?->name ?? 'Informatika' }}</td>
        </tr>
        <tr>
            <td class="label">Fase</td>
            <td>: D</td>
            <td class="label">Metode Nilai</td>
            <td>: Opsi {{ strtoupper($report->calculation_method) }} (Murni Sumatif)</td>
        </tr>
    </table>

    <!-- Final Score Box -->
    <div class="score-box">
        <div class="score-title">NILAI AKHIR RAPOR (ASESMEN SUMATIF)</div>
        <div class="score-value">{{ number_format($report->final_score, 1) }}</div>
        <div style="font-size: 8pt; color: #64748b; margin-top: 4px;">
            *Sesuai PPA 2025, Nilai Rapor diolah murni dari Asesmen Sumatif tanpa menggabungkan Asesmen Formatif.
        </div>
    </div>

    <!-- Breakdown Table -->
    <div class="section-title">A. Pencapaian Asesmen Sumatif Per Tujuan Pembelajaran (TP)</div>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 10%;">Kode</th>
                <th style="width: 70%;">Tujuan Pembelajaran (TP)</th>
                <th style="width: 20%; text-align: center;">Nilai Sumatif</th>
            </tr>
        </thead>
        <tbody>
            @php
                $details = $report->tp_scores_breakdown['details'] ?? [];
            @endphp
            @forelse($details as $tp)
                <tr>
                    <td style="font-weight: bold; color: #4f46e5;">{{ $tp['code'] ?? '-' }}</td>
                    <td>{{ $tp['title'] ?? '-' }}</td>
                    <td style="text-align: center; font-weight: bold;">{{ $tp['score'] ?? 0 }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="3" style="text-align: center; color: #94a3b8;">Belum ada rincian TP.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Qualitative Description -->
    <div class="section-title">B. Deskripsi Capaian Kompetensi</div>
    <div class="desc-box">
        <strong>Deskripsi Kualitatif:</strong><br>
        {{ $report->description }}
    </div>

    <!-- Signatures -->
    <table class="signatures">
        <tr>
            <td>
                Mengetahui,<br>
                Orang Tua / Wali Murid
                <div class="signature-space"></div>
                ( ..................................................... )
            </td>
            <td>
                Buol, {{ date('d F Y') }}<br>
                Guru Mata Pelajaran
                <div class="signature-space"></div>
                <strong>{{ $report->creator?->name ?? 'Guru Pengampu' }}</strong><br>
                NIP. {{ $report->creator?->nip ?? '-' }}
            </td>
        </tr>
    </table>

</body>
</html>
