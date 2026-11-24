'use client'

import { type FormEvent, useEffect, useRef } from 'react'
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
 * The popover has a URL field, Apply, and Remove link while the selection is
 * in a link. The link shortcut of the field opens the same popover.
 *
 * @remarks The button opens a popover, so it has `aria-haspopup="dialog"` and
 * no `aria-pressed`. It shows the held-down fill while the caret is in a link.
 * Apply sets the link on the selection, or puts the URL as the text of a new
 * link at a caret. Apply and Remove link move the focus back to the field.
 * Escape and an outside press close the popover, and the focus goes back to
 * the button.
 * @internal
 */
export function WysiwygLinkButton() {
	const { linkOpen, setLinkOpen, registerLink } = useWysiwyg()

	const intl = useIntl()

	useEffect(registerLink, [registerLink])

	return (
		<Popover placement="bottom-start" open={linkOpen} onOpenChange={setLinkOpen}>
			<PopoverTrigger>
				<WysiwygActionButton action="link" toggle={false} onClick={() => undefined} />
			</PopoverTrigger>
			<PopoverContent aria-label={intl.formatMessage(wysiwygActions.link.message)}>
				<WysiwygLinkForm />
			</PopoverContent>
		</Popover>
	)
}

/**
 * The form of the link popover. It mounts as the popover opens, so its field
 * holds the URL of the link at the selection, and the field takes the focus.
 *
 * @internal
 */
function WysiwygLinkForm() {
	const { linkHref, setLink, setLinkOpen } = useWysiwyg()

	const intl = useIntl()

	const href = linkHref()

	const input = useRef<HTMLInputElement>(null)

	// The panel is placed after it mounts, so the focus scrolls nothing.
	useEffect(() => input.current?.focus({ preventScroll: true }), [])

	function apply(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		const next = String(new FormData(event.currentTarget).get('href') ?? '').trim()

		// An empty URL on a selection with no link changes nothing.
		if (next !== '' || href !== '') setLink(next)

		setLinkOpen(false)
	}

	function remove() {
		setLink('')

		setLinkOpen(false)
	}

	return (
		<form data-slot="wysiwyg-link-form" onSubmit={apply}>
			<Stack gap="md">
				<Field>
					<Label>{intl.formatMessage(wysiwygMessages.linkUrl)}</Label>
					<Input ref={input} name="href" type="url" defaultValue={href} autoComplete="off" />
				</Field>
				<Flex justify="end" gap="sm">
					{href !== '' && (
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
