'use client'

import { createContext } from '../../core'

export const [NavbarProvider, useNavbar] = createContext<boolean>('Navbar', { default: false })
