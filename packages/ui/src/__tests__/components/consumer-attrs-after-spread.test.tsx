import { describe, expect, it } from 'vitest'
import { Field, Label } from '../../components/fieldset'
import { FileUploadDrop } from '../../components/file-upload'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanColumn,
	KanbanColumnBody,
} from '../../components/kanban'
import { QueryChips } from '../../modules/query/query-chips'
import { getSlot, renderUI } from '../helpers'

// A part writes some attributes after the consumer spread, and one of them can
// be `undefined` in one state. A consumer value for that key stays in that
// state (CONVENTIONS.md §3.9).

describe('consumer attributes after the spread', () => {
	it('the empty FileUploadDrop keeps a consumer aria-labelledby with no Field label', () => {
		renderUI(<FileUploadDrop aria-labelledby="outside">Upload</FileUploadDrop>)

		expect(getSlot(document.body, 'file-upload')).toHaveAttribute('aria-labelledby', 'outside')
	})

	it('the empty FileUploadDrop names itself from the Field label when the consumer gives no name', () => {
		renderUI(
			<Field>
				<Label>Resume</Label>
				<FileUploadDrop>Upload</FileUploadDrop>
			</Field>,
		)

		const zone = getSlot(document.body, 'file-upload')

		expect(zone.getAttribute('aria-labelledby')?.split(' ')).toContain(zone.id)
	})

	it('the QueryChips toolbar keeps a consumer tabIndex and aria-describedby', () => {
		renderUI(<QueryChips fields={[]} aria-describedby="hint" tabIndex={0} />)

		const row = getSlot(document.body, 'query-chips')

		expect(row).toHaveAttribute('tabindex', '0')

		expect(row.getAttribute('aria-describedby')?.split(' ')).toContain('hint')
	})

	it('the empty QueryChips toolbar takes focus but is no Tab stop by default', () => {
		renderUI(<QueryChips fields={[]} />)

		expect(getSlot(document.body, 'query-chips')).toHaveAttribute('tabindex', '-1')
	})

	it('the KanbanCardHandle grip keeps a consumer aria-labelledby beside an aria-label', () => {
		renderUI(
			<Kanban
				columns={[{ id: 'todo', items: [{ id: '1' }] }]}
				getKey={(item: { id: string }) => item.id}
				onReorder={() => {}}
				aria-label="Board"
			>
				<KanbanColumn value="todo" aria-label="Todo">
					<KanbanColumnBody>
						<KanbanCard value="1">
							<KanbanCardHandle aria-label="Move" aria-labelledby="card-title" />
							One
						</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		expect(getSlot(document.body, 'kanban-card-handle')).toHaveAttribute(
			'aria-labelledby',
			'card-title',
		)
	})
})
