import { addPlace, listPlaces } from '@/server/places-store'
import { readDraft } from '@/server/read-draft'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** Every place, newest visit first. */
export async function GET() {
	return Response.json(await listPlaces())
}

/** Adds one place, after reading the body as a draft. */
export async function POST(request: Request) {
	const draft = await readDraft(request)

	if (!draft.ok) return Response.json({ issues: draft.issues }, { status: 400 })

	return Response.json(await addPlace(draft.value), { status: 201 })
}
