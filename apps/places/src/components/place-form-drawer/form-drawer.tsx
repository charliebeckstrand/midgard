'use client'

import { X } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Alert } from 'ui/alert'
import { Button } from 'ui/button'
import { Drawer, DrawerBody, DrawerClose, DrawerFooter, DrawerPanel, DrawerTitle } from 'ui/drawer'
import { Form, type FormProps, type SubmitResult } from 'ui/form'
import { Icon } from 'ui/icon'
import { Columns } from 'ui/structure/columns'
import { Flex } from 'ui/structure/flex'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'

/**
 * The target a form drawer last opened on, or the current one while it is
 * open. A close clears the caller's target, and the panel stays mounted while
 * it slides out. Read directly, an edit would empty its own fields halfway
 * through its exit. Only an open writes the held target, so the next open still
 * seeds from what it was handed.
 */
export function useHeldTarget<T>(target: T | null): T | null {
	const [held, setHeld] = useState(target)

	useEffect(() => {
		if (target !== null) setHeld(target)
	}, [target])

	return target ?? held
}

/**
 * What the drawer says about a failed submit. A timed-out search for the typed
 * address gets its own words, because the platform's words for it name an
 * operation that the reader never started.
 */
function failureMessage(error: unknown): string {
	if (error instanceof DOMException && error.name === 'TimeoutError') {
		return 'The address search did not answer. Try again.'
	}

	return error instanceof Error ? error.message : String(error)
}

/** Props for {@link FormDrawer}. */
export type FormDrawerProps<V extends Record<string, unknown>> = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** What the panel calls itself. */
	title: string
	/** The record that the form writes to, under the title, where the form shows no field that names it. */
	subtitle?: string
	/** What the submit button says. */
	submit: string
	/** Whether the form changes a record on file, which colors the submit button. */
	editing: boolean
	/**
	 * A key that changes with the record that the form writes. A new key seeds
	 * the fields again, so a second edit does not keep the entry of the first.
	 */
	formKey: string
	defaultValues: V
	validate: FormProps<V>['validate']
	/**
	 * Writes the values. A result with field errors keeps the drawer open on
	 * those errors, and a rejection keeps it open with its message. Otherwise
	 * the drawer closes.
	 */
	onSubmit: (values: V) => Promise<SubmitResult<V> | undefined>
	/** The fields, in the two columns of the body. */
	children: ReactNode
}

/**
 * The half-height glass drawer that a record form sits in: the title and the
 * close, the fields in two columns from `sm`, the message of a refused write,
 * and Cancel and the submit button.
 *
 * The place form and the trip form are each one of these, so the two panels
 * answer the same corner, grow the same way, and say a refused write the same
 * way.
 */
export function FormDrawer<V extends Record<string, unknown>>({
	open,
	onOpenChange,
	title,
	subtitle,
	submit,
	editing,
	formKey,
	defaultValues,
	validate,
	onSubmit,
	children,
}: FormDrawerProps<V>) {
	// Why the last write failed. The route refuses a write for reasons that no
	// field shows, such as an email that is not verified or a full list. Without
	// this message, a refused write only left the drawer open.
	const [failure, setFailure] = useState<string | null>(null)

	useEffect(() => {
		if (open) setFailure(null)
	}, [open])

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerPanel
				glass
				// Grown to the form, and stopping at the screen rather than short of it —
				// the second case `DrawerProps.height` describes, measured here: at a 700px
				// window `auto` held the panel at 595 while the fields came to 709, leaving
				// the review below the fold.
				//
				// The travel matters to a form for its own reason. A validation message
				// appearing under a field changes the panel's height, and a panel that
				// jumped would move the fields under the reader's cursor at the moment they
				// are being told to fix one.
				height="fit"
				aria-label={title}
			>
				<Flex justify="between" align="center" className="px-6 pt-6">
					<div className="min-w-0">
						<DrawerTitle className="p-0">{title}</DrawerTitle>

						{subtitle === undefined ? null : (
							<Text tone="muted" className="truncate">
								{subtitle}
							</Text>
						)}
					</div>

					<DrawerClose>
						<ToggleIconButton icon={<Icon icon={<X />} />} aria-label="Close" />
					</DrawerClose>
				</Flex>

				<Form<V>
					// The drawer unmounts its children while closed, so the form re-seeds
					// from `defaultValues` on each open and an abandoned entry never comes
					// back. Keyed on the open state as well, which covers the one case the
					// unmount misses: a reopen while the close is still animating out.
					key={`${String(open)}:${formKey}`}
					defaultValues={defaultValues}
					validate={validate}
					onSubmit={async (values): Promise<SubmitResult<V> | undefined> => {
						setFailure(null)

						try {
							const result = await onSubmit(values)

							if (result !== undefined) return result
						} catch (error) {
							setFailure(failureMessage(error))

							return undefined
						}

						onOpenChange(false)

						return undefined
					}}
				>
					<DrawerBody>
						{/* Two columns from `sm`, which is what keeps the form short enough for
					    the panel to hold all of it: stacked, these fields run past any
					    screen and the reader scrolls to reach the button they are aiming
					    for. */}
						<Columns columns={{ initial: 1, sm: 2 }} gap="xl" align="start" className="pb-6">
							{children}

							{failure === null ? null : (
								<Alert severity="error" className="sm:col-span-2">
									<Text>{failure}</Text>
								</Alert>
							)}
						</Columns>
					</DrawerBody>

					<DrawerFooter>
						<Flex gap="sm" justify="end" full>
							<Button variant="plain" type="button" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>

							<Button type="submit" color={editing ? 'blue' : undefined}>
								{submit}
							</Button>
						</Flex>
					</DrawerFooter>
				</Form>
			</DrawerPanel>
		</Drawer>
	)
}
