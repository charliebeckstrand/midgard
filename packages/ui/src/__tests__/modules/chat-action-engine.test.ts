// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { actionDefaults, actionReview } from '../../modules/chat/engine/chat-action'
import { isEmptyContent } from '../../modules/chat/engine/chat-content/normalize'
import { chatPartsText } from '../../modules/chat/engine/chat-content/text'
import type { ChatActionField, ChatActionPart } from '../../modules/chat/engine/chat-content/types'

const fields: ChatActionField[] = [
	{ kind: 'text', name: 'contact', label: 'Contact name', required: true },
	{
		kind: 'choice',
		name: 'time',
		label: 'Pickup time',
		options: [
			{ value: 'am', label: 'Morning' },
			{ value: 'pm', label: 'Afternoon' },
		],
	},
	{ kind: 'text', name: 'notes', label: 'Notes', multiline: true },
	{ kind: 'checkbox', name: 'liftgate', label: 'Needs a liftgate' },
]

const form: ChatActionPart = {
	kind: 'action',
	id: 'details',
	prompt: 'Delivery details needed',
	title: 'Delivery details',
	success: 'Delivery details sent',
	input: { kind: 'form', label: 'Add details', fields },
}

const choice: ChatActionPart = {
	kind: 'action',
	id: 'carrier',
	prompt: 'Which carrier?',
	title: 'Carrier',
	success: 'Carrier picked',
	input: {
		kind: 'choice',
		name: 'carrier',
		options: [{ value: 'atlas', label: 'Atlas Haulage' }],
	},
}

describe('actionDefaults', () => {
	it('starts a text and a choice field empty, and a checkbox clear', () => {
		expect(actionDefaults(fields)).toEqual({
			contact: '',
			time: '',
			notes: '',
			liftgate: false,
		})
	})
})

describe('actionReview', () => {
	it('gives no row for an ask with no result', () => {
		expect(actionReview(form)).toEqual([])
	})

	it('gives a choice one row under the title, with the label of the option', () => {
		expect(actionReview({ ...choice, result: { carrier: 'atlas' } })).toEqual([
			{ label: 'Carrier', value: 'Atlas Haulage' },
		])
	})

	it('gives a form one row for each field with a value, in the order of the ask', () => {
		const result = { contact: 'Dana Ortiz', time: 'pm', notes: '', liftgate: false }

		expect(actionReview({ ...form, result })).toEqual([
			{ label: 'Contact name', value: 'Dana Ortiz' },
			{ label: 'Pickup time', value: 'Afternoon' },
			{ label: 'Needs a liftgate', value: false },
		])
	})

	it('shows the value of an option that the ask does not list', () => {
		expect(actionReview({ ...choice, result: { carrier: 'other' } })).toEqual([
			{ label: 'Carrier', value: 'other' },
		])
	})
})

describe('an action in the content of a message', () => {
	it('projects to its prompt while open, and to its success once answered', () => {
		expect(chatPartsText([choice])).toBe('Which carrier?')

		expect(chatPartsText([{ ...choice, result: { carrier: 'atlas' } }])).toBe('Carrier picked')
	})

	it('is not empty content, so a reply that holds only an ask stays', () => {
		expect(isEmptyContent([choice])).toBe(false)
	})
})
