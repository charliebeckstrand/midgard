import { describe, expect, it } from 'vitest'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { Kbd } from '../../../components/kbd'
import { ArrowUp } from '../../../primitives/icons/icons'
import { renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/** The rendered box of each key in `container`, in document order. */
const boxes = (container: HTMLElement) =>
	[...container.querySelectorAll('kbd')].map((key) => key.getBoundingClientRect())

const iconKey = (
	<Kbd>
		<Icon icon={<ArrowUp />} />
	</Kbd>
)

/**
 * A key with only an icon is a square as tall as a key with text, at each
 * density step, in a line of text and in a button.
 */
describe('an icon-only Kbd (real browser)', () => {
	it.for(['xs', 'sm', 'md', 'lg', 'xl'])('is a square as tall as a text key at %s', (step) => {
		const { container } = renderUI(
			<div data-density={step}>
				<p>
					<Kbd>K</Kbd> {iconKey}
				</p>
				<Button>
					Go <Kbd>K</Kbd>
				</Button>
				<Button>Go {iconKey}</Button>
			</div>,
		)

		const [text, icon, buttonText, buttonIcon] = boxes(container)

		for (const [key, square] of [
			[text, icon],
			[buttonText, buttonIcon],
		] as const) {
			expect(square?.width).toBeNear(square?.height ?? 0, HALF_PIXEL)

			expect(square?.height).toBeNear(key?.height ?? 0, HALF_PIXEL)
		}
	})
})
