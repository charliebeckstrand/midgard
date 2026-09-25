import { withAuth } from 'auth/config'

export default withAuth({
	devIndicators: false,
	// When `next dev` finds a coding agent, it writes an `AGENTS.md` and a
	// `CLAUDE.md` into the app. The agent rules of the repository are in the
	// root `CLAUDE.md`, so the app keeps no second copy.
	agentRules: false,
})
