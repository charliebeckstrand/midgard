import type { ReactNode } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Confirm } from '../../../components/confirm'
import { DialogBody } from '../../../components/dialog'
import { frames, getSlot, renderUI, screen } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * A Confirm with long children keeps its header and its actions in the
 * viewport, and the children scroll between them.
 *
 * From `sm` up, the dialog panel has a height cap and no overflow of its own.
 * Children that cannot shrink grow past the cap, and the actions go below the
 * viewport. The overlay is fixed and the page is locked, so nothing can scroll
 * them back into view. jsdom lays nothing out, so this check runs in the
 * browser.
 *
 * The header (the title and the description) stays outside the scroll region,
 * as the panel layout recipe sets. A long description is thus out of scope.
 */

/** The text of the last paragraph, which the scroll check starts from. */
const LAST = 'The last paragraph of the message.'

/** Paragraphs that are together much taller than the viewport. */
const PARAGRAPHS = [
	...Array.from({ length: 40 }, (_, at) => `Paragraph ${at + 1} of the message.`),
	LAST,
]

function paragraphs(): ReactNode {
	return PARAGRAPHS.map((text) => <p key={text}>{text}</p>)
}

/** Each form of long children, with or without a description. */
const FORMS: { form: string; description?: string; children: ReactNode }[] = [
	// The shape of the docs demo: no description, and a `DialogBody` in the children.
	{ form: 'children in a DialogBody', children: <DialogBody>{paragraphs()}</DialogBody> },
	{ form: 'plain children', children: paragraphs() },
	{
		form: 'a description and a DialogBody',
		description: 'Read the terms.',
		children: <DialogBody>{paragraphs()}</DialogBody>,
	},
	{
		form: 'a description and plain children',
		description: 'Read the terms.',
		children: paragraphs(),
	},
]

/** The box of the viewport, in the coordinates of `getBoundingClientRect`. */
function viewport() {
	return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
}

/**
 * The nearest ancestor of `node`, below `panel`, that scrolls its overflow on
 * the block axis. `null` when no box between them scrolls.
 */
function scrollerOf(node: HTMLElement, panel: HTMLElement): HTMLElement | null {
	for (let at = node.parentElement; at && at !== panel; at = at.parentElement) {
		const { overflowY } = getComputedStyle(at)

		if ((overflowY === 'auto' || overflowY === 'scroll') && at.scrollHeight > at.clientHeight) {
			return at
		}
	}

	return null
}

/** The top edge of the box of a text node. */
function textTop(node: ChildNode | undefined): number {
	if (!(node instanceof Text)) throw new Error('expected a text node')

	const range = document.createRange()

	range.selectNodeContents(node)

	return range.getBoundingClientRect().top
}

describe('Confirm children (real browser)', () => {
	// A desktop size. Below `sm`, the panel scrolls on its own, and the suite's own
	// frame is narrower than `sm`.
	beforeAll(() => page.viewport(1280, 800))

	it.each(FORMS)(
		'keeps the header and the actions in view with $form',
		async ({ description, children }) => {
			renderUI(
				<Confirm
					open
					onOpenChange={() => {}}
					onConfirm={() => {}}
					title="Terms"
					description={description}
				>
					{children}
				</Confirm>,
			)

			await frames()

			const panel = getSlot(document.body, 'confirm')

			const action = screen.getByRole('button', { name: 'Confirm' })

			expect(viewport()).toContainBox(panel)

			expect(panel).toContainBox(action)

			expect(viewport()).toContainBox(getSlot(panel, 'dialog-header'))

			expect(scrollerOf(screen.getByText(LAST), panel)).not.toBeNull()
		},
	)

	// With no description, the children are the message, often text with inline
	// marks. The region must not make each node a flex item on a line of its own.
	it('keeps inline children on one line with no description', async () => {
		renderUI(
			<Confirm open onOpenChange={() => {}} onConfirm={() => {}} title="Delete">
				Delete <strong>the file</strong> now?
			</Confirm>,
		)

		await frames()

		const body = getSlot(document.body, 'confirm-body')

		expect(getComputedStyle(body).display).toBe('block')

		const [before, , after] = body.childNodes

		expect(textTop(after)).toBeNear(textTop(before), HALF_PIXEL)
	})
})
