type SpacingProps = {
	/** Outer gutter step. */
	gap?: number
}

type EmphasisProps = {
	/** Strong visual weight. */
	strong: boolean
}

export type MergeProps = SpacingProps & EmphasisProps

/** Intersection fixture: props merge across both arms. */
export function Merge({ gap, strong }: MergeProps) {
	return <span data-gap={gap}>{String(strong)}</span>
}
