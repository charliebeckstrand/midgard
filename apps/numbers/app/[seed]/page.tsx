import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GameFrame } from '@/components/game-frame'
import { isSeed } from '@/utilities/seed'

/** The page renders with the seed of the request, so the first paint has the run, and an address that is not a seed has no page. */
export const instant = false

type Params = { params: Promise<{ seed: string }> }

export const metadata: Metadata = { title: 'Run' }

/** The run of the seed of the address. An address that is not a seed has no page. */
export default async function SeedPage({ params }: Params) {
	const { seed } = await params

	if (!isSeed(seed)) notFound()

	return <GameFrame seed={seed} />
}
