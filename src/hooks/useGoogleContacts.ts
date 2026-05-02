import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { ContactsError, fetchGoogleContacts } from '@/lib/contacts'
import { getAccessToken, requestContactsAccess } from '@/lib/gsi'
import { shouldFetchContactsOnDemand } from '@/lib/startupPolicy'
import { useBrainStore } from '@/store/useBrainStore'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

export function useGoogleContacts() {
  const contacts = useBrainStore((s) => s.contacts)
  const contactsConnected = useBrainStore((s) => s.contactsConnected)
  const setContacts = useBrainStore((s) => s.setContacts)
  const setContactsConnected = useBrainStore((s) => s.setContactsConnected)
  const [loading, setLoading] = useState(false)

  const loadSilentlyIfAvailable = useCallback(async () => {
    if (!shouldFetchContactsOnDemand({
      contactsCount: contacts.length,
      contactsConnected,
      isLoading: loading,
    })) return

    const token = getAccessToken()
    if (!token) return

    setLoading(true)
    try {
      const fetched = await fetchGoogleContacts(token)
      if (fetched.length > 0) {
        setContacts(fetched)
        setContactsConnected(true)
      }
    } catch {
      // The normal token only has Sheets scope after a fresh reload. Keep this quiet
      // and let the user choose "Load Google contacts" from the people input.
    } finally {
      setLoading(false)
    }
  }, [contacts.length, contactsConnected, loading, setContacts, setContactsConnected])

  const requestContacts = useCallback(() => {
    if (!CLIENT_ID) {
      toast.error('Google client ID is not configured')
      return
    }

    const toastId = toast.loading('Loading Google contacts…')
    setLoading(true)
    requestContactsAccess(
      CLIENT_ID,
      async (token) => {
        try {
          const fetched = await fetchGoogleContacts(token)
          setContacts(fetched)
          setContactsConnected(true)
          toast.success(`Loaded ${fetched.length.toLocaleString()} contact${fetched.length === 1 ? '' : 's'}`, { id: toastId })
        } catch (err) {
          const msg = err instanceof ContactsError ? err.message : 'Failed to load contacts'
          toast.error(msg, { id: toastId })
        } finally {
          setLoading(false)
        }
      },
      (msg) => {
        setLoading(false)
        toast.error(msg || 'Contacts permission was not granted', { id: toastId })
      },
    )
  }, [setContacts, setContactsConnected])

  return {
    contacts,
    contactsConnected,
    contactsLoading: loading,
    loadSilentlyIfAvailable,
    requestContacts,
  }
}
