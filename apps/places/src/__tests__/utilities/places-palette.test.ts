import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import {
	commandScore,
	foldText,
	matchCommands,
	type PaletteCommand,
	type PaletteSource,
} from '../../utilities/places-palette'

function command(label: string, fields: Partial<PaletteCommand> = {}): PaletteCommand {
	return { id: label, label, icon: createElement('span'), run: () => {}, ...fields }
}

function labels(source: PaletteSource, query: string): string[] {
	return matchCommands(source, query).map((match) => match.label)
}

describe('foldText', () => {
	it('drops accents and case', () => {
		expect(foldText('Pão de Açúcar')).toBe('pao de acucar')

		expect(foldText('São Paulo')).toBe('sao paulo')
	})
})

describe('commandScore', () => {
	it('ranks the full label, then its start, then a word start, then a keyword, then any text', () => {
		const scores = [
			commandScore(command('Oregon'), 'oregon'),
			commandScore(command('Oregon Coast'), 'oregon'),
			commandScore(command('Mount Oregon'), 'oregon'),
			commandScore(command('Multnomah Falls', { keywords: 'Oregon' }), 'oregon'),
			commandScore(command('Nooregonia'), 'oregon'),
			commandScore(command('Paris'), 'oregon'),
		]

		expect(scores).toEqual([5, 4, 3, 2, 1, 0])
	})
})

describe('matchCommands', () => {
	const source: PaletteSource = {
		heading: 'Test',
		commands: [
			command('Café de Flore'),
			command('Georgia'),
			command('Georgia Aquarium'),
			command('Paris'),
		],
		idle: 2,
		limit: 2,
	}

	it('shows the first `idle` commands for an empty query', () => {
		expect(labels(source, '  ')).toEqual(['Café de Flore', 'Georgia'])

		expect(labels({ ...source, idle: undefined }, '')).toEqual([])
	})

	it('puts the best match first and keeps the default order in a tie', () => {
		expect(labels({ ...source, limit: undefined }, 'geo')).toEqual(['Georgia', 'Georgia Aquarium'])

		expect(labels({ ...source, limit: undefined }, 'aquarium')).toEqual(['Georgia Aquarium'])
	})

	it('matches without accents', () => {
		expect(labels(source, 'cafe')).toEqual(['Café de Flore'])
	})

	it('caps a query at `limit`', () => {
		expect(labels(source, 'a')).toHaveLength(2)
	})
})
