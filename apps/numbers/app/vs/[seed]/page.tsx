import type { Metadata } from 'next'
import { RunPage } from '@/components/game-frame'

/**
 * The page renders with the seed and the settings of the request, so the first
 * paint has the two columns in their final layout, and an address that is not
 * a seed has no page.
 */
export const instant = false

type Params = { params: Promise<{ seed: string }> }

export const metadata: Metadata = { title: 'Vs CPU' }

/**
 * The run of the seed of the address against the CPU. `proxy.ts` sends `/vs`
 * to the address of a new seed.
 */
export default function VsSeedPage({ params }: Params) {
	return <RunPage params={params} vsCpu />
}
