import { PEOPLE_API } from '@/constants/sheet'

export interface Contact {
  resourceName: string
  name: string
  email?: string
}

/** Possible error codes returned from People API */
export type ContactsErrorCode = 'API_DISABLED' | 'NO_SCOPE' | 'NETWORK' | 'UNKNOWN'

export class ContactsError extends Error {
  constructor(message: string, public code: ContactsErrorCode) {
    super(message)
    this.name = 'ContactsError'
  }
}

type RawPerson = {
  resourceName?: string
  names?: Array<{ displayName?: string }>
  emailAddresses?: Array<{ value?: string }>
}

function mapPerson(c: RawPerson): Contact {
  return {
    resourceName: c.resourceName ?? '',
    name: c.names?.[0]?.displayName ?? '',
    email: c.emailAddresses?.[0]?.value,
  }
}

async function handleApiError(res: Response): Promise<never> {
  const body = await res.json().catch(() => null) as {
    error?: { message?: string; status?: string }
  } | null
  const msg = body?.error?.message ?? ''
  if (res.status === 403) {
    if (msg.includes('has not been used') || msg.includes('People API') || msg.includes('disabled')) {
      throw new ContactsError(
        'Google People API is not enabled. Enable it in Google Cloud Console → APIs & Services → Library → "People API".',
        'API_DISABLED',
      )
    }
    throw new ContactsError('Contacts permission denied. Re-connect and approve the contacts scope.', 'NO_SCOPE')
  }
  throw new ContactsError(`API error ${res.status}: ${msg || 'unknown'}`, 'UNKNOWN')
}

/**
 * Fetch contacts from people/me/connections (My Contacts group).
 * Throws ContactsError on 403 so the caller can show a meaningful message.
 */
async function fetchMyContacts(token: string): Promise<Contact[]> {
  const results: Contact[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      personFields: 'names,emailAddresses',
      pageSize: '1000',
      sortOrder: 'FIRST_NAME_ASCENDING',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(`${PEOPLE_API}/people/me/connections?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) await handleApiError(res)

    const data = await res.json() as {
      connections?: unknown[]
      nextPageToken?: string
    }

    const page = (data.connections ?? []) as RawPerson[]
    results.push(...page.map(mapPerson).filter((c) => c.name.trim()))
    pageToken = data.nextPageToken
  } while (pageToken)

  return results
}

/**
 * Fetch contacts from otherContacts (auto-collected from Gmail etc.).
 * Returns [] on 403 — this scope is optional (user may not have approved it).
 */
async function fetchOtherContacts(token: string): Promise<Contact[]> {
  const results: Contact[] = []
  let pageToken: string | undefined

  try {
    do {
      const params = new URLSearchParams({
        readMask: 'names,emailAddresses',
        pageSize: '1000',
      })
      if (pageToken) params.set('pageToken', pageToken)

      const res = await fetch(`${PEOPLE_API}/otherContacts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 403) return []  // optional scope — silently skip
      if (!res.ok) break

      const data = await res.json() as {
        otherContacts?: unknown[]
        nextPageToken?: string
      }

      const page = (data.otherContacts ?? []) as RawPerson[]
      results.push(...page.map(mapPerson).filter((c) => c.name.trim()))
      pageToken = data.nextPageToken
    } while (pageToken)
  } catch {
    // network / parse error — return what we have
  }

  return results
}

/**
 * Fetch ALL of the user's Google Contacts via the People API.
 * Fetches from both "My Contacts" (connections.list) and "Other contacts"
 * (otherContacts.list — contacts auto-collected from Gmail etc.) and merges
 * the results, deduping by resourceName.
 * Paginates automatically — Google caps each page at 1000.
 *
 * Throws ContactsError with code 'API_DISABLED' if the People API is not
 * enabled in the Google Cloud Console project.
 */
export async function fetchGoogleContacts(token: string): Promise<Contact[]> {
  const [mine, other] = await Promise.all([
    fetchMyContacts(token),
    fetchOtherContacts(token),
  ])

  // Merge, deduping by resourceName then sort alphabetically
  const seen = new Set<string>()
  const merged: Contact[] = []
  for (const c of [...mine, ...other]) {
    const key = c.resourceName || c.name
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(c)
  }
  return merged.sort((a, b) => a.name.localeCompare(b.name))
}

/** Parse a comma-separated people string into a trimmed name array */
export function parsePeople(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
