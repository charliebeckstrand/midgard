import { addPlace, listPlaces } from '@/server/places-store'
import { readDraft } from '@/server/read-draft'
import { sessionUserId, unauthorized } from '@/server/session-user'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** Every place of the user, newest visit first. */
export async function GET() {
	const userId = await sessionUserId()

	if (userId === null) return unauthorized()

	return Response.json(await listPlaces(userId))
}

/** Adds one place, after reading the body as a draft. */
export async function POST(request: Request) {
	const userId = await sessionUserId()

	if (userId === null) return unauthorized()

	const draft = await readDraft(request)

	if (!draft.ok) return Response.json({ issues: draft.issues }, { status: 400 })

	return Response.json(await addPlace(userId, draft.value), { status: 201 })
}
