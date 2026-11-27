import { describe, expect, it } from 'vitest'
import { Field, Label } from '../../../components/fieldset'
import { FileUploadDrop } from '../../../components/file-upload'
import { getSlot, renderUI, screen } from '../../helpers'

/**
 * The drop prompt names the gesture of the primary pointer. The page has a touch
 * screen, so `pointer: coarse` matches, and the "tap" text shows.
 * `file-upload-prompt-pointer.test.tsx` holds the "click" text of a fine pointer.
 */
describe('FileUploadDrop prompt on a coarse pointer (real browser)', () => {
	it('shows only the "tap" text to a coarse pointer', () => {
		renderUI(<FileUploadDrop />)

		expect(screen.getByText('Drop files here or tap to browse')).toBeVisible()

		expect(screen.getByText('Drop files here or click to browse')).not.toBeVisible()
	})

	it('names the zone from the Label and the text that shows', () => {
		const { container } = renderUI(
			<Field>
				<Label>Resume</Label>
				<FileUploadDrop />
			</Field>,
		)

		expect(getSlot(container, 'file-upload')).toHaveAccessibleName(
			'Resume Drop files here or tap to browse',
		)
	})
})
