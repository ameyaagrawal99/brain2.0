import { PEOPLE_API } from '@/constants/sheet'

export interface Contact {
  resourceName: string
  name: string
  email?: string
}

/**
 * Fetch the user's Google Contacts via the People API.
 * Requires a token that includes the contacts.readonly scope.
 * Returns an empty array if the token lacks the scope or the API call fails.
 */
export async function fetchGoogleContacts(token: string): Promise<Contact[]> {
  try {
    const url = `${PEOPLE_API}/people/me/connections?personFields=names,emailAddresses&pageSize=1000&sortOrder=FIRST_NAME_ASCENDING`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 403) {
      // Token doesn't have contacts scope — user hasn't granted permission yet.
      return []
    }
    if (!res.ok) return []
    const data = await res.json() as { connections?: unknown[] }
    const connections = data.connections ?? []
    return (connections as Array<{
      resourceName?: string
      names?: Array<{ displayName?: string }>
      emailAddresses?: Array<{ value?: string }>
    }>).map((c) => ({
      resourceName: c.resourceName ?? '',
      name: c.names?.[0]?.displayName ?? '',
      email: c.emailAddresses?.[0]?.value,
    })).filter((c) => c.name.trim())
  } catch {
    return []
  }
}

/** Parse a comma-separated people string into a trimmed name array */
export function parsePeople(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
