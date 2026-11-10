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
import { GlassSurfacesContext } from '../../../providers/glass/context'
import { Container } from '../../../structure/container'
import { frames, getSlot, renderUI } from '../../helpers'
import { pause } from '../helpers/wall-clock'

/**
 * PROBE: a `fit` drawer must grow to hold a box whose height comes from its
 * width, such as a map frame. This runs in each engine.
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

function ProbeMap({ shapes }: { shapes: boolean }) {
	return (
		<MapPlat
			aria-label="Probe"
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
	<ProbeMap key="map" shapes={false} />,
	<ProbeMap key="map" shapes />,
]

let goTo: (stage: number) => void = () => {}

function Probe({ app }: { app: boolean }) {
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
				<DrawerPanel height="fit" footer={null} aria-label="Probe">
					<DrawerHeader className="px-0">
						<DrawerTitle>Texas › Governor</DrawerTitle>
					</DrawerHeader>

					<DrawerBody className="px-0">
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

const CASES: [string, boolean, number[]][] = [
	['at once', false, [0, 0, 0]],
	['mid travel', false, [60, 120, 200]],
	['after travels', false, [700, 700, 700]],
	['app tree, at once', true, [0, 0, 0]],
	['app tree, mid travel', true, [60, 120, 200]],
	['app tree, after travels', true, [700, 700, 700]],
	['app tree, as the app loads', true, [300, 840, 0]],
	['app tree, slow shapes', true, [300, 300, 1500]],
	['app tree, fast chunk', true, [20, 300, 600]],
]

describe('fit drawer switched to a map (PROBE)', () => {
	beforeAll(() => page.viewport(390, 844))

	for (const [name, app, delays] of CASES) {
		it(name, async () => {
			renderUI(<Probe app={app} />)

			await pause(800)

			const log: string[] = [`start ${read()}`]

			for (const [index, delay] of delays.entries()) {
				goTo(index + 1)

				await pause(delay)

				log.push(`stage ${index + 1} ${read()}`)
			}

			await pause(1500)

			await frames()

			const reading = read()

			log.push(`end ${reading}`)

			console.log(`[probe] ${name}\n${log.join('\n')}`)

			const [, client, scroll] = /body=(\d+)\/(\d+)/.exec(reading) ?? []

			expect(Number(scroll) - Number(client), log.join('\n')).toBeLessThanOrEqual(1)
		})
	}
})
