import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import toast from 'react-hot-toast'
import { useBrainStore } from '@/store/useBrainStore'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function monthDay(isoDate: string) {
  return isoDate.slice(5, 10) // "MM-DD"
}

export function useConfettiCheck() {
  const specialDays        = useBrainStore((s) => s.specialDays)
  const lastConfettiDate   = useBrainStore((s) => s.lastConfettiDate)
  const setLastConfettiDate = useBrainStore((s) => s.setLastConfettiDate)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!specialDays.length) return
    if (firedRef.current) return

    const today = todayISO()
    if (lastConfettiDate === today) return

    const todayMD = monthDay(today)

    const exactMatches = specialDays.filter((d) => d.date === today)
    const anniversaries = specialDays.filter(
      (d) => d.date !== today && monthDay(d.date) === todayMD
    )

    if (!exactMatches.length && !anniversaries.length) return

    firedRef.current = true
    setLastConfettiDate(today)

    // Fire confetti burst
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#f97316'],
    })
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      })
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      })
    }, 300)

    // Show toasts
    exactMatches.forEach((d) => {
      toast.success(
        `🎉 Today is a milestone: ${d.emoji ? d.emoji + ' ' : ''}${d.title}!`,
        { duration: 6000 }
      )
    })
    anniversaries.forEach((d) => {
      const years = new Date().getFullYear() - new Date(d.date).getFullYear()
      toast.success(
        `🎂 ${years}-year anniversary: ${d.emoji ? d.emoji + ' ' : ''}${d.title}!`,
        { duration: 6000 }
      )
    })
  }, [specialDays, lastConfettiDate, setLastConfettiDate])
}
