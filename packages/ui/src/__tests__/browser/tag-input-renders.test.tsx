import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { TagInput } from '../../components/tag-input'
import { renderUI, screen } from '../helpers'
import { componentRenders } from './helpers/motion-renders'

const TAGS = Array.from({ length: 20 }, (_, index) => `tag${index}`)

/**
 * A keystroke in the draft renders no chip, and a new tag renders only its own
 * chip. Each chip took a new `removeProps` object and a new `onRemove` closure
 * on each render of the field, so each keystroke rendered each chip.
 *
 * The count reads the `Badge` inside each chip, because the name of the memoized
 * chip is the name of the function that it wraps.
 */
describe('TagInput chip renders', () => {
	it('renders no chip on a keystroke in the draft', async () => {
		const { container } = renderUI(<TagInput aria-label="Tags" defaultValue={TAGS} />)

		screen.getByRole('textbox', { name: 'Tags' }).focus()

		await userEvent.keyboard('r')

		// The field renders, so the walk is live.
		expect(componentRenders(container, 'TagInput')).toBeGreaterThan(0)

		expect(componentRenders(container, 'Badge')).toBe(0)
	})

	it('renders only the new chip when a tag is added', async () => {
		const { container } = renderUI(<TagInput aria-label="Tags" defaultValue={TAGS} />)

		screen.getByRole('textbox', { name: 'Tags' }).focus()

		await userEvent.keyboard('react{Enter}')

		expect(screen.getAllByRole('listitem')).toHaveLength(TAGS.length + 1)

		expect(componentRenders(container, 'Badge')).toBe(1)
	})
})
