import { SHEET_ID, SHEETS_BASE, CONFIG_SHEET_NAME, CONFIG_RANGE, CONFIG_TYPES } from '@/constants/sheet'
import { sheetsFetch } from './sheets'

/** Ensure the Config sheet tab exists. Creates it if missing. */
export async function ensureConfigSheet(): Promise<void> {
  try {
    await sheetsFetch(`${SHEETS_BASE}/${SHEET_ID}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          addSheet: {
            properties: {
              title: CONFIG_SHEET_NAME,
              gridProperties: { rowCount: 1000, columnCount: 3 },
            }
          }
        }]
      }),
    })
    // Sheet was created — add headers
    await sheetsFetch(
      `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(CONFIG_SHEET_NAME + '!A1:C1')}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({
          range: `${CONFIG_SHEET_NAME}!A1:C1`,
          majorDimension: 'ROWS',
          values: [['type', 'value', 'meta']],
        }),
      }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    // Sheet already exists — not an error
    if (msg.includes('already exists') || msg.includes('ALREADY_EXISTS')) return
    console.warn('[sheetsConfig] ensureConfigSheet warning:', msg)
    // Non-fatal — swallow other errors so app still loads
  }
}

/** Fetch all custom categories and tags from the Config sheet. */
export async function fetchConfig(): Promise<{ categories: string[]; tags: string[] }> {
  try {
    const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(CONFIG_RANGE)}?valueRenderOption=FORMATTED_VALUE`
    const data = await sheetsFetch(url)
    const values = (data as { values?: string[][] }).values ?? []
    // Skip header row
    const rows = values.slice(1)
    const categories = rows
      .filter(r => (r[0] ?? '').toLowerCase() === CONFIG_TYPES.CATEGORY && r[1]?.trim())
      .map(r => r[1].trim())
    const tags = rows
      .filter(r => (r[0] ?? '').toLowerCase() === CONFIG_TYPES.TAG && r[1]?.trim())
      .map(r => r[1].trim())
    return { categories, tags }
  } catch (err) {
    console.warn('[sheetsConfig] fetchConfig failed (non-fatal):', err)
    return { categories: [], tags: [] }
  }
}

/** Append a custom category to the Config sheet. */
export async function appendConfigCategory(value: string): Promise<void> {
  await appendConfigItem(CONFIG_TYPES.CATEGORY, value)
}

/** Append a custom tag to the Config sheet. */
export async function appendConfigTag(value: string): Promise<void> {
  await appendConfigItem(CONFIG_TYPES.TAG, value)
}

async function appendConfigItem(type: string, value: string): Promise<void> {
  const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(CONFIG_RANGE)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  await sheetsFetch(url, {
    method: 'POST',
    body: JSON.stringify({
      majorDimension: 'ROWS',
      values: [[type, value, '']],
    }),
  })
}

/**
 * Delete a config item by type+value.
 * Finds the row index then uses batchUpdate deleteDimension.
 * This is a best-effort approach — fetches fresh config, finds matching row, deletes it.
 */
export async function deleteConfigItem(type: 'category' | 'tag', value: string): Promise<void> {
  try {
    const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(CONFIG_RANGE)}?valueRenderOption=FORMATTED_VALUE`
    const data = await sheetsFetch(url)
    const values = (data as { values?: string[][] }).values ?? []
    // Find 1-based row index (values[0] = header = row 1, values[1] = row 2, etc.)
    const rowIdx = values.findIndex(
      (r, i) => i > 0 && (r[0] ?? '').toLowerCase() === type && r[1]?.trim() === value
    )
    if (rowIdx < 0) return // Not found — nothing to delete

    // Get the sheetId for the Config tab
    const metaUrl = `${SHEETS_BASE}/${SHEET_ID}?fields=sheets.properties`
    const meta = await sheetsFetch(metaUrl)
    const sheets = (meta as { sheets?: { properties: { title: string; sheetId: number } }[] }).sheets ?? []
    const configSheet = sheets.find(s => s.properties.title === CONFIG_SHEET_NAME)
    const sheetId = configSheet?.properties.sheetId ?? -1

    if (sheetId < 0) return

    await sheetsFetch(`${SHEETS_BASE}/${SHEET_ID}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIdx,      // 0-based
              endIndex: rowIdx + 1,
            }
          }
        }]
      }),
    })
  } catch (err) {
    console.warn('[sheetsConfig] deleteConfigItem failed:', err)
    throw err
  }
}
