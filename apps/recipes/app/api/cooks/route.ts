import { parseCookDraft } from '@/schemas/recipe'
import { addCook, listCooks } from '@/server/cooks-store'
import { readAs, refuse } from '@/server/read-body'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** The whole cook log, newest day first. */
export async function GET() {
	return Response.json(await listCooks())
}

/**
 * Records one cook.
 *
 * The one edge that writes fact rather than intent. Nothing else in the app
 * creates one — a planned meal that the reader skipped must leave nothing
 * behind, so a day passing writes nothing here.
 */
export async function POST(request: Request) {
	const draft = await readAs(request, parseCookDraft)

	if (!draft.ok) return refuse(draft.issues)

	return Response.json(await addCook(draft.value), { status: 201 })
}
