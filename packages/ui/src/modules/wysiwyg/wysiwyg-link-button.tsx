'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/button'
import {
	Dialog,
	DialogBody,
	DialogClose,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogTitle,
} from '../../components/dialog'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { useStableEvent } from '../../hooks/use-stable-event'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { Stack } from '../../structure/stack'
import { useWysiwyg } from './context'
import { WysiwygActionButton } from './wysiwyg-action-button'
import { wysiwygActions, wysiwygMessages } from './wysiwyg-actions'

/**
 * The link button of a {@link WysiwygToolbar}, and the dialog that it opens.
 * The dialog has a text field, a URL field, Cancel, Apply, and Remove link
 * while the selection is in a link. The link shortcut of the field opens the
 * same dialog. Each link button has its own dialog, and with more than one,
 * the shortcut opens the dialog of the last one that mounted.
 *
 * @remarks The button opens a dialog, so it has `aria-haspopup="dialog"` and
 * no `aria-pressed`. It shows the held-down fill while the caret is in a link.
 * The text field holds the selected text, or the text of the link at a caret,
 * and the URL field holds the URL of the link. The text field takes the focus
 * when it is empty, and the URL field takes it else. While the dialog is open,
 * the field marks that text, or the caret, as the focus is in the dialog. The
 * mark goes at the close. Apply sets the text and the link, and a selection
 * stays selected. At a caret outside a link, the text goes in at the caret.
 * With no text, the URL is the text. Apply and Remove link move the focus back
 * to the field. Escape, Cancel, and a press on the backdrop give the focus
 * back where it was as the dialog opened: in the field after the link
 * shortcut or a press of the button, and on the button after a key on it.
 * @internal
 */
export function WysiwygLinkButton() {
	const {
		fieldId,
		whenReady,
		registerLink,
		linkDraft,
		setLink,
		holdSelection,
		fieldFocused,
		focusField,
	} = useWysiwyg()

	const intl = useIntl()

	const [open, setOpen] = useState(false)

	// The text and the URL of the selection as the dialog opens. The selection
	// cannot change while the dialog is open.
	const [draft, setDraft] = useState({ text: '', href: '' })

	const textInput = useRef<HTMLInputElement>(null)

	const hrefInput = useRef<HTMLInputElement>(null)

	// Whether the field had the focus as the dialog opened. The link shortcut
	// and a press of the button keep it there, and a key on the button opens
	// the dialog with the focus on the button.
	const fromField = useRef(false)

	// The field, when the focus goes back to it at the close. Else the dialog
	// gives the focus back to the element that had it as the dialog opened.
	const returnFocus = useRef<HTMLElement | null>(null)

	// The dialog opens on the editor, so the draft holds the selection.
	const show = useStableEvent(() => {
		setDraft(linkDraft())

		fromField.current = fieldFocused()

		returnFocus.current = null

		setOpen(true)
	})

	useEffect(() => registerLink(show), [registerLink, show])

	// The field marks the selection while the dialog is open.
	useEffect(() => {
		if (!open) return

		holdSelection(true)

		return () => holdSelection(false)
	}, [open, holdSelection])

	// Closes the dialog. The focus goes back to the field after a change, or
	// when the field had it as the dialog opened. The field takes it at once,
	// with its selection, so the reader goes on typing at the selection.
	function close(changed: boolean) {
		if (changed || fromField.current) {
			focusField()

			returnFocus.current = document.getElementById(fieldId)
		}

		setOpen(false)
	}

	// The button opens the dialog, so the dialog asks only to close: on
	// Escape, Cancel, or a press on the backdrop.
	function handleOpenChange(next: boolean) {
		if (!next) close(false)
	}

	// Sets the text and the link, and closes the dialog.
	function change(href: string, text: string) {
		setLink(href, text)

		close(true)
	}

	function apply(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		const data = new FormData(event.currentTarget)

		const href = String(data.get('href') ?? '').trim()

		// An empty URL on a selection with no link changes nothing.
		if (href !== '' || draft.href !== '') change(href, String(data.get('text') ?? ''))
		else close(true)
	}

	return (
		<>
			<WysiwygActionButton
				action="link"
				aria-haspopup="dialog"
				aria-expanded={open}
				onClick={() => whenReady(show)}
			/>
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogPanel
					width="sm"
					initialFocus={draft.text === '' ? textInput : hrefInput}
					returnFocusTo={returnFocus}
				>
					<DialogHeader>
						<DialogTitle>{intl.formatMessage(wysiwygActions.link.message)}</DialogTitle>
					</DialogHeader>
					<form data-slot="wysiwyg-link-form" className="contents" onSubmit={apply}>
						<DialogBody>
							<Stack gap="md">
								<Field>
									<Label>{intl.formatMessage(wysiwygMessages.linkText)}</Label>
									<Input ref={textInput} name="text" defaultValue={draft.text} autoComplete="off" />
								</Field>
								<Field>
									<Label>{intl.formatMessage(wysiwygMessages.linkUrl)}</Label>
									<Input
										ref={hrefInput}
										name="href"
										type="url"
										defaultValue={draft.href}
										autoComplete="off"
									/>
								</Field>
							</Stack>
						</DialogBody>
						<DialogFooter>
							{draft.href !== '' && (
								<Button type="button" variant="plain" onClick={() => change('', draft.text)}>
									{intl.formatMessage(wysiwygMessages.removeLink)}
								</Button>
							)}
							<DialogClose>
								<Button type="button" variant="plain">
									{intl.formatMessage(intlMessages.cancel)}
								</Button>
							</DialogClose>
							<Button type="submit">{intl.formatMessage(wysiwygMessages.apply)}</Button>
						</DialogFooter>
					</form>
				</DialogPanel>
			</Dialog>
		</>
	)
}
