'use client'

import { Highlighter, PanelLeft, PanelLeftDashed, RotateCw, ScanSearch } from 'lucide-react'
import type { ReactElement } from 'react'

import { cn } from '../../core'
import { k } from '../../recipes/kata/pdf-viewer'
import { Button } from '../button'
import { Icon } from '../icon'
import { Listbox, ListboxLabel, ListboxOption } from '../listbox'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../toolbar'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { usePdfViewerContext } from './context'
import { PdfViewerDocumentActions } from './pdf-viewer-document-actions'
import { PdfViewerMagnifierSettings } from './pdf-viewer-magnifier-settings'
import { PdfViewerToolbarButton } from './pdf-viewer-toolbar-button'
import { PdfViewerZoomControls } from './pdf-viewer-zoom-controls'

/**
 * The viewer's top control bar: the thumbnail toggle (collapses the desktop
 * sidebar, opens the mobile Sheet), page navigation, zoom and rotate, the highlight
 * visibility toggle when there are regions, the magnifier control when the consumer asked for
 * a loupe, and the download / print actions. Reads everything from {@link PdfViewerContext};
 * controls disable while loading or empty.
 *
 * The magnifier control is one of two, and {@link PdfViewerMagnifierMode} says which: a
 * toggle, or the button that opens {@link PdfViewerMagnifierSettings}.
 *
 * @internal
 */
export function PdfViewerToolbar() {
	const {
		pages,
		total,
		safePage,
		goToPage,
		zoom,
		rotate,
		documentSrc,
		filename,
		loading,
		isDesktop,
		sidebarOpen,
		setSidebarOpen,
		thumbsOpen,
		setThumbsOpen,
		hasHighlights,
		highlightsVisible,
		setHighlightsVisible,
		magnifierAvailable,
		magnifierOn,
		setMagnifierOn,
		magnifierMode,
	} = usePdfViewerContext()

	const isEmpty = total === 0

	const controlsDisabled = loading || isEmpty

	const sidebarToggleLabel = sidebarOpen ? 'Hide thumbnails' : 'Show thumbnails'

	const highlightsToggleLabel = highlightsVisible ? 'Hide highlights' : 'Show highlights'

	// Names the action rather than the state, matching the toggles above it.
	const magnifierToggleLabel = magnifierOn ? 'Turn magnifier off' : 'Turn magnifier on'

	return (
		<Toolbar aria-label="PDF controls" className={cn(k.toolbar.base)}>
			<div className={cn(k.toolbar.section)}>
				{total > 0 && (
					<>
						{isDesktop && (
							<PdfViewerToolbarButton
								label={sidebarToggleLabel}
								icon={sidebarOpen ? <PanelLeftDashed /> : <PanelLeft />}
								expanded={sidebarOpen}
								disabled={loading}
								onClick={() => setSidebarOpen(!sidebarOpen)}
							/>
						)}

						{!isDesktop && (
							<PdfViewerToolbarButton
								label="Show thumbnails"
								icon={<PanelLeft />}
								expanded={thumbsOpen}
								disabled={loading}
								onClick={() => setThumbsOpen(true)}
							/>
						)}

						<ToolbarGroup aria-label="Page navigation">
							<Listbox<number>
								aria-label="Current page"
								value={safePage}
								onValueChange={(next) => {
									if (next !== null) goToPage(next)
								}}
								displayValue={(v) => String(v)}
								disabled={loading}
								className="tabular-nums"
							>
								{pages.map((p, index) => {
									const pageNumber = index + 1

									return (
										<ListboxOption key={p.id ?? index} value={pageNumber}>
											<ListboxLabel>{p.label ?? `Page ${pageNumber}`}</ListboxLabel>
										</ListboxOption>
									)
								})}
							</Listbox>
							<span className="mx-1 select-none">/</span>
							<span data-slot="pdf-viewer-page-status" className={cn(k.toolbar.pageStatus)}>
								{total}
							</span>
						</ToolbarGroup>
					</>
				)}
			</div>

			<div className={cn(k.toolbar.section)}>
				<PdfViewerZoomControls zoom={zoom} disabled={controlsDisabled} />
				<ToolbarGroup aria-label="View">
					<PdfViewerToolbarButton
						label="Rotate"
						icon={<RotateCw />}
						disabled={controlsDisabled}
						onClick={rotate}
					/>
					{/* Only offered when there is something to hide. {@link ToolbarToggle} carries the
					    two-state treatment and the argument for it. */}
					{hasHighlights && (
						<ToolbarToggle
							label={highlightsToggleLabel}
							pressed={highlightsVisible}
							onPressedChange={setHighlightsVisible}
							disabled={controlsDisabled}
							icon={<Highlighter />}
						/>
					)}
					{/* Only where the consumer asked for a loupe, and it stays put once switched
					    off — that is the press that brings it back. In `'config'` mode the press
					    opens the dialog instead, and the switch it took the place of is in there. */}
					{magnifierAvailable &&
						(magnifierMode === 'config' ? (
							<PdfViewerMagnifierSettings disabled={controlsDisabled} />
						) : (
							<ToolbarToggle
								label={magnifierToggleLabel}
								pressed={magnifierOn}
								onPressedChange={setMagnifierOn}
								disabled={controlsDisabled}
								icon={<ScanSearch />}
							/>
						))}
				</ToolbarGroup>
				{documentSrc && (
					<>
						<ToolbarSeparator />
						<PdfViewerDocumentActions
							src={documentSrc}
							filename={filename}
							disabled={controlsDisabled}
						/>
					</>
				)}
			</div>
		</Toolbar>
	)
}

/**
 * A two-state control in this bar: a `Button` carrying `aria-pressed`, under a tooltip naming
 * the action it would take.
 *
 * **On is `soft`, off is `plain`.** The glyph never changes and the label names the *action*
 * rather than the state ("Hide highlights" while they are shown), so before this the only
 * difference between a toggle that was on and one that was off was `aria-pressed` — nothing a
 * pointer user could see, since no recipe targets that attribute. `soft`'s 15% wash is the
 * quietest fill that still reads as held down, and it leaves the button the same size, so the
 * bar doesn't reflow as a toggle flips. Left on the default zinc: this bar is chrome, and the
 * regions on the page below own the colour vocabulary — a blue toolbar button would compete
 * with the very highlights it switches. Same soft-on/plain-off pairing as
 * `app-tabs/tab-strip.tsx`'s `badgeVariant`.
 *
 * Not `ToggleIconButton`, which is the package's designated two-state control: it cross-fades
 * between two icons — motion nothing else in this bar has, on toggles whose glyph never
 * changes — and it hardcodes `variant="bare"`, so it could not take the variant swap above.
 * The two-state semantics are the attribute's, not that component's.
 *
 * Local because the two toggles below were otherwise the same sixteen lines twice, differing
 * only in label, state and glyph.
 *
 * @internal
 */
function ToolbarToggle({
	label,
	pressed,
	onPressedChange,
	disabled,
	icon,
}: {
	/** Names the action, not the state — "Hide highlights" while they are shown. */
	label: string
	pressed: boolean
	onPressedChange: (pressed: boolean) => void
	disabled?: boolean
	icon: ReactElement
}) {
	return (
		<Tooltip>
			<TooltipTrigger>
				<Button
					type="button"
					variant={pressed ? 'soft' : 'plain'}
					aria-label={label}
					aria-pressed={pressed}
					disabled={disabled}
					onClick={() => onPressedChange(!pressed)}
				>
					<Icon icon={icon} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}
