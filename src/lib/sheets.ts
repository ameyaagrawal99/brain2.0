import { SHEET_ID, DATA_RANGE, SHEETS_BASE, SHEET_NAME, TOTAL_COLS } from '@/constants/sheet'
import { parseRows, rowToValues } from './parseRows'
import { BrainRow } from '@/types/sheet'
import { getAccessToken } from './gsi'

function authHeaders(): HeadersInit {
  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated — please sign in')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function sheetsFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { ...authHeaders(), ...(init?.headers ?? {}) } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchRows(): Promise<BrainRow[]> {
  const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(DATA_RANGE)}?valueRenderOption=FORMATTED_VALUE`
  const data = await sheetsFetch(url)
  return parseRows((data as { values?: string[][] }).values ?? [])
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
  // Google Sheets API: delete a row by index (0-based for batchUpdate)
  const url = `${SHEETS_BASE}/${SHEET_ID}:batchUpdate`
  const body = {
    requests: [{
      deleteDimension: {
        range: {
          sheetId: 0,  // assumes first sheet; adjust if needed
          dimension: 'ROWS',
          startIndex: rowIndex - 1,  // convert 1-based to 0-based
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
