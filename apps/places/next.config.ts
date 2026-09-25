import { withAuth } from 'auth/config'

export default withAuth({
	devIndicators: false,
	// `next build` writes a self-contained server into `.next/standalone`, with
	// the dependencies that it traces. The Dockerfile at the repository root
	// copies that server into the image that App Platform runs.
	output: 'standalone',
	// When `next dev` finds a coding agent, it writes an `AGENTS.md` and a
	// `CLAUDE.md` into the app. The agent rules of the repository are in the
	// root `CLAUDE.md`, so the app keeps no second copy.
	agentRules: false,
	// The React Compiler memoizes each component and hook of the app, and of the
	// `ui` source it imports. `ui` runs its tests compiled (`test:compiler`), and
	// its grid reads the table engine through one boundary (CONVENTIONS §10.7).
	reactCompiler: true,
})
