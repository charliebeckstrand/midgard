import { cn } from '../../core'
import { k } from '../../recipes/kata/json-tree'
import { INDENT_REM } from './json-tree-constants'

type JsonTreeBranchCloseProps = {
	depth: number
	isArray: boolean
}

export function JsonTreeBranchClose({ depth, isArray }: JsonTreeBranchCloseProps) {
	const paddingLeft = `${depth * INDENT_REM}rem`

	return (
		<div
			data-slot="json-close"
			aria-hidden="true"
			className={cn(k.row, k.punctuation)}
			style={{ paddingLeft }}
		>
			<span className={k.chevron.spacer} aria-hidden="true" />
			{isArray ? ']' : '}'}
		</div>
	)
}
