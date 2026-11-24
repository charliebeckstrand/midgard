'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/button'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover'
import { useIntl } from '../../primitives/intl/use-intl'
import { Flex } from '../../structure/flex'
import { Stack } from '../../structure/stack'
import { useWysiwyg } from './context'
import { WysiwygActionButton } from './wysiwyg-action-button'
import { wysiwygActions, wysiwygMessages } from './wysiwyg-actions'

/**
 * The link button of a {@link WysiwygToolbar}, and the popover that it opens.
 * The popover has a text field, a URL field, Apply, and Remove link while the
 * selection is in a link. The link shortcut of the field opens the same
 * popover.
 *
 * @remarks The button opens a popover, so it has `aria-haspopup="dialog"` and
 * no `aria-pressed`. It shows the held-down fill while the caret is in a link.
 * The text field holds the selected text, or the text of the link at a caret.
 * While the popover is open, the field marks that text, or the caret, as the
 * focus is in the popover. Apply sets the text and the link, and a selection
 * stays selected. At a caret outside a link, the text goes in at the caret.
 * With no text, the URL is the text. Apply and Remove link move the focus back
 * to the field. Escape and an outside press close the popover, and the focus
 * goes back to the button.
 * @internal
 */
export function WysiwygLinkButton() {
	const { linkOpen, setLinkOpen, registerLink } = useWysiwyg()

	const intl = useIntl()

	useEffect(registerLink, [registerLink])

	return (
		<Popover placement="bottom-start" open={linkOpen} onOpenChange={setLinkOpen}>
			<PopoverTrigger>
				<WysiwygActionButton action="link" />
			</PopoverTrigger>
			<PopoverContent aria-label={intl.formatMessage(wysiwygActions.link.message)}>
				<WysiwygLinkForm />
			</PopoverContent>
		</Popover>
	)
}

/**
 * The form of the link popover. It mounts as the popover opens, so its fields
 * hold the text and the URL of the selection. The text field takes the focus
 * when it is empty, and the URL field takes it else. The field marks the
 * selection while the form is mounted.
 *
 * @internal
 */
function WysiwygLinkForm() {
	const { linkDraft, setLink, setLinkOpen, holdSelection } = useWysiwyg()

	const intl = useIntl()

	// The draft of the selection as the popover opens. The selection cannot
	// change while the focus is in the popover.
	const [draft] = useState(linkDraft)

	const textInput = useRef<HTMLInputElement>(null)

	const hrefInput = useRef<HTMLInputElement>(null)

	useEffect(() => {
		holdSelection(true)

		return () => holdSelection(false)
	}, [holdSelection])

	// The panel is placed after it mounts, so the focus scrolls nothing.
	useEffect(() => {
		const input = draft.text === '' ? textInput : hrefInput

		input.current?.focus({ preventScroll: true })
	}, [draft])

	function apply(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		const data = new FormData(event.currentTarget)

		const href = String(data.get('href') ?? '').trim()

		// An empty URL on a selection with no link changes nothing.
		if (href !== '' || draft.href !== '') setLink(href, String(data.get('text') ?? ''))

		setLinkOpen(false)
	}

	function remove() {
		setLink('', draft.text)

		setLinkOpen(false)
	}

	return (
		<form data-slot="wysiwyg-link-form" onSubmit={apply}>
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
