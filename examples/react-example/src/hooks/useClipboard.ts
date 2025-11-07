import { useState } from 'react'

export function useClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState(false)

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), resetDelay)
      return true
    } catch (err) {
      console.error('Failed to copy:', err)
      return false
    }
  }

  return { copied, copy }
}
