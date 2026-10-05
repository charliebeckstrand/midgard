import { withAuth } from 'auth/config'

export default withAuth(
	{
		devIndicators: false,
		// `next build` writes a self-contained server into `.next/standalone`. The
		// Dockerfile at the repository root copies that server into the image that
		// App Platform runs.
		output: 'standalone',
		// The agent rules of the repository are in the root `CLAUDE.md`, so the app
		// keeps no second copy.
		agentRules: false,
		reactCompiler: true,
		cacheComponents: true,
		partialPrefetching: true,
	},
	// The picks are Mimir's, in asgard, through the gateway.
	{ gatewayApi: true },
)
