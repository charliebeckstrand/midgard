import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Drawer, DrawerBody, DrawerPanel } from '../../../components/drawer'
import { MapPlat } from '../../../modules/map'
import { frames, getSlot, renderUI } from '../../helpers'

/**
 * PROBE: a `fit` drawer must grow to hold a box whose height comes from its
 * width, such as a map frame. This runs in each engine.
 */
function Probe({ children, bodyClassName }: { children: ReactNode; bodyClassName?: string }) {
	return (
		<Drawer open onOpenChange={() => {}}>
			<DrawerPanel height="fit" aria-label="Probe">
				<DrawerBody className={bodyClassName}>
					<div style={{ height: 42 }} />

					{children}
				</DrawerBody>
			</DrawerPanel>
		</Drawer>
	)
}

async function overflow(): Promise<string> {
	await frames()

	await frames()

	const panel = getSlot(document.body, 'drawer')

	const body = getSlot(document.body, 'drawer-body')

	return `panel=${Math.round(panel.getBoundingClientRect().height)} body=${body.clientHeight}/${body.scrollHeight} vh=${window.innerHeight}`
}

const aspect = <div className="w-full" style={{ aspectRatio: '1.02 / 1' }} />

const contained = (
	<div className="@container flex w-full min-w-48 flex-col">
		<div className="relative overflow-hidden" style={{ aspectRatio: '1.02 / 1' }} />
	</div>
)

const square = {
	type: 'FeatureCollection' as const,
	features: [
		{
			type: 'Feature' as const,
			id: 'a',
			properties: { name: 'A' },
			geometry: {
				type: 'Polygon' as const,
				coordinates: [
					[
						[0, 0],
						[100, 0],
						[100, 98],
						[0, 98],
						[0, 0],
					],
				],
			},
		},
	],
}

const map = (
	<MapPlat
		aria-label="Probe"
		geography={square}
		projection="identity"
		regionKey="id"
		data={[{ id: 'a', winner: 'X' }]}
		categoryKey="winner"
		categories={[{ value: 'X', color: 'blue' }]}
	/>
)

const CASES: [string, ReactNode, string | undefined][] = [
	['aspect box', aspect, undefined],
	['contained aspect box', contained, undefined],
	['contained aspect box, body basis auto', contained, 'flex-auto'],
	['map', map, undefined],
	['map, body basis auto', map, 'flex-auto'],
]

describe('fit drawer and a box sized by its width (PROBE)', () => {
	for (const [name, content, bodyClassName] of CASES) {
		it(name, async () => {
			renderUI(<Probe bodyClassName={bodyClassName}>{content}</Probe>)

			const reading = await overflow()

			const [, client, scroll] = /body=(\d+)\/(\d+)/.exec(reading) ?? []

			expect(Number(scroll) - Number(client), reading).toBeLessThanOrEqual(1)
		})
	}
})
