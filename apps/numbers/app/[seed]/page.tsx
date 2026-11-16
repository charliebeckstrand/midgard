import type { Metadata } from 'next'
import { RunPage } from '@/components/game-frame'

/**
 * The page renders with the seed and the settings of the request, so the first
 * paint has the run in its final layout, and an address that is not a seed has
 * no page.
 */
export const instant = false

type Params = { params: Promise<{ seed: string }> }

/** The run is the main page of the app, so its title is the name of the app only. */
export const metadata: Metadata = { title: { absolute: 'Numbers' } }

/** The run of the seed of the address. An address that is not a seed has no page. */
export default function SeedPage({ params }: Params) {
	return <RunPage params={params} />
}
