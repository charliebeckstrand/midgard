import { visitedSeed } from '@/server/visited-seed'
import { listVisits } from '@/server/visits-store'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** Every visited region, each scope alphabetical. */
export async function GET() {
	return Response.json(await listVisits(visitedSeed))
}
