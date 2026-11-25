/**
 * The wire shape of an action: the JSON Schema of the arguments that an agent
 * gives to ask the reader, and the parse that turns those arguments into an
 * action part.
 */

import { isRecord } from '../../../utilities/is-record'
import type {
	ChatActionField,
	ChatActionInput,
	ChatActionOption,
	ChatActionPart,
} from './chat-content/types'

/** The kinds of text that a `text` field takes. */
type TextType = NonNullable<Extract<ChatActionField, { kind: 'text' }>['type']>

const TEXT_TYPES: readonly TextType[] = ['text', 'email', 'tel', 'url']

/** Whether a value is a kind of text that a `text` field takes. @internal */
function isTextType(value: unknown): value is TextType {
	return TEXT_TYPES.some((type) => type === value)
}

const option = {
	type: 'object',
	properties: {
		value: {
			type: 'string',
			description: 'What the result holds when the reader picks the option.',
		},
		label: { type: 'string', description: 'The words of the option.' },
		description: { type: 'string', description: 'A second line under the label.' },
	},
	required: ['value', 'label'],
	additionalProperties: false,
} as const

const options = { type: 'array', items: option, minItems: 1 } as const

/** The keys that each field has, whatever its kind. */
const field = {
	name: { type: 'string', description: 'The key of the value in the result.' },
	label: { type: 'string', description: 'The label of the control.' },
	required: { type: 'boolean', description: 'Refuses a submit while the field is empty.' },
} as const

/**
 * The JSON Schema of the arguments of a tool call that asks the reader: what
 * an agent gives as the `parameters` of its tool. The arguments are an
 * {@link ChatActionPart} with no `kind`, `id`, or `result`, because the tool
 * call gives the id and the reader gives the result.
 *
 * @remarks
 * `input` is a `choice`, which the message draws as radios, or a `form`, which
 * it draws as a button that opens the fields in a panel.
 *
 * @example
 *   const tools = [{ name: 'ask_reader', description: 'Asks the reader.', parameters: chatActionParameters }]
 */
export const chatActionParameters = {
	type: 'object',
	properties: {
		prompt: { type: 'string', description: 'The ask, as a heading in the message.' },
		title: {
			type: 'string',
			description: 'What the values are, as the title of the panel and of the review.',
		},
		success: { type: 'string', description: 'The title of the alert after a submit.' },
		input: {
			anyOf: [
				{
					type: 'object',
					description: 'Asks for one option.',
					properties: {
						kind: { const: 'choice' },
						name: { type: 'string', description: 'The key of the picked value in the result.' },
						options,
					},
					required: ['kind', 'name', 'options'],
					additionalProperties: false,
				},
				{
					type: 'object',
					description: 'Asks for the values of fields.',
					properties: {
						kind: { const: 'form' },
						label: { type: 'string', description: 'The words of the button that opens the panel.' },
						fields: {
							type: 'array',
							minItems: 1,
							items: {
								anyOf: [
									{
										type: 'object',
										properties: {
											kind: { const: 'text' },
											...field,
											type: { enum: TEXT_TYPES },
											multiline: { type: 'boolean' },
										},
										required: ['kind', 'name', 'label'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { kind: { const: 'choice' }, ...field, options },
										required: ['kind', 'name', 'label', 'options'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { kind: { const: 'checkbox' }, ...field },
										required: ['kind', 'name', 'label'],
										additionalProperties: false,
									},
								],
							},
						},
					},
					required: ['kind', 'label', 'fields'],
					additionalProperties: false,
				},
			],
		},
	},
	required: ['prompt', 'title', 'success', 'input'],
	additionalProperties: false,
} as const

/** The value when it is a string, or `undefined`. @internal */
function toText(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined
}

/** The value when it is a boolean or absent, or `null` for a wrong value. @internal */
function toFlag(value: unknown): boolean | undefined | null {
	return value === undefined || typeof value === 'boolean' ? value : null
}

/** One option, or `undefined` when its shape is wrong. @internal */
function toOption(value: unknown): ChatActionOption | undefined {
	if (!isRecord(value)) return undefined

	const label = toText(value.label)
	const optionValue = toText(value.value)

	if (label === undefined || optionValue === undefined) return undefined

	if (value.description !== undefined && typeof value.description !== 'string') return undefined

	return value.description === undefined
		? { value: optionValue, label }
		: { value: optionValue, label, description: value.description }
}

/** A list of one or more options, or `undefined` when an item is wrong. @internal */
function toOptions(value: unknown): ChatActionOption[] | undefined {
	if (!Array.isArray(value) || value.length === 0) return undefined

	const list = value.map(toOption)

	return list.every((item) => item !== undefined) ? list : undefined
}

/** One field, or `undefined` when its shape is wrong. @internal */
function toField(value: unknown): ChatActionField | undefined {
	if (!isRecord(value)) return undefined

	const name = toText(value.name)
	const label = toText(value.label)
	const required = toFlag(value.required)

	if (name === undefined || label === undefined || required === null) return undefined

	const base = required === undefined ? { name, label } : { name, label, required }

	switch (value.kind) {
		case 'text': {
			const multiline = toFlag(value.multiline)

			if (multiline === null) return undefined

			const type = value.type

			if (type !== undefined && !isTextType(type)) return undefined

			return {
				...base,
				kind: 'text',
				...(type === undefined ? {} : { type }),
				...(multiline === undefined ? {} : { multiline }),
			}
		}
		case 'choice': {
			const list = toOptions(value.options)

			return list && { ...base, kind: 'choice', options: list }
		}
		case 'checkbox':
			return { ...base, kind: 'checkbox' }
		default:
			return undefined
	}
}

/** The input of an action, or `undefined` when its shape is wrong. @internal */
function toInput(value: unknown): ChatActionInput | undefined {
	if (!isRecord(value)) return undefined

	if (value.kind === 'choice') {
		const name = toText(value.name)
		const list = toOptions(value.options)

		return name === undefined || list === undefined
			? undefined
			: { kind: 'choice', name, options: list }
	}

	if (value.kind !== 'form' || !Array.isArray(value.fields) || value.fields.length === 0) {
		return undefined
	}

	const label = toText(value.label)
	const fields = value.fields.map(toField)

	if (label === undefined || !fields.every((item) => item !== undefined)) return undefined

	// A name keys the result, so two fields under one name would share a value.
	if (new Set(fields.map((item) => item.name)).size !== fields.length) return undefined

	return { kind: 'form', label, fields }
}

/**
 * The action part that the arguments of a tool call ask for, with `id` as the
 * id of the part.
 *
 * @remarks
 * `json` is the text of the arguments, in the shape of
 * {@link chatActionParameters}. The part keeps only the keys of that shape, so
 * an extra key of an agent never gets to the message. The result is
 * `undefined` when the text is not JSON or its shape is wrong, such as a form
 * with no fields, or two fields under one name.
 *
 * @internal
 */
export function parseChatAction(id: string, json: string): ChatActionPart | undefined {
	let args: unknown

	try {
		args = JSON.parse(json)
	} catch {
		return undefined
	}

	if (!isRecord(args)) return undefined

	const prompt = toText(args.prompt)
	const title = toText(args.title)
	const success = toText(args.success)
	const input = toInput(args.input)

	if (prompt === undefined || title === undefined || success === undefined || !input) {
		return undefined
	}

	return { kind: 'action', id, prompt, title, success, input }
}
