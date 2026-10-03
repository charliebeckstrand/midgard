// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	deriveStatus,
	toFieldText,
} from '../../components/password-confirm/password-confirm-utilities'

describe('deriveStatus', () => {
	it.each<[string, string, string, 'password' | 'confirm' | null, 'idle' | 'warning']>([
		['returns idle when password is empty', '', 'x', 'password', 'idle'],
		['returns idle when confirm is empty', 'hunter2', '', 'password', 'idle'],
		['returns idle when both fields match', 'hunter2', 'hunter2', 'confirm', 'idle'],
		[
			'stays idle while typing the confirm field is shorter than password',
			'hunter2',
			'hunt',
			'confirm',
			'idle',
		],
		[
			'warns when the confirm field is the same length or longer but does not match',
			'hunter2',
			'hunter3',
			'confirm',
			'warning',
		],
		[
			'warns when the password field changed and now differs from confirm',
			'hunter2',
			'hunter3',
			'password',
			'warning',
		],
		[
			'warns when nothing has been edited yet but the values differ',
			'hunter2',
			'hunter3',
			null,
			'warning',
		],
	])('%s', (_name, password, confirm, lastEdited, expected) => {
		expect(deriveStatus(password, confirm, lastEdited)).toBe(expected)
	})
})

describe('toFieldText', () => {
	it.each<[unknown, string]>([
		[undefined, ''],
		[null, ''],
		['hunter2', 'hunter2'],
		[42, '42'],
	])('converts %s to %j', (value, expected) => {
		expect(toFieldText(value)).toBe(expected)
	})
})
