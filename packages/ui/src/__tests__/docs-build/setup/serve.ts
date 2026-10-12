import { stat } from 'node:fs/promises'
import type { TestProject } from 'vitest/node'
import { CLIENT_DIR, serveDocs } from '../../../../scripts/docs-server'

declare module 'vitest' {
	interface ProvidedContext {
		/** The origin of the server of the docs build, such as `http://localhost:41234`. */
		docsOrigin: string
		/** The shard of the run, from `--shard`. A run with no `--shard` is the shard `1/1`. */
		docsShard: { index: number; count: number }
	}
}

/**
 * Serves the docs build on a free port for the run, and gives its origin to
 * the tests as `docsOrigin`, and the shard of the run as `docsShard`. The run
 * stops here when no build is on disk. Vitest calls the function that it
 * returns after the run.
 */
export async function setup(project: TestProject): Promise<() => Promise<void>> {
	await stat(CLIENT_DIR).catch(() => {
		throw new Error(
			`No docs build is at ${CLIENT_DIR}. Run \`pnpm turbo run test:docs-build --filter=ui\`, which builds it first.`,
		)
	})

	const { origin, server } = await serveDocs(0)

	project.provide('docsOrigin', origin)

	project.provide('docsShard', project.vitest.config.shard ?? { index: 1, count: 1 })

	return () =>
		new Promise((done) => {
			server.close(() => done())

			server.closeAllConnections()
		})
}
