import type { LeadInput } from '../api/leadApi';

/** Parser CSV sederhana yang mendukung tanda kutip, koma di dalam kutip, BOM, dan pemisah ; atau ,. */
export function parseCsv(text: string): string[][] {
  const clean = (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

function pick(record: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value.trim() !== '') return value.trim();
  }
  return '';
}

function toInt(value: string): number | null {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

function toRating(value: string): number | null {
  const match = value.match(/(\d)[.,](\d)/);
  return match ? Number(`${match[1]}.${match[2]}`) : null;
}

export function normalizeSegment(raw: string, fallback: string): string {
  const value = raw.toLowerCase();
  if (!value) return fallback;
  if (value.includes('oleh')) return 'OLEH_OLEH';
  if (value.includes('bakery') || value.includes('roti') || value.includes('kue') || value.includes('cake')) return 'BAKERY';
  if (value.includes('kater') || value.includes('cater') || value.includes('boga') || value.includes('nasi')) return 'CATERING';
  if (value.includes('florist') || value.includes('bunga')) return 'FLORIST';
  if (value.includes('frozen') || value.includes('beku')) return 'FROZEN_FOOD';
  if (value.includes('kafe') || value.includes('cafe') || value.includes('kopi') || value.includes('coffee')) return 'CAFE';
  if (value.includes('rumah sakit') || value.includes('hospital') || value.includes('klinik')) return 'HOSPITAL';
  const upper = raw.trim().toUpperCase().replace(/[^A-Z_]/g, '_');
  return ['BAKERY', 'OLEH_OLEH', 'CATERING', 'FLORIST', 'FROZEN_FOOD', 'CAFE', 'HOSPITAL', 'OTHER'].includes(upper) ? upper : fallback;
}

/**
 * Ubah baris CSV prospek menjadi lead. Mengenali kolom dari:
 * - prospek-solo-raya-v2.csv (Tier, Skor, Nama/Merek, Segmen, Outlet ditemukan, Kab/Kota, Telepon (Bing), Rating Google (ulasan), Alamat (maks 3), Catatan)
 * - prospek-katering-florist.csv (skor, tier, segmen, nama, outlet_di_peta, wilayah, alamat, rating, ulasan, telepon, kategori_maps, url_maps)
 * - kolom umum: name, segment, phone, area, address, notes, source.
 */
export function csvToLeads(text: string, defaults: { segment: string; source: string }): { leads: LeadInput[]; skipped: number } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { leads: [], skipped: 0 };

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const leads: LeadInput[] = [];
  let skipped = 0;

  for (const cells of rows.slice(1)) {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? '';
    });

    const name = pick(record, ['nama', 'nama/merek', 'name', 'nama usaha', 'nama_rs']);
    if (!name) {
      skipped += 1;
      continue;
    }

    const ratingCell = pick(record, ['rating', 'rating google (ulasan)', 'rating google']);
    const reviewCell = pick(record, ['ulasan', 'ulasan google', 'reviews', 'review_count']);
    const reviewFromRating = ratingCell.match(/\(([\d.]+)\)/)?.[1] ?? '';
    const category = pick(record, ['kategori_maps']);
    // "Tier 1 Big" → "1"; nilai pendek lain (mis. "A") tetap apa adanya.
    const tierCell = pick(record, ['tier']);
    const tier = tierCell.match(/\d/)?.[0] ?? (tierCell.slice(0, 4) || null);
    const mapsOrNote = pick(record, ['catatan / maps']);
    const mapsInNote = mapsOrNote.match(/https?:\/\/\S+/)?.[0] ?? '';
    const labeled = (label: string, keys: string[]) => {
      const value = pick(record, keys);
      return value ? `${label}: ${value}` : '';
    };
    const notes = [
      pick(record, ['catatan', 'notes']),
      mapsOrNote && !mapsInNote ? mapsOrNote : '',
      labeled('Alasan', ['alasan tier', 'alasan']),
      labeled('Paket usulan', ['paket usulan']),
      labeled('Nilai potensi', ['nilai potensi']),
      labeled('Layanan', ['layanan_unggulan']),
      labeled('Kelas', ['kelas_tt']),
      labeled('Email', ['email_resmi', 'email']),
      labeled('Website', ['website']),
      category ? `Kategori Maps: ${category}` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    leads.push({
      name: name.slice(0, 200),
      segment: normalizeSegment(pick(record, ['segmen', 'segment']), defaults.segment),
      tier,
      score: toInt(pick(record, ['skor', 'score'])),
      area: pick(record, ['wilayah', 'kab/kota', 'area', 'kota']) || null,
      address: pick(record, ['alamat', 'alamat (maks 3)', 'address']).slice(0, 500) || null,
      phone: pick(record, ['telepon', 'telepon (bing)', 'phone', 'wa', 'whatsapp', 'wa_utama', 'telepon_wa']).slice(0, 60) || null,
      instagram: pick(record, ['instagram', 'ig']) || null,
      rating: toRating(ratingCell),
      reviewCount: toInt(reviewCell || reviewFromRating),
      outletCount: toInt(pick(record, ['outlet_di_peta', 'outlet ditemukan', 'outlet', 'outlets'])),
      source: pick(record, ['sumber', 'source']).toUpperCase().slice(0, 40) || defaults.source,
      mapsUrl: pick(record, ['url_maps', 'maps', 'maps_url']) || mapsInNote || null,
      notes: notes.slice(0, 4000) || null,
    });
  }

  return { leads, skipped };
}

/** Nomor Indonesia → link wa.me (08xx → 628xx). */
export function toWhatsAppLink(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 9) return null;
  const international = digits.startsWith('0') ? `62${digits.slice(1)}` : digits.startsWith('62') ? digits : null;
  if (!international || !international.startsWith('628')) return null;
  return `https://wa.me/${international}`;
}
