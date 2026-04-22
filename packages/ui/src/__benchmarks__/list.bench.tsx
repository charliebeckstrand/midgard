import { cleanup, render } from '@testing-library/react'
import { bench, describe } from 'vitest'
import { List } from '../components/list'
import { ListItem } from '../components/list/list-item'
import { makeListItems } from './fixtures'

const items100 = makeListItems(100)
const items500 = makeListItems(500)
const items1k = makeListItems(1_000)

const getKey = (item: { id: string }) => item.id

function renderItem(item: { title: string }) {
	return <ListItem>{item.title}</ListItem>
}

describe('List · reorderable (onReorder provided)', () => {
	bench('100 items', () => {
		render(
			<List items={items100} getKey={getKey} onReorder={noop}>
				{renderItem}
			</List>,
		)

		cleanup()
	})

	bench('500 items', () => {
		render(
			<List items={items500} getKey={getKey} onReorder={noop}>
				{renderItem}
			</List>,
		)

		cleanup()
	})

	bench('1,000 items', () => {
		render(
			<List items={items1k} getKey={getKey} onReorder={noop}>
				{renderItem}
			</List>,
		)

		cleanup()
	})
})

describe('List · read-only (no onReorder)', () => {
	bench('1,000 items', () => {
		render(
			<List items={items1k} getKey={getKey}>
				{renderItem}
			</List>,
		)

		cleanup()
	})
})

function noop() {}
