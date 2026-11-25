// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	chatActionParameters,
	parseChatAction,
} from '../../modules/chat/engine/chat-action-parameters'

const choice = {
	prompt: 'Which carrier?',
	title: 'Carrier',
	success: 'Carrier picked',
	input: {
		kind: 'choice',
		name: 'carrier',
		options: [{ value: 'atlas', label: 'Atlas', description: 'Thursday' }],
	},
}

const form = {
	prompt: 'Delivery details needed',
	title: 'Delivery details',
	success: 'Delivery details sent',
	input: {
		kind: 'form',
		label: 'Add details',
		fields: [
			{ kind: 'text', name: 'phone', label: 'Phone', type: 'tel', required: true },
			{ kind: 'text', name: 'notes', label: 'Notes', multiline: true },
			{ kind: 'choice', name: 'time', label: 'Time', options: [{ value: 'am', label: 'Morning' }] },
			{ kind: 'checkbox', name: 'liftgate', label: 'Needs a liftgate' },
		],
	},
}

/** The arguments with the input changed by `change`. */
function withInput(args: typeof form, change: Record<string, unknown>): string {
	return JSON.stringify({ ...args, input: { ...args.input, ...change } })
}

describe('parseChatAction', () => {
	it('gives a choice and a form under the id of the tool call', () => {
		expect(parseChatAction('c1', JSON.stringify(choice))).toEqual({
			kind: 'action',
			id: 'c1',
			...choice,
		})

		expect(parseChatAction('c2', JSON.stringify(form))).toEqual({
			kind: 'action',
			id: 'c2',
			...form,
		})
	})

	it('keeps only the keys of the shape', () => {
		const extra = { ...choice, result: { carrier: 'atlas' }, kind: 'text', style: 'red' }

		expect(parseChatAction('c1', JSON.stringify(extra))).toEqual({
			kind: 'action',
			id: 'c1',
			...choice,
		})
	})

	it.each([
		['text that is not JSON', '{"prompt":'],
		['a list', '[]'],
		['no success', JSON.stringify({ ...choice, success: undefined })],
		['a choice with no options', withInput(form, { kind: 'choice', name: 'x', options: [] })],
		['a form with no fields', withInput(form, { fields: [] })],
		[
			'two fields under one name',
			withInput(form, {
				fields: [
					{ kind: 'checkbox', name: 'a', label: 'A' },
					{ kind: 'checkbox', name: 'a', label: 'B' },
				],
			}),
		],
		[
			'an unknown kind of field',
			withInput(form, { fields: [{ kind: 'date', name: 'd', label: 'D' }] }),
		],
		[
			'an unknown kind of text',
			withInput(form, { fields: [{ kind: 'text', name: 'd', label: 'D', type: 'date' }] }),
		],
		[
			'a required that is not a boolean',
			withInput(form, { fields: [{ kind: 'checkbox', name: 'd', label: 'D', required: 'yes' }] }),
		],
	])('refuses %s', (_name, json) => {
		expect(parseChatAction('c1', json)).toBeUndefined()
	})
})

describe('chatActionParameters', () => {
	it('is JSON, as the parameters of a tool must be', () => {
		expect(JSON.parse(JSON.stringify(chatActionParameters))).toEqual(chatActionParameters)
	})
})
