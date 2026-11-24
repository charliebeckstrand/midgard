import { describe, expect, it } from 'vitest'
import { Menu, MenuContent, MenuItem, MenuSub } from '../../../components/menu'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'
import { getCenter } from '../../helpers/geometry/box'
import { gone } from '../helpers/exit'
import { sampleMotionFrames } from '../helpers/motion-frame'

/**
 * A submenu fades in when no submenu of its level is open. A submenu that
 * replaces an open sibling opens at once, and the sibling closes at once. Two
 * panels that fade across each other show the page through both.
 *
 * The real engine and real Motion are necessary. The instant Motion mock has
 * no fade.
 */
const row = (name: string) => screen.getByRole('menuitem', { name })

const submenu = (name: string) => screen.getByRole('menu', { name })

/** The opacity of `panel`, or `null` when the panel is not in the document. */
const opacity = (panel: HTMLElement) =>
	panel.isConnected ? Number(getComputedStyle(panel).opacity) : null

/** Whether `value` is an opacity that a fade passes through. */
const fading = (value: number | null) => value !== null && value > 0 && value < 1

/** Moves the pointer onto a row, which takes the cursor of its level. */
function hover(element: HTMLElement) {
	const at = getCenter(element)

	fireEvent.pointerMove(element, { clientX: at.x, clientY: at.y, pointerType: 'mouse' })
}

/** Opens a context menu with two adjacent submenus. */
async function openContextMenu() {
	renderUI(
		<Menu>
			<div data-testid="surface" style={{ width: 300, height: 200 }}>
				Surface
			</div>
			<MenuContent aria-label="Actions">
				<MenuItem>Edit</MenuItem>
				<MenuSub label="Share">
					<MenuItem>Copy link</MenuItem>
				</MenuSub>
				<MenuSub label="Export">
					<MenuItem>Export to CSV</MenuItem>
				</MenuSub>
			</MenuContent>
		</Menu>,
	)

	const surface = screen.getByTestId('surface')

	const at = getCenter(surface)

	fireEvent.contextMenu(surface, { clientX: at.x, clientY: at.y })

	await waitFor(() => expect(row('Edit')).toBeVisible())
}

/** Opens the Share submenu with the pointer, and waits for the end of its fade. */
async function openShare() {
	hover(row('Share'))

	const share = await screen.findByRole('menu', { name: 'Share' })

	await waitFor(() => expect(opacity(share)).toBe(1))

	return share
}

describe('a submenu that replaces an open sibling (real engine, real Motion)', () => {
	it('fades in the first submenu of a level', async () => {
		await openContextMenu()

		const tween = await sampleMotionFrames(
			() => screen.queryByRole('menu', { name: 'Share' })?.getAnimations().length ?? 0,
			(count) => count > 0,
			{ during: async () => hover(row('Share')) },
		)

		expect(tween).toBeGreaterThan(0)
	})

	it('opens the sibling and closes the open submenu with no fade', async () => {
		await openContextMenu()

		const share = await openShare()

		const samples: { share: number | null; export: number | null }[] = []

		await sampleMotionFrames(
			() => {
				const sample = {
					share: opacity(share),
					export: screen.queryByRole('menu', { name: 'Export' }),
				}

				samples.push({ share: sample.share, export: sample.export && opacity(sample.export) })

				return sample
			},
			(sample) => sample.share === null && sample.export !== null,
			{ during: async () => hover(row('Export')) },
		)

		expect(samples.filter((sample) => fading(sample.share) || fading(sample.export))).toEqual([])

		expect(opacity(submenu('Export'))).toBe(1)
	})

	it('fades out a submenu that opened at once when the root closes', async () => {
		await openContextMenu()

		await openShare()

		hover(row('Export'))

		const exportPanel = await screen.findByRole('menu', { name: 'Export' })

		await waitFor(() => expect(screen.queryByRole('menu', { name: 'Share' })).toBeNull())

		// A press on a row of the submenu closes the root. The submenu goes with it,
		// in the same fade.
		const tween = await sampleMotionFrames(
			() => exportPanel.getAnimations().length,
			(count) => count > 0,
			{ during: async () => fireEvent.click(row('Export to CSV')) },
		)

		expect(tween).toBeGreaterThan(0)

		await gone(exportPanel)
	})
})
