import { createContext, use } from 'react'

type Theme = { primary: string }

const ThemeContext = createContext<Theme | null>(null)

export function Swatch() {
	const theme = use(ThemeContext)

	return <div style={{ color: theme?.primary }} />
}
