import { SHEET_ID, DATA_RANGE, SHEETS_BASE, SHEET_NAME, TOTAL_COLS } from '@/constants/sheet'
import { parseRows, rowToValues } from './parseRows'
import { BrainRow } from '@/types/sheet'
import { getAccessToken } from './gsi'

function authHeaders(): HeadersInit {
  const token = getAccessToken()
  if (!token) {
    throw new Error('Not signed in \u2014 no access token. Please sign in again.')
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function sheetsFetch(url: string, init?: RequestInit) {
  const headers = authHeaders()
  console.log('[sheets] fetching:', url.split('?')[0])
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg  = (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`
    console.error('[sheets] API error:', res.status, msg)
    if (res.status === 401) throw new Error('Auth expired \u2014 please sign in again')
    if (res.status === 403) throw new Error('Permission denied \u2014 make sure the Google Sheet is accessible to your account')
    if (res.status === 404) throw new Error('Sheet not found \u2014 check SHEET_ID in constants/sheet.ts')
    throw new Error(msg)
  }
  return res.json()
}

export async function fetchRows(): Promise<BrainRow[]> {
  const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(DATA_RANGE)}?valueRenderOption=FORMATTED_VALUE`
  const data = await sheetsFetch(url)
  const values = (data as { values?: string[][] }).values ?? []
  console.log('[sheets] raw rows received:', values.length)
  return parseRows(values)
}

export async function updateRow(row: BrainRow): Promise<void> {
  const endCol = String.fromCharCode(64 + TOTAL_COLS)
  const range  = `${SHEET_NAME}!A${row._rowIndex}:${endCol}${row._rowIndex}`
  const values = [rowToValues(row)]
  const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  await sheetsFetch(url, {
    method: 'PUT',
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  })
}

export async function appendRow(row: Omit<BrainRow, '_rowIndex' | '_dirty'>): Promise<void> {
  const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(DATA_RANGE)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  const values = [rowToValues(row as BrainRow)]
  await sheetsFetch(url, {
    method: 'POST',
    body: JSON.stringify({ majorDimension: 'ROWS', values }),
  })
}

export async function deleteRow(rowIndex: number): Promise<void> {
  const url = `${SHEETS_BASE}/${SHEET_ID}:batchUpdate`
  const body = {
    requests: [{
      deleteDimension: {
        range: {
          sheetId: 0,
          dimension: 'ROWS',
          startIndex: rowIndex - 1,
          endIndex: rowIndex,
        }
      }
    }]
  }
  await sheetsFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
