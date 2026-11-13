import { readFileSync } from 'node:fs'
import path from 'node:path'
import { connection } from 'next/server'

/** The ID of the build that this server runs, after the first read. */
let buildId: string | undefined

/**
 * The route handler that gives the ID of the build that the server runs, as
 * plain text. An app with `LiveRefresh` or `useBuildWatch` serves it at
 * `/api/build`.
 *
 * @remarks
 * Next writes the ID to `.next/BUILD_ID`, and its server reads the same file.
 * A deploy runs a new build, so the server then gives a new ID. The answer
 * goes to no cache, so each read gets the ID of the server that answers.
 */
export async function GET(): Promise<Response> {
	// The ID is known only when the server runs, not when the build prerenders.
	await connection()

	buildId ??= readFileSync(path.join(process.cwd(), '.next', 'BUILD_ID'), 'utf8').trim()

	return new Response(buildId, {
		headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
	})
}
