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
})
