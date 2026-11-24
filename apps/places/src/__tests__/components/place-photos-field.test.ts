// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FormDrawer } from '../../components/place-form-drawer/form-drawer'
import { PlacePhotosField } from '../../components/place-form-drawer/place-photos-field'

afterEach(cleanup)

// jsdom has no `ResizeObserver`, and the panel measures itself with one.
beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
})

/** Picks the files on the file input of the photo field. */
async function pick(...names: string[]) {
	const input = document.querySelector<HTMLInputElement>('input[type="file"]')

	if (input === null) throw new Error('The field has no file input.')

	const files = names.map(
		(name) => new File(['x'], name, { type: name.endsWith('.png') ? 'image/png' : 'image/gif' }),
	)

	await act(async () => {
		fireEvent.change(input, { target: { files } })
	})
}

function renderField() {
	render(
		h(FormDrawer<{ photos: [] }>, {
			open: true,
			onOpenChange: () => {},
			title: 'Edit place',
			submit: 'Save',
			editing: true,
			formKey: 'a',
			defaultValues: { photos: [] },
			validate: undefined,
			onSubmit: async () => undefined,
			children: h(PlacePhotosField, { progress: new Map() }),
		}),
	)
}

describe('PlacePhotosField', () => {
	it('names more than one refused file in the plural', async () => {
		renderField()

		await pick('a.gif', 'b.gif')

		expect(document.body.textContent).toContain('a.gif, b.gif are not JPEG, PNG, or WebP images.')
	})

	// The file upload leaves the feedback of a refusal to the field.
	it('shows the refusal in a status region', async () => {
		renderField()

		await pick('a.gif')

		// The shared announcer is a status region too, and can hold the same text.
		const statuses = screen.getAllByRole('status').map((region) => region.textContent)

		expect(statuses).toContain('a.gif is not a JPEG, PNG, or WebP image.')
	})

	it('names one refused file in the singular', async () => {
		renderField()

		await pick('a.gif')

		expect(document.body.textContent).toContain('a.gif is not a JPEG, PNG, or WebP image.')
	})

	// The first pick swaps the file field for the Add photos button. The focus
	// was on the file field, so it goes to the button, not to the page.
	it('moves the focus to the Add photos button after the first pick', async () => {
		renderField()

		const field = screen.getByRole('button', { name: /Add photos/ })

		field.focus()

		await pick('a.png')

		expect(document.activeElement).toBe(screen.getByRole('button', { name: /Add photos/ }))
	})

	// A full list disables the Add photos button, which cannot take the focus.
	it('moves the focus to the last Remove button after a first pick that fills the list', async () => {
		renderField()

		screen.getByRole('button', { name: /Add photos/ }).focus()

		await pick(...Array.from({ length: 13 }, (_, index) => `${index + 1}.png`))

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove photo 12' }))
	})

	it('moves the focus to the file field after the removal of the last photo', async () => {
		renderField()

		await pick('a.png')

		const remove = screen.getByRole('button', { name: 'Remove photo 1' })

		remove.focus()

		await act(async () => {
			fireEvent.click(remove)
		})

		expect(document.activeElement).toBe(document.querySelector('[data-slot="file-upload-field"]'))
	})
})
