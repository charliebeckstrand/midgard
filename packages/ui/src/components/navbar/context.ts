'use client'

import { createContext } from '../../core'

export const [NavbarContext, useNavbar] = createContext<boolean>('Navbar', { default: false })
