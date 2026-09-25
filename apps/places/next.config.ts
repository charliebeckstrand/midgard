import type { NextConfig } from 'next'

const config: NextConfig = {
	devIndicators: false,
	// The React Compiler memoizes each component and hook of the app, and of the
	// `ui` source it imports. `ui` runs its tests compiled (`test:compiler`), and
	// its grid reads the table engine through one boundary (CONVENTIONS §10.7).
	reactCompiler: true,
}

export default config
