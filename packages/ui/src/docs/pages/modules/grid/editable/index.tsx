import { Example } from '../../../../kit/index.ts'
import AsyncCommit from './async-commit.tsx'
import BulkEdit from './bulk-edit.tsx'
import CellScopeAndSpreadsheetKeys from './cell-scope-and-spreadsheet-keys.tsx'
import Editable from './editable.tsx'
import EditorTypes from './editor-types.tsx'
import NewRow from './new-row.tsx'
import PasteAndFill from './paste-and-fill.tsx'
import UndoAndRedo from './undo-and-redo.tsx'

export default function EditableTab() {
	return (
		<>
			<Example of={Editable} />
			<Example of={CellScopeAndSpreadsheetKeys} />
			<Example of={AsyncCommit} />
			<Example of={UndoAndRedo} />
			<Example of={PasteAndFill} />
			<Example of={NewRow} />
			<Example of={EditorTypes} />
			<Example of={BulkEdit} />
		</>
	)
}
