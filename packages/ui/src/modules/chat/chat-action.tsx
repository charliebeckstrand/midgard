'use client'

import { type ReactNode, useId, useMemo, useRef, useState } from 'react'
import { Alert } from '../../components/alert'
import { Button } from '../../components/button'
import { Checkbox, CheckboxField } from '../../components/checkbox'
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from '../../components/description-list'
import { Description, Field, Label, Message } from '../../components/fieldset'
import { Heading } from '../../components/heading'
import { Input } from '../../components/input'
import { Radio, RadioField, RadioGroup } from '../../components/radio'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { Textarea } from '../../components/textarea'
import { ControlLockContext } from '../../primitives/control/context'
import { defineMessages, intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/chat-message'
import { Stack } from '../../structure/stack'
import { Form, FormSubmit } from '../form'
import type { Validators } from '../form/engine/types'
import { ACTION_HEADING_LEVEL } from './chat-constants'
import { ChatPanel, ChatPanelBody, ChatPanelClose, ChatPanelFooter } from './chat-panel'
import { ChatActionContext, useChatAction } from './context'
import { actionDefaults, actionReview } from './engine/chat-action'
import type {
	ChatActionField,
	ChatActionOption,
	ChatActionPart,
	ChatActionResult,
} from './engine/chat-content/types'

const messages = defineMessages({
	submit: {
		id: 'ui.chat.action.submit',
		defaultMessage: 'Submit',
		description: 'The button that sends the answer to an ask of the assistant in a chat.',
	},
	review: {
		id: 'ui.chat.action.review',
		defaultMessage: 'Review details',
		description:
			'The button in the success alert of an answered ask. It opens the values that the reader sent.',
	},
	required: {
		id: 'ui.chat.action.required',
		defaultMessage: 'Fill in this field.',
		description: 'The issue of a required field that the reader left empty.',
	},
	yes: {
		id: 'ui.chat.action.yes',
		defaultMessage: 'Yes',
		description: 'The value of a checked checkbox in the review of an answered ask.',
	},
	no: {
		id: 'ui.chat.action.no',
		defaultMessage: 'No',
		description: 'The value of a clear checkbox in the review of an answered ask.',
	},
})

/** What the panel of an action shows: the fields of a form, or the review of a result. @internal */
type PanelState = { open: boolean; show: 'form' | 'review' }

/** The label of each option, for the closed Select of a choice field. @internal */
function optionLabels(options: ChatActionOption[]): (value: string) => string {
	return (value) => options.find((option) => option.value === value)?.label ?? ''
}

/** The control of one field of a form, bound to the form by its name. @internal */
function ChatActionFieldControl({ field }: { field: ChatActionField }) {
	switch (field.kind) {
		case 'text':
			return (
				<Field>
					<Label>{field.label}</Label>
					{field.multiline ? (
						<Textarea name={field.name} rows={3} />
					) : (
						<Input name={field.name} type={field.type ?? 'text'} />
					)}
					<Message name={field.name} />
				</Field>
			)
		case 'choice':
			return (
				<Field>
					<Label>{field.label}</Label>
					<Select name={field.name} displayValue={optionLabels(field.options)}>
						{field.options.map((option) => (
							<SelectOption key={option.value} value={option.value}>
								<SelectLabel>{option.label}</SelectLabel>
							</SelectOption>
						))}
					</Select>
					<Message name={field.name} />
				</Field>
			)
		case 'checkbox':
			return (
				<CheckboxField>
					<Checkbox name={field.name} />
					<Label>{field.label}</Label>
					<Message name={field.name} />
				</CheckboxField>
			)
	}
}

/**
 * The fields of a `form` ask in its panel, with Cancel and Submit. A required
 * field refuses a submit while it is empty, and a required checkbox while it
 * is clear.
 *
 * @internal
 */
function ChatActionForm({
	fields,
	onSubmit,
}: {
	fields: ChatActionField[]
	onSubmit: (result: ChatActionResult) => void
}) {
	const intl = useIntl()

	const validate = useMemo(() => {
		const issue = intl.formatMessage(messages.required)

		return Object.fromEntries(
			fields
				.filter((field) => field.required)
				.map((field) => [field.name, (value: unknown) => (value ? undefined : issue)]),
		) as Validators<ChatActionResult>
	}, [fields, intl])

	return (
		<Form defaultValues={actionDefaults(fields)} validate={validate} onSubmit={onSubmit}>
			<ChatPanelBody>
				<Stack gap="lg">
					{fields.map((field) => (
						<ChatActionFieldControl key={field.name} field={field} />
					))}
				</Stack>
			</ChatPanelBody>
			<ChatPanelFooter>
				<ChatPanelClose>
					<Button type="button" variant="plain" lockable={false}>
						{intl.formatMessage(intlMessages.cancel)}
					</Button>
				</ChatPanelClose>
				<FormSubmit>{intl.formatMessage(messages.submit)}</FormSubmit>
			</ChatPanelFooter>
		</Form>
	)
}

/** The values that the reader sent, as a list in the panel. @internal */
function ChatActionReview({ part }: { part: ChatActionPart }) {
	const intl = useIntl()

	return (
		<ChatPanelBody>
			<DescriptionList>
				{actionReview(part).map((row) => (
					<div key={row.label} className="contents">
						<DescriptionTerm>{row.label}</DescriptionTerm>
						<DescriptionDetails>
							{typeof row.value === 'boolean'
								? intl.formatMessage(row.value ? messages.yes : messages.no)
								: row.value}
						</DescriptionDetails>
					</div>
				))}
			</DescriptionList>
		</ChatPanelBody>
	)
}

/**
 * The options of a `choice` ask as radios, with a Submit button that waits for
 * a pick.
 *
 * @internal
 */
function ChatActionChoice({
	name,
	options,
	labelledBy,
	onSubmit,
}: {
	name: string
	options: ChatActionOption[]
	labelledBy: string
	onSubmit: (result: ChatActionResult) => void
}) {
	const intl = useIntl()

	const [picked, setPicked] = useState<string>()

	// The native group name keeps the radios of each ask apart, so two asks of
	// one name in a transcript are two groups.
	const group = useId()

	return (
		<>
			<RadioGroup aria-labelledby={labelledBy}>
				{options.map((option) => (
					<RadioField key={option.value}>
						<Radio
							name={group}
							value={option.value}
							checked={picked === option.value}
							onChange={() => setPicked(option.value)}
						/>
						<Label>{option.label}</Label>
						{option.description !== undefined && (
							<Description className={k().actionDescription}>{option.description}</Description>
						)}
					</RadioField>
				))}
			</RadioGroup>
			<Button
				disabled={picked === undefined}
				onClick={() => {
					if (picked !== undefined) onSubmit({ [name]: picked })
				}}
			>
				{intl.formatMessage(messages.submit)}
			</Button>
		</>
	)
}

/** Props for {@link ChatAction}. @internal */
export type ChatActionProps = {
	/** The ask to draw. */
	part: ChatActionPart
	className?: string
}

/**
 * Draws one `action` block: an ask of the assistant that flows in the bubble as
 * a heading and its controls, with no frame of its own.
 *
 * @remarks
 * A `choice` draws its options as radios and a Submit button. A `form` draws a
 * button that opens its fields in a panel: a Dialog, or a Drawer on a phone.
 * The panel takes the `title` of the action, and the heading in the message
 * takes its `prompt`.
 *
 * A submit gives the result to the answer of the message, and closes the
 * panel. The answer writes the result on the block, so the block draws a
 * success alert in place of the ask. The alert opens the values for review in
 * the same panel. An ask is answered once, so the block holds no path back to
 * its controls.
 *
 * Where the message takes no answer, the block draws inside a locked scope.
 * Each control is then read-only and each button inert, with no rule of its
 * own. A transcript gives no answer while a reply streams, because the send
 * takes no answer then.
 *
 * @internal
 */
export function ChatAction({ part, className }: ChatActionProps) {
	const intl = useIntl()

	const answer = useChatAction()

	const headingId = useId()

	// Null until the first open, so an ask that nobody opens pays for no panel.
	const [panel, setPanel] = useState<PanelState | null>(null)

	const show = (target: PanelState['show']) => setPanel({ open: true, show: target })

	// The ask in the message. A choice submits from inside it.
	const askRef = useRef<HTMLDivElement>(null)

	// Set when the answer replaces an ask that holds the focus. The ask then
	// unmounts, so the review button of the alert takes the focus, and the focus
	// does not fall to the body (WCAG 2.4.3). A form submits from its panel, and
	// the panel gives the focus back when it closes.
	const focusReview = useRef(false)

	const respond = (result: ChatActionResult) => {
		setPanel((prev) => (prev === null ? prev : { ...prev, open: false }))

		if (answer === undefined) return

		focusReview.current = askRef.current?.contains(document.activeElement) ?? false

		answer(part.id, result)
	}

	// Runs when the review button mounts, which is the commit that drew the alert.
	const reviewRef = (node: HTMLButtonElement | null) => {
		if (node === null || !focusReview.current) return

		focusReview.current = false

		node.focus()
	}

	const { input, result } = part

	// The lock covers the block in the message, and not the panel. A locked
	// block opens only the review, which changes nothing, so the panel stays live.
	return (
		<>
			<ControlLockContext value={answer === undefined}>
				{result === undefined ? (
					<Stack ref={askRef} data-slot="chat-action" gap="md" align="start" className={className}>
						<Heading id={headingId} level={ACTION_HEADING_LEVEL}>
							{part.prompt}
						</Heading>
						{input.kind === 'choice' ? (
							<ChatActionChoice
								name={input.name}
								options={input.options}
								labelledBy={headingId}
								onSubmit={respond}
							/>
						) : (
							<Button onClick={() => show('form')}>{input.label}</Button>
						)}
					</Stack>
				) : (
					<Alert
						data-slot="chat-action"
						severity="success"
						// The color says the ask is done, and the alert takes no icon, so it
						// sits quietly in the prose of the message.
						icon={false}
						title={part.success}
						actions={
							// A review changes nothing, so it opens in a locked scope too.
							<Button ref={reviewRef} lockable={false} onClick={() => show('review')}>
								{intl.formatMessage(messages.review)}
							</Button>
						}
						className={className}
					/>
				)}
			</ControlLockContext>
			{panel !== null && (
				<ChatPanel
					open={panel.open}
					onOpenChange={(open) => setPanel({ ...panel, open })}
					title={part.title}
				>
					{panel.show === 'review' ? (
						<ChatActionReview part={part} />
					) : (
						input.kind === 'form' && <ChatActionForm fields={input.fields} onSubmit={respond} />
					)}
				</ChatPanel>
			)}
		</>
	)
}

/**
 * The scope that answers the actions of one message. A message renders it on
 * each render, also with no `onSubmit`, so a scope that turns its answer on or
 * off keeps the state of its asks.
 *
 * @internal
 * @param onSubmit - Takes the id of the action and its result. Without it,
 * each action in the scope draws read-only.
 */
export function ChatActionScope({
	onSubmit,
	children,
}: {
	onSubmit: ((partId: string, result: ChatActionResult) => void) | undefined
	children: ReactNode
}) {
	return <ChatActionContext value={onSubmit}>{children}</ChatActionContext>
}
