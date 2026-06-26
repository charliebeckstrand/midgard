// Cell-change flash keyframe. Hoisted and deduplicated by React 19 via `precedence`.
const CELL_FLASH_KEYFRAMES = '@keyframes grid-editable-cell-flash{from{opacity:1}to{opacity:0}}'

export function GridEditableStyles() {
	return (
		<style href="grid-editable-cell-flash" precedence="default">
			{CELL_FLASH_KEYFRAMES}
		</style>
	)
}
