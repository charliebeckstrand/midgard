import { createContext, useContext } from 'react'

type Theme = { primary: string }

const ThemeContext = createContext<Theme | null>(null)

export function Swatch() {
	const theme = useContext(ThemeContext)
	return <div style={{ color: theme?.primary }} />
}
