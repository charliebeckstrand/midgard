import { type ReactNode, useState } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import {
	Drawer,
	DrawerBody,
	DrawerHeader,
	DrawerPanel,
	DrawerTitle,
} from '../../../components/drawer'
import { MapPlat } from '../../../modules/map'
import { GlassSurfacesContext } from '../../../primitives/glass/context'
import { Container } from '../../../structure/container'
import { getSlot, renderUI } from '../../helpers'
import { sampleUntil, settledValue } from '../helpers/sample'
import { budget, pause } from '../helpers/wall-clock'

/**
 * A `fit` drawer must grow to hold a box whose height comes from its width,
 * such as a map frame. This runs in each engine.
 */

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

function StageMap({ shapes }: { shapes: boolean }) {
	return (
		<MapPlat
			aria-label="Race map"
			geography={shapes ? square : null}
			projection="identity"
			regionKey="id"
			data={shapes ? [{ id: 'a', winner: 'X' }] : []}
			categoryKey="winner"
			categories={shapes ? [{ value: 'X', color: 'blue' }] : []}
		/>
	)
}

/** The steps of a switch to the map: the overview, a placeholder, the map with no shapes, the map. */
const STAGES: ReactNode[] = [
	<div key="overview" style={{ height: 600 }} />,
	<div key="placeholder" style={{ height: 16 }} />,
	<StageMap key="map" shapes={false} />,
	<StageMap key="map" shapes />,
]

let goTo: (stage: number) => void = () => {}

function FitDrawer({ app }: { app: boolean }) {
	const [stage, setStage] = useState(0)

	goTo = setStage

	const content = (
		<div className="flex flex-col gap-8">
			<div style={{ height: 36 }} />

			{STAGES[stage]}
		</div>
	)

	return (
		<GlassSurfacesContext value={app}>
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel height="fit" footer={null} aria-label="Race">
					<DrawerHeader className="px-0">
						<DrawerTitle>Texas › Governor</DrawerTitle>
					</DrawerHeader>

					<DrawerBody className="mx-0">
						{app ? (
							<Container size="lg" padding="lg" className="h-auto">
								<div className="max-w-[440px]">{content}</div>
							</Container>
						) : (
							content
						)}
					</DrawerBody>
				</DrawerPanel>
			</Drawer>
		</GlassSurfacesContext>
	)
}

function read(): string {
	const panel = getSlot(document.body, 'drawer')

	const body = getSlot(document.body, 'drawer-body')

	return `panel=${panel.getBoundingClientRect().height.toFixed(1)} pin=${panel.style.height || '-'} body=${body.clientHeight}/${body.scrollHeight} vh=${window.innerHeight}`
}

/**
 * The reading of {@link read}, and the top edge of the panel. An engine with no
 * Motion mock slides the panel in, and the slide moves the edge but not the
 * height.
 */
function rest(): string {
	return `${read()} top=${getSlot(document.body, 'drawer').getBoundingClientRect().top.toFixed(1)}`
}

/** Whether the last stage has landed: the map in the drawer draws its shapes. */
function landed(): boolean {
	return getSlot(document.body, 'drawer-body').querySelector('[data-region-index]') !== null
}

/**
 * The time in milliseconds that the drawer holds each step after the overview:
 * the placeholder, the map with no shapes, and the map.
 */
type Holds = [number, number, number]

/** The holds that each tree runs: steps that land at once, during the travel of the height, and after it. */
const TRAVEL_CASES: [string, Holds][] = [
	['each step lands at once', [0, 0, 0]],
	['each step lands mid travel', [60, 120, 200]],
	['each step lands after the travel ends', [700, 700, 700]],
]

/** The holds of an app that loads the map chunk and then fetches the shapes. */
const LOAD_CASES: [string, Holds][] = [
	['the chunk takes 300 ms and the shapes take 840 ms', [300, 840, 0]],
	['the chunk and the shapes take 300 ms each and the map holds for 1.5 s', [300, 300, 1500]],
	['the chunk takes 20 ms', [20, 300, 600]],
]

/**
 * Shows each step after the overview for its hold. Returns the stage log and the
 * overflow of the body in pixels after the drawer settles on the map.
 */
async function switchToMap(app: boolean, holds: Holds): Promise<{ log: string; overflow: number }> {
	renderUI(<FitDrawer app={app} />)

	// The first stage starts from a drawer at rest. Wait until its boxes, its pin,
	// and its place stay the same for five frames, and not for a fixed time.
	await settledValue(rest, { frames: 5, deadline: budget(3_000) })

	const log: string[] = [`start ${read()}`]

	for (const [index, hold] of holds.entries()) {
		goTo(index + 1)

		await pause(hold)

		log.push(`stage ${index + 1} ${read()}`)
	}

	// Wait for the end state, with a deadline, and not for a fixed time: under
	// load the settle can take longer than a hold. The body of an earlier
	// stage can fit too, so a fit alone is not the signal. First the last
	// stage lands. Then the drawer settles: its boxes and its pin stay the
	// same for five frames, which spans the frame in which a resize starts
	// the travel of the height. A drawer that stays pinned too short
	// settles with an overflow, or the wait fails at its deadline.
	await sampleUntil(landed, Boolean, { deadline: budget(3_000) })

	const reading = await settledValue(read, { frames: 5, deadline: budget(3_000) })

	log.push(`end ${reading}`)

	const [, client, scroll] = /body=(\d+)\/(\d+)/.exec(reading) ?? []

	return { log: log.join('\n'), overflow: Number(scroll) - Number(client) }
}

describe('a fit Drawer that switches to a map (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	describe('in a bare body', () => {
		for (const [name, holds] of TRAVEL_CASES) {
			it(`ends with no overflow when ${name}`, async () => {
				const { log, overflow } = await switchToMap(false, holds)

				expect(overflow, log).toBeLessThanOrEqual(1)
			})
		}
	})

	describe('in the app tree', () => {
		for (const [name, holds] of [...TRAVEL_CASES, ...LOAD_CASES]) {
			it(`ends with no overflow when ${name}`, async () => {
				const { log, overflow } = await switchToMap(true, holds)

				expect(overflow, log).toBeLessThanOrEqual(1)
			})
		}
	})
})
