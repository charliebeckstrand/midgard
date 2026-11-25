'use client'

import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/button'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover'
import { useIntl } from '../../primitives/intl/use-intl'
import { Flex } from '../../structure/flex'
import { Stack } from '../../structure/stack'
import { isComposing } from '../../utilities/is-composing'
import { useWysiwyg } from './context'
import { WysiwygActionButton } from './wysiwyg-action-button'
import { wysiwygActions, wysiwygMessages } from './wysiwyg-actions'

/**
 * The link button of a {@link WysiwygToolbar}, and the popover that it opens.
 * The popover has a text field, a URL field, Apply, and Remove link while the
 * selection is in a link. The link shortcut of the field opens the same
 * popover. Each link button has its own popover, and with more than one, the
 * shortcut opens the popover of the last one that mounted.
 *
 * @remarks The button opens a popover, so it has `aria-haspopup="dialog"` and
 * no `aria-pressed`. It shows the held-down fill while the caret is in a link.
 * The text field holds the selected text, or the text of the link at a caret.
 * While the popover is open, the field marks that text, or the caret, as the
 * focus is in the popover. The mark goes at the close, before the exit
 * animation of the panel ends. Apply sets the text and the link, and a selection
 * stays selected. At a caret outside a link, the text goes in at the caret.
 * With no text, the URL is the text. Apply and Remove link move the focus back
 * to the field. Escape closes the popover. After the link shortcut or a press
 * of the button, the focus goes back to the field and its selection. After a
 * key on the button, it goes back to the button. An outside press closes the
 * popover, and the focus stays where the press put it.
 * @internal
 */
export function WysiwygLinkButton() {
	const { whenReady, registerLink, holdSelection } = useWysiwyg()

	const intl = useIntl()

	const [open, setOpen] = useState(false)

	useEffect(() => registerLink(() => setOpen(true)), [registerLink])

	// The field marks the selection while the popover is open. The panel stays
	// for its exit animation, but the mark goes at the close, as the focus goes
	// back to the field.
	useEffect(() => {
		if (!open) return

		holdSelection(true)

		return () => holdSelection(false)
	}, [open, holdSelection])

	// The popover opens on the editor, so its form holds the selection.
	function handleOpenChange(next: boolean) {
		if (next) whenReady(() => setOpen(true))
		else setOpen(false)
	}

	return (
		<Popover placement="bottom-start" open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger>
				<WysiwygActionButton action="link" />
			</PopoverTrigger>
			<PopoverContent aria-label={intl.formatMessage(wysiwygActions.link.message)}>
				<WysiwygLinkForm close={() => setOpen(false)} />
			</PopoverContent>
		</Popover>
	)
}

/**
 * The form of the link popover. It mounts as the popover opens, so its fields
 * hold the text and the URL of the selection. The text field takes the focus
 * when it is empty, and the URL field takes it else. Escape gives the focus
 * back to the field when the field had it as the popover opened.
 *
 * @internal
 */
function WysiwygLinkForm({ close }: { close: () => void }) {
	const { linkDraft, setLink, fieldFocused, focusField } = useWysiwyg()

	const intl = useIntl()

	// The draft of the selection as the popover opens. The selection cannot
	// change while the focus is in the popover.
	const [draft] = useState(linkDraft)

	// Whether the focus was in the field as the popover opened. The link
	// shortcut and a press of the button keep it there, and a key on the button
	// opens the popover with the focus on the button.
	const [fromField] = useState(fieldFocused)

	const textInput = useRef<HTMLInputElement>(null)

	const hrefInput = useRef<HTMLInputElement>(null)

	// The panel is placed after it mounts, so the focus scrolls nothing.
	useEffect(() => {
		const input = draft.text === '' ? textInput : hrefInput

		input.current?.focus({ preventScroll: true })
	}, [draft])

	function apply(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		const data = new FormData(event.currentTarget)

		const href = String(data.get('href') ?? '').trim()

		// An empty URL on a selection with no link changes nothing, and the focus
		// goes back to the field, as after a change.
		if (href !== '' || draft.href !== '') setLink(href, String(data.get('text') ?? ''))
		else focusField()

		close()
	}

	// Escape closes the popover. When the field had the focus, it goes back to
	// the field first, as on Apply, so the reader goes on typing at the
	// selection. The popover gives the focus back to the button only from the
	// popover or the body, so it then leaves the focus in the field. An Escape
	// that an input method takes, or that a handler cancels, does not close the
	// popover, so the focus stays.
	function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
		if (event.key !== 'Escape' || !fromField) return

		if (event.defaultPrevented || isComposing(event)) return

		focusField()
	}

	function remove() {
		setLink('', draft.text)

		close()
	}

	return (
		<form data-slot="wysiwyg-link-form" onSubmit={apply} onKeyDown={handleKeyDown}>
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
				<Flex justify="end" gap="sm">
					{draft.href !== '' && (
						<Button type="button" variant="plain" onClick={remove}>
							{intl.formatMessage(wysiwygMessages.removeLink)}
						</Button>
					)}
					<Button type="submit">{intl.formatMessage(wysiwygMessages.apply)}</Button>
				</Flex>
			</Stack>
		</form>
	)
}
