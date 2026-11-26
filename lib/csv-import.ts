import { categorizeService } from './categories';
import { parseOtpAuthUri } from './totp';
import { type PasswordItem } from './vault';

export type CsvImportFormat = 'chrome' | 'bitwarden' | 'generic';

export type CsvPasswordImportResult =
  | {
      ok: true;
      format: CsvImportFormat;
      items: PasswordItem[];
      skippedEmpty: number;
    }
  | { ok: false; error: string };

/**
 * RFC-4180 CSV parser supporting quoted fields, escaped quotes (""),
 * and embedded newlines inside quotes.
 */
export function parseCsvRows(raw: string): string[][] {
  const input = (raw ?? '').replace(/^\uFEFF/, '');
  if (!input.trim()) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\r') {
        if (input[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, '_');
}

function extractHostLabel(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  const withoutScheme = trimmed.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  const host = withoutScheme.split('/')[0].split(':')[0].replace(/^www\./i, '');
  return host;
}

/**
 * Parses password CSV exports from Chrome, Edge, Bitwarden, or generic CSVs
 * completely offline.
 */
export function parsePasswordCsv(rawCsv: string, workspace = 'Personal'): CsvPasswordImportResult {
  const rows = parseCsvRows(rawCsv);
  if (rows.length < 2) {
    return { ok: false, error: 'CSV file is empty or missing data rows.' };
  }

  const headers = rows[0].map(normalizeHeader);
  const findCol = (...candidates: string[]): number => {
    for (const c of candidates) {
      const idx = headers.indexOf(c);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameIdx = findCol('name', 'service', 'title', 'account');
  const urlIdx = findCol('url', 'login_uri', 'website', 'uri', 'origin');
  const userIdx = findCol('username', 'login_username', 'email', 'login', 'user');
  const passIdx = findCol('password', 'login_password', 'pass');
  const notesIdx = findCol('note', 'notes', 'extra', 'comment');
  const totpIdx = findCol('login_totp', 'totp', 'totp_secret', '2fa');

  if (passIdx === -1 && userIdx === -1) {
    return {
      ok: false,
      error: 'Unrecognized CSV headers. Expected Chrome, Edge, or Bitwarden password export columns.',
    };
  }

  const format: CsvImportFormat =
    headers.includes('login_username') || headers.includes('login_password')
      ? 'bitwarden'
      : headers.includes('name') && headers.includes('url') && headers.includes('username')
        ? 'chrome'
        : 'generic';

  const now = Date.now();
  const targetWs = workspace || 'Personal';
  const items: PasswordItem[] = [];
  let skippedEmpty = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const cell = (idx: number) => (idx >= 0 && idx < r.length ? r[idx].trim() : '');

    const rawName = cell(nameIdx);
    const website = cell(urlIdx);
    const username = cell(userIdx);
    const password = passIdx >= 0 && passIdx < r.length ? r[passIdx] : '';
    const notes = cell(notesIdx);
    const rawTotp = cell(totpIdx);

    if (!rawName && !website && !username && !password) {
      skippedEmpty++;
      continue;
    }

    const service = rawName || extractHostLabel(website) || username || 'Imported Account';
    let totpSecret: string | undefined;
    if (rawTotp) {
      const parsedTotp = parseOtpAuthUri(rawTotp);
      if (parsedTotp.ok) {
        totpSecret = parsedTotp.secret;
      }
    }

    items.push({
      service,
      username,
      password,
      ...(website ? { website } : {}),
      ...(notes ? { notes } : {}),
      ...(totpSecret ? { totpSecret } : {}),
      category: categorizeService(service),
      workspace: targetWs,
      createdAt: now,
      modifiedAt: now,
    });
  }

  if (items.length === 0) {
    return { ok: false, error: 'No valid password rows found in the selected CSV file.' };
  }

  return { ok: true, format, items, skippedEmpty };
}
