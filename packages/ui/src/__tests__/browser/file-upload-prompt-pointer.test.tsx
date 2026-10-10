import { describe, expect, it } from 'vitest'
import { Field, Label } from '../../components/fieldset'
import { FileUploadDrop } from '../../components/file-upload'
import { getSlot, renderUI, screen } from '../helpers'

/**
 * The drop prompt names the gesture of the primary pointer. jsdom resolves no
 * media query, so this runs in the browser suite. The suite drives Chromium
 * with a mouse, so `pointer: fine` matches, and the "click" text shows. The
 * suite cannot match a coarse pointer (see `touch-target-geometry.test.tsx`).
 */
describe('FileUploadDrop prompt by pointer (real browser)', () => {
	it('shows only the "click" text to a fine pointer', () => {
		renderUI(<FileUploadDrop />)

		expect(screen.getByText('Drop files here or click to browse')).toBeVisible()

		expect(screen.getByText('Drop files here or tap to browse')).not.toBeVisible()
	})

	it('names the zone from the Label and the text that shows', () => {
		const { container } = renderUI(
			<Field>
				<Label>Resume</Label>
				<FileUploadDrop />
			</Field>,
		)

		expect(getSlot(container, 'file-upload')).toHaveAccessibleName(
			'Resume Drop files here or click to browse',
		)
	})
})
