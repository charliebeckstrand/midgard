import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../../components/collapse'
import type { Mount } from '../../../primitives/mount'
import { present, renderUI, screen, waitFor } from '../../helpers'
import { sampleMotionFrames } from '../helpers/motion-frame'
import { budget } from '../helpers/wall-clock'

/**
 * A Collapse panel clips its content only while its height moves. At rest, the
 * focus outline of a link on the edge of the panel is not clipped.
 *
 * Real Motion is necessary: the motion targets hold the clip, and the instant
 * mock removes them.
 */
const PANEL = '[data-slot="collapse-panel"]'

const panel = () => present(document.querySelector(PANEL), PANEL)

const overflow = () => getComputedStyle(panel()).overflow

/** The height and the overflow of the panel on one frame. */
type Sample = { height: number; overflow: string }

/**
 * Reads the panel on each frame, after Motion writes its styles, until `done` is
 * true. A frame where the panel is not on the page, or where the hold hides it,
 * gives no sample. It throws when `done` is still false at the deadline.
 */
async function watch(done: () => boolean): Promise<Sample[]> {
	const samples: Sample[] = []

	await sampleMotionFrames(
		() => {
			if (done()) return true

			const node = document.querySelector(PANEL)

			const style = node && getComputedStyle(node)

			if (node && style && style.display !== 'none') {
				samples.push({ height: node.getBoundingClientRect().height, overflow: style.overflow })
			}

			return false
		},
		(finished) => finished,
		{ deadline: budget(5000) },
	)

	return samples
}

/** The samples where the height of the panel is not at its open height. */
const moving = (samples: Sample[], open: number) =>
	samples.filter((sample) => sample.height < open - 1)

function Disclosure(props: {
	animate?: 'fade' | 'slide' | false
	defaultOpen?: boolean
	mount?: Mount
	onOpenComplete?: () => void
}) {
	return (
		<Collapse {...props}>
			<CollapseTrigger>Toggle</CollapseTrigger>
			<CollapsePanel>
				<div style={{ height: 120 }}>
					<a href="#edge">Edge link</a>
				</div>
			</CollapsePanel>
		</Collapse>
	)
}

const toggle = () => userEvent.click(screen.getByRole('button', { name: 'Toggle' }))

const modes = [
	['fade', 'active'],
	['slide', 'active'],
	['fade', 'always'],
	['slide', 'always'],
] as const

describe('the clip of a Collapse panel (real Motion)', () => {
	it.each(['fade', 'slide', false] as const)(
		'has no clip on a panel that mounts open, animate=%s',
		(animate) => {
			renderUI(<Disclosure animate={animate} defaultOpen />)

			expect(overflow()).toBe('visible')
		},
	)

	it.each(modes)(
		'clips a %s panel (mount=%s) while it opens, and not when the open lands',
		async (animate, mount) => {
			const onOpenComplete = vi.fn()

			renderUI(<Disclosure animate={animate} mount={mount} onOpenComplete={onOpenComplete} />)

			const opening = watch(() => onOpenComplete.mock.calls.length > 0)

			await toggle()

			const samples = await opening

			await waitFor(() => expect(overflow()).toBe('visible'))

			const steps = moving(samples, panel().getBoundingClientRect().height)

			expect(steps.length).toBeGreaterThan(0)

			expect(steps.filter((sample) => sample.overflow !== 'hidden')).toEqual([])
		},
	)

	it.each(modes)(
		'clips a %s panel (mount=%s) before its close moves the height',
		async (animate, mount) => {
			renderUI(<Disclosure animate={animate} mount={mount} defaultOpen />)

			const open = panel().getBoundingClientRect().height

			const closing = watch(() => {
				const node = document.querySelector(PANEL)

				return !node || getComputedStyle(node).display === 'none'
			})

			await toggle()

			const steps = moving(await closing, open)

			expect(steps.length).toBeGreaterThan(0)

			expect(steps.filter((sample) => sample.overflow !== 'hidden')).toEqual([])
		},
	)
})
