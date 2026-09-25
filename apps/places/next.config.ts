import type { NextConfig } from 'next'

const config: NextConfig = {
	devIndicators: false,
	// The React Compiler memoizes each component and hook of the app and of the
	// `ui` source it imports. `ui` holds the grid and the tooltip to it through
	// `test:compiler` (CONVENTIONS §10.7).
	reactCompiler: true,
}

export default config
