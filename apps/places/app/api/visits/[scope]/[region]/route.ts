import { readJson } from '@/server/read-draft'
import { visitedSeed } from '@/server/visited-seed'
import { setVisit } from '@/server/visits-store'
import { VISIT_SCOPES, type VisitScope } from '@/types'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** Route params arrive as a promise in this Next major. */
type Context = { params: Promise<{ scope: string; region: string }> }

/**
 * Reads a path segment as a scope, or `null` where it names no atlas.
 *
 * Read off {@link VISIT_SCOPES} rather than a list written out here, so a scope
 * added to the type reaches the guard on untrusted input — a second hand-written
 * list would leave this route refusing what the rest of the app admits, and no
 * type error would say so.
 */
function readScope(value: string): VisitScope | null {
	return VISIT_SCOPES.includes(value as VisitScope) ? (value as VisitScope) : null
}

/** What the body must carry: the designation itself, and nothing else. */
function readVisited(input: unknown): boolean | null {
	if (typeof input !== 'object' || input === null) return null

	const { visited } = input as { visited?: unknown }

	return typeof visited === 'boolean' ? visited : null
}

/**
 * Marks one region visited or not, and answers with both scopes — the caller
 * then holds what the store settled on rather than a copy it patched itself.
 *
 * The scope rides the path because it is part of what is addressed and not part
 * of the change: Georgia the state and Georgia the country are two designations,
 * and the path is where the difference between two resources belongs.
 *
 * A `PUT` because it states what the designation is, not what to do to it: sent
 * twice it leaves the same set, which is what a toggle pressed through a dropped
 * response needs.
 */
export async function PUT(request: Request, context: Context) {
	const { scope: rawScope, region: rawRegion } = await context.params

	const scope = readScope(rawScope)

	if (scope === null) {
		return Response.json({ issues: ['`scope` must be `states` or `countries`.'] }, { status: 404 })
	}

	const region = decodeURIComponent(rawRegion).trim()

	if (region === '') return Response.json({ issues: ['`region` is required.'] }, { status: 400 })

	const body = await readJson(request)

	if (!body.ok) return Response.json({ issues: body.issues }, { status: 400 })

	const visited = readVisited(body.value)

	if (visited === null) {
		return Response.json({ issues: ['`visited` must be a boolean.'] }, { status: 400 })
	}

	return Response.json(await setVisit(scope, region, visited, visitedSeed))
}
