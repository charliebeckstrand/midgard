'use client'

import { Bold, Italic, List, ListOrdered } from 'lucide-react'
import { type ReactElement, useRef } from 'react'
import { flushSync } from 'react-dom'
import { Button } from 'ui/button'
import { Field, Label } from 'ui/fieldset'
import { useFormValue } from 'ui/form'
import { Icon } from 'ui/icon'
import { Textarea } from 'ui/textarea'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from 'ui/toolbar'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { type ReviewEdit, toggleList, toggleMarker } from './place-review'

/**
 * The review of a visit: a toolbar of Markdown formats over the textarea.
 *
 * The Place sheet renders the review as Markdown, so each button writes the
 * Markdown of its format into the text. It does not keep a second form of the
 * text. A button keeps the focus and the selection in the textarea, so the
 * reader can type on after a press.
 */
export function PlaceReviewField() {
	const { setValue } = useFormValue<string>('review', {})

	const ref = useRef<HTMLTextAreaElement>(null)

	const apply = (format: (edit: ReviewEdit) => ReviewEdit) => {
		const textarea = ref.current

		if (!textarea) return

		const next = format({
			value: textarea.value,
			start: textarea.selectionStart,
			end: textarea.selectionEnd,
		})

		// The new value must be in the textarea before the selection moves, because
		// a new value puts the caret at the end.
		flushSync(() => setValue(next.value))

		textarea.focus()

		textarea.setSelectionRange(next.start, next.end)
	}

	return (
		<Field className="sm:col-span-2">
			<Label>Your review</Label>

			<Toolbar aria-label="Formatting">
				<ToolbarGroup>
					<FormatButton
						label="Bold"
						icon={<Bold />}
						onPress={() => apply((edit) => toggleMarker(edit, 'bold'))}
					/>

					<FormatButton
						label="Italic"
						icon={<Italic />}
						onPress={() => apply((edit) => toggleMarker(edit, 'italic'))}
					/>
				</ToolbarGroup>

				<ToolbarSeparator />

				<ToolbarGroup>
					<FormatButton
						label="Bulleted list"
						icon={<List />}
						onPress={() => apply((edit) => toggleList(edit, 'bulleted'))}
					/>

					<FormatButton
						label="Numbered list"
						icon={<ListOrdered />}
						onPress={() => apply((edit) => toggleList(edit, 'numbered'))}
					/>
				</ToolbarGroup>
			</Toolbar>

			<Textarea ref={ref} name="review" rows={3} autoResize placeholder="How was it?" />
		</Field>
	)
}

/**
 * One button of the review toolbar. A press with a mouse does not take the
 * focus from the textarea, so the selection stays visible.
 */
function FormatButton({
	label,
	icon,
	onPress,
}: {
	label: string
	icon: ReactElement
	onPress: () => void
}) {
	return (
		<Tooltip>
			<TooltipTrigger>
				<Button
					type="button"
					variant="bare"
					aria-label={label}
					onPointerDown={(event) => {
						if (event.pointerType === 'mouse') event.preventDefault()
					}}
					onClick={onPress}
				>
					<Icon icon={icon} />
				</Button>
			</TooltipTrigger>

			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}
