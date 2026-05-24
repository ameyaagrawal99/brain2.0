import { SHEET_ID, SHEETS_BASE, CONFIG_SHEET_NAME, CONFIG_RANGE, CONFIG_TYPES } from '@/constants/sheet'
import type { SpecialDay } from '@/types/sheet'
import type { SentimentFilter } from '@/lib/sentiment'
import { logger } from './logger'

export interface QuickFilter {
  name:          string
  search:        string
  categories:    string[]
  subCategories: string[]
  statuses:      string[]
  persons:       string[]
  selectedTags:  string[]
  tagMatchMode:  'and' | 'or'
  sortBy:        string
  dateFrom?:     string | null
  dateTo?:       string | null
  dueDateFrom?:  string | null
  dueDateTo?:    string | null
  showToday?:    boolean
  sentimentFilter?: SentimentFilter | null
}
import { sheetsFetch } from './sheets'

// Re-export for external callers
export { CONFIG_SHEET_NAME }

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
    logger.warn('[sheetsConfig] ensureConfigSheet warning:', msg)
    // Non-fatal — swallow other errors so app still loads
  }
}

/** Fetch all custom categories, tags, and category colors from the Config sheet. */
export async function fetchConfig(): Promise<{ categories: string[]; tags: string[]; colors: Record<string, string> }> {
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
    const colors: Record<string, string> = {}
    rows
      .filter(r => (r[0] ?? '').toLowerCase() === CONFIG_TYPES.COLOR && r[1]?.trim() && r[2]?.trim())
      .forEach(r => { colors[r[1].trim().toLowerCase()] = r[2].trim() })
    return { categories, tags, colors }
  } catch (err) {
    logger.warn('[sheetsConfig] fetchConfig failed (non-fatal):', err)
    return { categories: [], tags: [], colors: {} }
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

async function appendConfigItem(type: string, value: string, meta = ''): Promise<void> {
  const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(CONFIG_RANGE)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  await sheetsFetch(url, {
    method: 'POST',
    body: JSON.stringify({
      majorDimension: 'ROWS',
      values: [[type, value, meta]],
    }),
  })
}

/**
 * Save (upsert) a category color entry in the Config sheet.
 * If an existing color row for the category exists, updates it in place.
 * Otherwise appends a new row.
 */
export async function saveColorConfig(category: string, colorName: string): Promise<void> {
  try {
    const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(CONFIG_RANGE)}?valueRenderOption=FORMATTED_VALUE`
    const data = await sheetsFetch(url)
    const values = (data as { values?: string[][] }).values ?? []
    const catLower = category.toLowerCase()

    const rowIdx = values.findIndex(
      (r, i) => i > 0 && (r[0] ?? '').toLowerCase() === CONFIG_TYPES.COLOR && r[1]?.trim().toLowerCase() === catLower
    )

    if (rowIdx > 0) {
      // Update existing row (rowIdx is 0-based array index → sheet row = rowIdx + 1)
      const sheetRow = rowIdx + 1
      const range = `${CONFIG_SHEET_NAME}!A${sheetRow}:C${sheetRow}`
      await sheetsFetch(
        `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          body: JSON.stringify({
            range,
            majorDimension: 'ROWS',
            values: [[CONFIG_TYPES.COLOR, catLower, colorName]],
          }),
        }
      )
    } else {
      await appendConfigItem(CONFIG_TYPES.COLOR, catLower, colorName)
    }
  } catch (err) {
    logger.warn('[sheetsConfig] saveColorConfig failed:', err)
    throw err
  }
}

/** Delete a category color entry from the Config sheet. */
export async function deleteColorConfig(category: string): Promise<void> {
  await deleteConfigItem('color', category.toLowerCase())
}

/* ── Quick Filters ─────────────────────────────────────────────────────── */

/** Fetch all saved quick filters from the Config sheet. */
export async function fetchQuickFilters(): Promise<QuickFilter[]> {
  try {
    const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(CONFIG_RANGE)}?valueRenderOption=FORMATTED_VALUE`
    const data = await sheetsFetch(url)
    const values = (data as { values?: string[][] }).values ?? []
    return values
      .slice(1)
      .filter(r => (r[0] ?? '').toLowerCase() === CONFIG_TYPES.QUICKFILTER && r[1]?.trim() && r[2]?.trim())
      .map(r => {
        try { return { name: r[1].trim(), ...JSON.parse(r[2]) } as QuickFilter }
        catch { return null }
      })
      .filter(Boolean) as QuickFilter[]
  } catch {
    return []
  }
}

/** Save (upsert) a quick filter preset to the Config sheet. */
export async function saveQuickFilter(filter: QuickFilter): Promise<void> {
  try {
    const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(CONFIG_RANGE)}?valueRenderOption=FORMATTED_VALUE`
    const data = await sheetsFetch(url)
    const values = (data as { values?: string[][] }).values ?? []
    const nameLower = filter.name.toLowerCase()
    const { name, ...rest } = filter
    const jsonValue = JSON.stringify(rest)

    const rowIdx = values.findIndex(
      (r, i) => i > 0 && (r[0] ?? '').toLowerCase() === CONFIG_TYPES.QUICKFILTER && r[1]?.trim().toLowerCase() === nameLower
    )

    if (rowIdx > 0) {
      const sheetRow = rowIdx + 1
      const range = `${CONFIG_SHEET_NAME}!A${sheetRow}:C${sheetRow}`
      await sheetsFetch(
        `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          body: JSON.stringify({ range, majorDimension: 'ROWS', values: [[CONFIG_TYPES.QUICKFILTER, name, jsonValue]] }),
        }
      )
    } else {
      await appendConfigItem(CONFIG_TYPES.QUICKFILTER, name, jsonValue)
    }
  } catch (err) {
    logger.warn('[sheetsConfig] saveQuickFilter failed:', err)
    throw err
  }
}

/** Delete a quick filter preset from the Config sheet. */
export async function deleteQuickFilter(name: string): Promise<void> {
  await deleteConfigItem(CONFIG_TYPES.QUICKFILTER, name)
}

/* ── Special Days ───────────────────────────────────────────────────────── */

/** Fetch all saved special days from the Config sheet. */
export async function fetchSpecialDays(): Promise<SpecialDay[]> {
  try {
    const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(CONFIG_RANGE)}?valueRenderOption=FORMATTED_VALUE`
    const data = await sheetsFetch(url)
    const values = (data as { values?: string[][] }).values ?? []
    return values
      .slice(1)
      .filter(r => (r[0] ?? '').toLowerCase() === CONFIG_TYPES.SPECIALDAY && r[1]?.trim() && r[2]?.trim())
      .map(r => {
        try {
          const meta = JSON.parse(r[2]) as Omit<SpecialDay, 'id'>
          return { id: r[1].trim(), ...meta } as SpecialDay
        } catch { return null }
      })
      .filter(Boolean) as SpecialDay[]
  } catch {
    return []
  }
}

/** Append a new special day to the Config sheet. */
export async function appendSpecialDay(day: SpecialDay): Promise<void> {
  const { id, ...rest } = day
  await appendConfigItem(CONFIG_TYPES.SPECIALDAY, id, JSON.stringify(rest))
}

/** Delete a special day from the Config sheet by id. */
export async function deleteSpecialDay(id: string): Promise<void> {
  await deleteConfigItem(CONFIG_TYPES.SPECIALDAY, id)
}

/** Update an existing special day in the Config sheet by id (in-place PUT). */
export async function updateSpecialDay(day: SpecialDay): Promise<void> {
  try {
    const url = `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(CONFIG_RANGE)}?valueRenderOption=FORMATTED_VALUE`
    const data = await sheetsFetch(url)
    const values = (data as { values?: string[][] }).values ?? []
    const rowIdx = values.findIndex(
      (r, i) => i > 0 && (r[0] ?? '').toLowerCase() === CONFIG_TYPES.SPECIALDAY && r[1]?.trim() === day.id
    )
    if (rowIdx < 0) throw new Error('Milestone not found')
    const { id, ...rest } = day
    const sheetRow = rowIdx + 1
    const range = `${CONFIG_SHEET_NAME}!A${sheetRow}:C${sheetRow}`
    await sheetsFetch(
      `${SHEETS_BASE}/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({
          range,
          majorDimension: 'ROWS',
          values: [[CONFIG_TYPES.SPECIALDAY, id, JSON.stringify(rest)]],
        }),
      }
    )
  } catch (err) {
    logger.warn('[sheetsConfig] updateSpecialDay failed:', err)
    throw err
  }
}

/**
 * Delete a config item by type+value.
 * Finds the row index then uses batchUpdate deleteDimension.
 * This is a best-effort approach — fetches fresh config, finds matching row, deletes it.
 */
export async function deleteConfigItem(type: 'category' | 'tag' | 'color' | 'quickfilter' | 'specialday', value: string): Promise<void> {
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
    logger.warn('[sheetsConfig] deleteConfigItem failed:', err)
    throw err
  }
}
