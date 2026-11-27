import type { CSSProperties, ReactElement } from 'react'

/**
 * The name of an icon that ui draws: the own name of its Lucide icon, such as
 * `X` or `ChevronRight`. A test checks that the list holds each Lucide icon
 * that ui imports, and no other name.
 */
export type IconName =
	| 'Activity'
	| 'ArrowDown'
	| 'ArrowDownToLine'
	| 'ArrowLeft'
	| 'ArrowLeftRight'
	| 'ArrowLeftToLine'
	| 'ArrowRightToLine'
	| 'ArrowUp'
	| 'ArrowUpDown'
	| 'ArrowUpToLine'
	| 'Ban'
	| 'Calendar'
	| 'Check'
	| 'ChevronDown'
	| 'ChevronLeft'
	| 'ChevronRight'
	| 'ChevronUp'
	| 'ChevronsDownUp'
	| 'ChevronsUpDown'
	| 'CircleCheckBig'
	| 'CircleX'
	| 'Clipboard'
	| 'Code'
	| 'Columns3'
	| 'Copy'
	| 'CopyPlus'
	| 'CornerDownLeft'
	| 'CornerLeftDown'
	| 'CornerRightDown'
	| 'CornerRightUp'
	| 'CreditCard'
	| 'Dot'
	| 'Download'
	| 'EllipsisVertical'
	| 'ExternalLink'
	| 'Eye'
	| 'EyeOff'
	| 'GripVertical'
	| 'Group'
	| 'Heading1'
	| 'Heading2'
	| 'Heading3'
	| 'Highlighter'
	| 'Image'
	| 'Info'
	| 'Italic'
	| 'LetterB'
	| 'Link'
	| 'List'
	| 'ListFilter'
	| 'ListFilterPlus'
	| 'ListOrdered'
	| 'ListTree'
	| 'Lock'
	| 'MapPin'
	| 'MapPinned'
	| 'Maximize2'
	| 'Menu'
	| 'Minus'
	| 'MoveHorizontal'
	| 'PanelLeft'
	| 'PanelLeftDashed'
	| 'Paperclip'
	| 'Phone'
	| 'Pin'
	| 'PinOff'
	| 'Pipette'
	| 'Play'
	| 'Plus'
	| 'Printer'
	| 'RotateCcw'
	| 'RotateCw'
	| 'ScanSearch'
	| 'Search'
	| 'Settings2'
	| 'SlidersHorizontal'
	| 'Square'
	| 'SquareCode'
	| 'Star'
	| 'StretchHorizontal'
	| 'Strikethrough'
	| 'Table2'
	| 'TextQuote'
	| 'Trash'
	| 'TriangleExclamationPoint'
	| 'Type'
	| 'Ungroup'
	| 'Upload'
	| 'X'
	| 'ZoomIn'
	| 'ZoomOut'

/**
 * The icons that an app gives in place of the Lucide defaults of ui, by the
 * Lucide name of each icon. Each value replaces its icon everywhere ui draws
 * it. An icon with no value keeps its Lucide default.
 *
 * Each value is an element, so that a server layout can give the map to a
 * client provider. The element gets the props of the glyph: `className`,
 * `style`, `data-*`, and ARIA attributes. Its component must forward them to
 * the `<svg>` that it renders, as the `icon` of `Icon` must.
 *
 * @example
 *   <UIProvider icons={{ X: <FontAwesomeIcon icon={faXmark} /> }}>
 */
export type Icons = Partial<
	Record<IconName, ReactElement<{ className?: string; style?: CSSProperties }>>
>
