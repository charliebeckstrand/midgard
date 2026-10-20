import { cn } from '../../core'
import { k } from '../../recipes/kata/json-tree'

type JsonTreeBranchCloseProps = {
	listed: boolean
}

export function JsonTreeBranchClose({ listed }: JsonTreeBranchCloseProps) {
	return (
		<div data-slot="json-close" aria-hidden="true" className={cn(k.row, k.punctuation)}>
			<span className={k.chevron.spacer} aria-hidden="true" />
			{listed ? ']' : '}'}
		</div>
	)
}
