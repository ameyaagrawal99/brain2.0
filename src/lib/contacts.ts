import { PEOPLE_API } from '@/constants/sheet'

export interface Contact {
  resourceName: string
  name: string
  email?: string
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

/**
 * Fetch contacts from people/me/connections (My Contacts group).
 * Returns empty array on 403 (no scope) or any error.
 */
async function fetchMyContacts(token: string): Promise<Contact[]> {
  const results: Contact[] = []
  let pageToken: string | undefined

  try {
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

      if (res.status === 403) return []
      if (!res.ok) break

      const data = await res.json() as {
        connections?: unknown[]
        nextPageToken?: string
      }

      const page = (data.connections ?? []) as RawPerson[]
      results.push(...page.map(mapPerson).filter((c) => c.name.trim()))
      pageToken = data.nextPageToken
    } while (pageToken)
  } catch {
    // network / parse error — return what we have
  }

  return results
}

/**
 * Fetch contacts from otherContacts (auto-collected from Gmail etc.).
 * Requires contacts.other.readonly scope — silently returns [] if scope missing.
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

      if (res.status === 403) return []  // scope not granted
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
 * Returns an empty array if the token lacks the scope or the API call fails.
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
