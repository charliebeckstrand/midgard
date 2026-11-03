import { cn } from '../../core/cn'
import { k } from '../../recipes/kata/json-tree'

type JsonTreeBranchCloseProps = {
	isArray: boolean
}

export function JsonTreeBranchClose({ isArray }: JsonTreeBranchCloseProps) {
	return (
		<div data-slot="json-close" aria-hidden="true" className={cn(k().row, k().punctuation)}>
			<span className={k().chevron.spacer} aria-hidden="true" />
			{isArray ? ']' : '}'}
		</div>
	)
}
