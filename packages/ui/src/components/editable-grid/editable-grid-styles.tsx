// Cell-change flash keyframe. Hoisted and deduplicated by React 19 via `precedence`.
const CELL_FLASH_KEYFRAMES = '@keyframes editable-grid-cell-flash{from{opacity:1}to{opacity:0}}'

export function EditableGridStyles() {
	return (
		<style href="editable-grid-cell-flash" precedence="default">
			{CELL_FLASH_KEYFRAMES}
		</style>
	)
}
