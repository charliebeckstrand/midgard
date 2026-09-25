import { act } from '@testing-library/react'
import { describe, expect, it, type Mock, vi } from 'vitest'
import { type DashboardLayoutItem, DashboardTile } from '../../modules/dashboard'
import { fireEvent, nonEmpty, present, renderUI, screen, stubMatchMedia } from '../helpers'
import {
	ControlledDashboard,
	pressSplitter,
	settleKeyboardLifts,
	stubCanvasWidth,
} from '../helpers/dashboard-board'

// A canvas of 1200 px gives a pitch of 50 px at 24 columns.
stubCanvasWidth()

settleKeyboardLifts()

/** Two free-form tiles of one span, side by side. */
const PAIR: DashboardLayoutItem[] = [
	{ id: 'a', x: 0, y: 0, w: 8, h: 10 },
	{ id: 'b', x: 8, y: 0, w: 8, h: 10 },
]

/** A controlled board in edit mode with the {@link PAIR} layout, in `dir`. */
function Board({ dir = 'ltr' }: { dir?: 'ltr' | 'rtl' }) {
	return (
		<div dir={dir}>
			<ControlledDashboard aria-label="Board" editing initial={PAIR}>
				<DashboardTile id="a" title="Revenue" minWidth={0} />

				<DashboardTile id="b" title="Traffic" minWidth={0} />
			</ControlledDashboard>
		</div>
	)
}

/** One glide that a tile plays: its keyframes, and the spy of its cancel. */
type Glide = { keyframes: Keyframe[]; cancel: Mock<() => void> }

/**
 * Gives the shell of the tile `name` what jsdom lacks for a glide. jsdom lays
 * nothing out, so the shell reports a width of 8 columns at a pitch of 50 px.
 * jsdom has no Web Animations API, so the shell records each glide instead.
 *
 * @returns Each glide of the tile, and a count of the reads of its width.
 */
function watchGlides(name: string): { glides: Glide[]; widthReads: () => number } {
	const card = screen.getByRole('group', { name })

	const shell = present(
		card.closest<HTMLElement>('[data-slot="dashboard-tile"]'),
		`the shell of ${name}`,
	)

	const glides: Glide[] = []

	let reads = 0

	Object.defineProperty(shell, 'offsetWidth', {
		configurable: true,
		get: () => {
			reads++

			return 400
		},
	})

	shell.animate = (keyframes) => {
		const glide: Glide = { keyframes: keyframes as Keyframe[], cancel: vi.fn() }

		glides.push(glide)

		return { cancel: glide.cancel } as unknown as Animation
	}

	shell.getAnimations = () =>
		glides
			.filter((glide) => glide.cancel.mock.calls.length === 0)
			.map((glide) => ({ cancel: glide.cancel }) as unknown as Animation)

	return { glides, widthReads: () => reads }
}

/** The press of the main mouse button, which the pointer sensor needs. */
const PRIMARY = { isPrimary: true, button: 0 }

/** Lets the keyboard sensor attach its keys, one timer after a lift. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

/** Lifts Revenue with the keyboard, and carries it 8 columns with `key`. */
async function carryRevenue(key: 'ArrowLeft' | 'ArrowRight'): Promise<HTMLElement> {
	const grip = screen.getByRole('button', { name: 'Move Revenue' })

	grip.focus()

	fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

	await settle()

	for (let step = 0; step < 8; step++) fireEvent.keyDown(grip, { code: key, key })

	return grip
}

describe('the glide of a dashboard tile', () => {
	it.each([
		['ltr', 'ArrowRight', 'translate(400px, 0px)'],
		['rtl', 'ArrowLeft', 'translate(-400px, 0px)'],
	] as const)('glides the partner of a %s move from its old cell', async (dir, key, from) => {
		renderUI(<Board dir={dir} />)

		const traffic = watchGlides('Traffic')

		await carryRevenue(key)

		// Revenue covers the cell of Traffic, and Traffic takes the cell that Revenue left.
		expect(traffic.glides.at(-1)?.keyframes).toMatchObject([
			{ transform: from },
			{ transform: 'translate(0px, 0px)' },
		])
	})

	it('snaps a keyboard resize, and reads no width for it', () => {
		renderUI(<Board />)

		const revenue = watchGlides('Revenue')

		pressSplitter('Revenue', 1, 'ArrowDown')

		expect(revenue.glides).toEqual([])

		expect(revenue.widthReads()).toBe(0)
	})

	it('snaps each move under reduced motion', async () => {
		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		renderUI(<Board />)

		const traffic = watchGlides('Traffic')

		await carryRevenue('ArrowRight')

		expect(traffic.glides).toEqual([])
	})

	it('raises a glide over the chrome of the later tiles, and under the lifted tile', async () => {
		renderUI(<Board />)

		const traffic = watchGlides('Traffic')

		await carryRevenue('ArrowRight')

		expect(traffic.glides.at(-1)?.keyframes.map((frame) => frame.zIndex)).toEqual([20, 20])
	})

	it('ends a glide that runs when a pickup lifts the tile, so the tile follows at once', async () => {
		renderUI(<Board />)

		const traffic = watchGlides('Traffic')

		const grip = await carryRevenue('ArrowRight')

		fireEvent.keyDown(grip, { code: 'Space', key: ' ' })

		await settle()

		// The swap moves Traffic once, so it plays one glide, and the drop leaves it alone.
		expect(traffic.glides).toHaveLength(1)

		const [glide] = nonEmpty(traffic.glides, 'glide of Traffic')

		expect(glide.cancel).not.toHaveBeenCalled()

		const card = screen.getByRole('group', { name: 'Traffic' })

		fireEvent.pointerDown(card, { ...PRIMARY, clientX: 0, clientY: 0 })

		// The pointer sensor lifts the tile after 3 px of travel.
		fireEvent.pointerMove(document, { ...PRIMARY, clientX: 10, clientY: 0 })

		// Read before the drop, because the glide of a drop ends each glide too.
		const cancels = glide.cancel.mock.calls.length

		fireEvent.pointerUp(document, { ...PRIMARY, clientX: 10, clientY: 0 })

		// dnd-kit removes its click guard from the document 50 ms after a release.
		await act(() => new Promise((resolve) => setTimeout(resolve, 60)))

		expect(cancels).toBe(1)
	})
})
