// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
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

	const files = names.map((name) => new File(['x'], name, { type: 'image/gif' }))

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

	it('names one refused file in the singular', async () => {
		renderField()

		await pick('a.gif')

		expect(document.body.textContent).toContain('a.gif is not a JPEG, PNG, or WebP image.')
	})
})
