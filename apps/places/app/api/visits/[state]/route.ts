import { readJson } from '@/server/read-draft'
import { visitedSeed } from '@/server/visited-seed'
import { setVisit } from '@/server/visits-store'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** Route params arrive as a promise in this Next major. */
type Context = { params: Promise<{ state: string }> }

/** What the body must carry: the designation itself, and nothing else. */
function readVisited(input: unknown): boolean | null {
	if (typeof input !== 'object' || input === null) return null

	const { visited } = input as { visited?: unknown }

	return typeof visited === 'boolean' ? visited : null
}

/**
 * Marks one state visited or not, and answers with the whole set — the caller
 * then holds what the store settled on rather than a copy it patched itself.
 *
 * A `PUT` because it states what the designation is, not what to do to it: sent
 * twice it leaves the same set, which is what a toggle pressed through a dropped
 * response needs.
 */
export async function PUT(request: Request, context: Context) {
	const { state } = await context.params

	const name = decodeURIComponent(state).trim()

	if (name === '') return Response.json({ issues: ['`state` is required.'] }, { status: 400 })

	const body = await readJson(request)

	if (!body.ok) return Response.json({ issues: body.issues }, { status: 400 })

	const visited = readVisited(body.value)

	if (visited === null) {
		return Response.json({ issues: ['`visited` must be a boolean.'] }, { status: 400 })
	}

	return Response.json(await setVisit(name, visited, visitedSeed))
}
