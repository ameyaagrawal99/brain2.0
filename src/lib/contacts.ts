import { PEOPLE_API } from '@/constants/sheet'

export interface Contact {
  resourceName: string
  name: string
  email?: string
}

/**
 * Fetch ALL of the user's Google Contacts via the People API.
 * Requires a token that includes the contacts.readonly scope.
 * Paginates automatically — Google caps each page at 1000, so users with
 * 2000+ contacts need multiple requests via nextPageToken.
 * Returns an empty array if the token lacks the scope or the API call fails.
 */
export async function fetchGoogleContacts(token: string): Promise<Contact[]> {
  const all: Contact[] = []
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

      if (res.status === 403) return []   // no contacts scope
      if (!res.ok) break

      const data = await res.json() as {
        connections?: unknown[]
        nextPageToken?: string
      }

      const page = (data.connections ?? []) as Array<{
        resourceName?: string
        names?: Array<{ displayName?: string }>
        emailAddresses?: Array<{ value?: string }>
      }>

      const mapped = page
        .map((c) => ({
          resourceName: c.resourceName ?? '',
          name: c.names?.[0]?.displayName ?? '',
          email: c.emailAddresses?.[0]?.value,
        }))
        .filter((c) => c.name.trim())

      all.push(...mapped)
      pageToken = data.nextPageToken
    } while (pageToken)

    return all
  } catch {
    return all.length > 0 ? all : []
  }
}

/** Parse a comma-separated people string into a trimmed name array */
export function parsePeople(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
