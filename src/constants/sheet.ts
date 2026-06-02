const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env

export const SHEET_ID   = env?.VITE_GOOGLE_SHEET_ID ?? '1NAXIJpRcYgQpEFV9jYMfYLR6c8WtNnps36_WxvgCesc'
export const SHEET_NAME = 'Sheet1'
export const DATA_RANGE = `${SHEET_NAME}!A:Q`   // A–Q covers 17 cols (16 data + 1 buffer)
export const SHEETS_SCOPE   = 'https://www.googleapis.com/auth/spreadsheets'
export const CONTACTS_SCOPE       = 'https://www.googleapis.com/auth/contacts.readonly'
export const CONTACTS_OTHER_SCOPE = 'https://www.googleapis.com/auth/contacts.other.readonly'
export const PEOPLE_API     = 'https://people.googleapis.com/v1'
export const SHEETS_BASE    = 'https://sheets.googleapis.com/v4/spreadsheets'
export const TOTAL_COLS     = 16

/** 0-based column indices matching the sheet layout */
export const COL = {
  SR_NO:        0,
  TITLE:        1,
  CREATED_AT:   2,
  UPDATED_AT:   3,
  CATEGORY:     4,
  SUB_CATEGORY: 5,
  ORIGINAL:     6,
  REWRITTEN:    7,
  ACTION_ITEMS: 8,
  DUE_DATE:     9,
  TASK_STATUS:  10,
  LINKS:        11,
  MEDIA_URL:    12,
  TAGS:         13,
  MESSAGE_ID:   14,
  PEOPLE:       15,   // column P – comma-separated contact names
} as const

// Config sheet for persisting custom categories, tags, and app metadata
export const CONFIG_SHEET_NAME = 'Config'
export const CONFIG_RANGE      = `${CONFIG_SHEET_NAME}!A:C`

export const CONFIG_TYPES = {
  CATEGORY:    'category',
  TAG:         'tag',
  COLOR:       'color',
  QUICKFILTER: 'quickfilter',
  SPECIALDAY:  'specialday',
} as const
