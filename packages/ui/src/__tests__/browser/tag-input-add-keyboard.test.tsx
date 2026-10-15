import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { TagInput } from '../../components/tag-input'
import { renderUI, screen } from '../helpers'

/**
 * A keyboard user can reach the Add button of a TagInput and use it.
 *
 * A blur committed the draft and cleared it, and the empty draft disabled the
 * Add button as the Tab key moved the focus to it. The browser then moved the
 * focus to `<body>`. Now a blur to the Add button keeps the draft, and a blur
 * from the Add button to a different element commits it.
 *
 * Rides the real browser because jsdom does not move the focus away from a
 * button that becomes disabled.
 */
describe('the Add button of a TagInput from the keyboard (real browser)', () => {
	it('takes the focus with the draft intact, and Enter on it adds the tag', async () => {
		renderUI(<TagInput aria-label="Tags" />)

		const input = screen.getByRole('textbox', { name: 'Tags' })

		input.focus()

		await userEvent.keyboard('react{Tab}')

		const add = screen.getByRole('button', { name: 'Add tag' })

		expect(add).toHaveFocus()

		expect(add).toBeEnabled()

		expect(input).toHaveValue('react')

		await userEvent.keyboard('{Enter}')

		expect(screen.getByRole('listitem')).toHaveTextContent('react')

		expect(input).toHaveValue('')

		expect(input).toHaveFocus()
	})

	it('commits the draft when the focus goes past the Add button', async () => {
		renderUI(
			<>
				<TagInput aria-label="Tags" />
				<button type="button">Next</button>
			</>,
		)

		const input = screen.getByRole('textbox', { name: 'Tags' })

		input.focus()

		await userEvent.keyboard('react{Tab}{Tab}')

		expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()

		expect(screen.getByRole('listitem')).toHaveTextContent('react')

		expect(input).toHaveValue('')
	})

	it('commits the draft on a blur to a different element', async () => {
		renderUI(
			<>
				<TagInput aria-label="Tags" />
				<button type="button">Next</button>
			</>,
		)

		const input = screen.getByRole('textbox', { name: 'Tags' })

		input.focus()

		await userEvent.keyboard('react')

		await userEvent.click(screen.getByRole('button', { name: 'Next' }))

		expect(screen.getByRole('listitem')).toHaveTextContent('react')

		expect(input).toHaveValue('')
	})
})
