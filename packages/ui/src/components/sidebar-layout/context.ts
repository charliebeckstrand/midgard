import { createContext } from 'react'

export const MobileSidebarContext = createContext<(() => void) | null>(null)
