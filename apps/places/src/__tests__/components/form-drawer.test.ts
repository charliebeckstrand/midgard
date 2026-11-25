// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FormDrawer, type FormDrawerProps } from '../../components/place-form-drawer/form-drawer'

type Values = { name: string }

/** A promise and the functions that settle it. */
function deferred() {
	let resolve: () => void = () => {}

	let reject: (error: Error) => void = () => {}

	const promise = new Promise<undefined>((done, fail) => {
		resolve = () => done(undefined)

		reject = fail
	})

	return { promise, resolve, reject }
}

/** The props of a drawer that is open on the record of `formKey`. */
function props(
	formKey: string,
	overrides: Partial<FormDrawerProps<Values>> = {},
): FormDrawerProps<Values> {
	return {
		open: true,
		onOpenChange: vi.fn(),
		title: 'Edit place',
		submit: 'Save',
		editing: true,
		formKey,
		defaultValues: { name: formKey },
		validate: undefined,
		onSubmit: async () => undefined,
		children: null,
		...overrides,
	}
}

describe('FormDrawer', () => {
	it('closes after a submit that succeeds', async () => {
		const onOpenChange = vi.fn()

		render(h(FormDrawer<Values>, props('a', { onOpenChange })))

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Save' }))
		})

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('shows the message of a submit that fails', async () => {
		render(
			h(
				FormDrawer<Values>,
				props('a', {
					onSubmit: async () => {
						throw new Error('The list is full.')
					},
				}),
			),
		)

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Save' }))
		})

		expect(screen.getByText('The list is full.')).toBeInTheDocument()
	})

	// `Form` reads an empty issue as no issue, so a failure with no message
	// would close the drawer as a success and lose the entry.
	it('stays open with fixed words after a submit that fails with no message', async () => {
		const onOpenChange = vi.fn()

		render(
			h(
				FormDrawer<Values>,
				props('a', {
					onOpenChange,
					onSubmit: async () => {
						throw new Error()
					},
				}),
			),
		)

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Save' }))
		})

		expect(onOpenChange).not.toHaveBeenCalled()

		expect(screen.getByText('The write did not complete. Try again.')).toBeInTheDocument()
	})

	// A slow save of one record that lands after the reader opened another
	// record does not close the form of the other record.
	it('does not close the form of another record when an earlier submit succeeds', async () => {
		const save = deferred()

		const onOpenChange = vi.fn()

		const { rerender } = render(
			h(FormDrawer<Values>, props('a', { onOpenChange, onSubmit: () => save.promise })),
		)

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Save' }))
		})

		rerender(h(FormDrawer<Values>, props('b', { onOpenChange })))

		await act(async () => save.resolve())

		expect(onOpenChange).not.toHaveBeenCalled()
	})

	it('does not show the message of an earlier submit in the form of another record', async () => {
		const save = deferred()

		const { rerender } = render(h(FormDrawer<Values>, props('a', { onSubmit: () => save.promise })))

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Save' }))
		})

		rerender(h(FormDrawer<Values>, props('b')))

		await act(async () => save.reject(new Error('The list is full.')))

		expect(screen.queryByText('The list is full.')).toBeNull()
	})
})
