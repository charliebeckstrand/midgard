// Rasterizes a box of the page to a bitmap. The capture clones the box,
// freezes the computed style of each node onto the clone, and draws the clone
// through an SVG `foreignObject` onto a canvas. The live page does not change.
// The chart export builds on the same parts, and adds a plan that prunes the
// legend and a crop.

/** The bitmap formats of a raster. */
export type RasterImageType = 'image/png' | 'image/jpeg'

/** Options for {@link rasterizeElement}. */
export type RasterizeElementOptions = {
	/**
	 * The format of the bitmap.
	 *
	 * @defaultValue 'image/png'
	 */
	type?: RasterImageType
	/**
	 * Paints the surface under the element below the image, so the image has no
	 * transparent pixels. A JPEG has no alpha, so it is always opaque.
	 *
	 * @defaultValue false
	 */
	opaque?: boolean
}

/** The pixel scale of a raster, so the bitmap stays sharp on a high-density display. @internal */
const RASTER_SCALE = 2

/** The JPEG quality passed to `toBlob`. @internal */
const JPEG_QUALITY = 0.95

/**
 * The latin face of the ui font. The bundler of the app copies the file and
 * gives its URL. The face of the page comes from the bytes in
 * `google-sans-flex-latin.js`, and a page cannot read the bytes of a face back.
 * The raster thus loads the same subset from this file.
 *
 * @internal
 */
const FONT_URL = new URL('../fonts/google-sans-flex-latin.woff2', import.meta.url)

/** The `@font-face` rule that a raster embeds, once a load of {@link FONT_URL} succeeds. @internal */
let fontRule: Promise<string> | undefined

/** A box in CSS pixels, relative to the border box of the captured root. @internal */
export type CaptureBox = { x: number; y: number; width: number; height: number }

/** A move in CSS pixels. @internal */
export type Shift = { x: number; y: number }

/** No move. @internal */
const NO_SHIFT: Shift = { x: 0, y: 0 }

/**
 * What a capture does to the clone: the boxes that it prunes, and the boxes
 * that it moves. The chart export prunes the legend and closes the band that
 * the legend leaves.
 *
 * @internal
 */
export type CapturePlan = {
	pruned: ReadonlySet<Element>
	shifts: ReadonlyMap<Element, Shift>
}

/** The plan of a capture that keeps each box in place: it prunes and moves nothing. @internal */
export const KEEP_ALL: CapturePlan = { pruned: new Set(), shifts: new Map() }

/** The alpha of a computed CSS color: `rgba(…)`, a slash alpha, or opaque. @internal */
function parseAlpha(color: string): number {
	if (color === 'transparent') return 0

	const alpha =
		/\/\s*([\d.]+)(%?)\s*\)$/.exec(color) ?? /^rgba\((?:[^,]+,){3}\s*([\d.]+)()\)$/.exec(color)

	if (!alpha) return 1

	return Number(alpha[1]) / (alpha[2] === '%' ? 100 : 1)
}

/**
 * The background colors under `root`, from the nearest opaque one inward,
 * outermost first: the surface that an element with no background of its own
 * shows on. A translucent surface keeps the ones beneath it, so a painter can
 * layer them.
 *
 * @internal
 */
export function readGround(root: HTMLElement): string[] {
	const layers: string[] = []

	for (let node: HTMLElement | null = root; node; node = node.parentElement) {
		const color = getComputedStyle(node).backgroundColor

		const alpha = parseAlpha(color)

		if (alpha > 0) layers.unshift(color)

		if (alpha >= 1) break
	}

	return layers
}

/**
 * Tells whether an element paints nothing and takes no space in the flow. The
 * clone drops such an element and its subtree, so it copies no style for them.
 * A hidden box in the flow stays, because it holds space.
 *
 * Three patterns match. The first is `display: none`. The second is the
 * `sr-only` pattern, such as the data table of a chart: an out-of-flow box of
 * 1px or less, which a clip hides. The third is an out-of-flow box with
 * `visibility: hidden`, such as the ghost row of a capped legend.
 *
 * @internal
 */
export function paintsNothing(style: CSSStyleDeclaration): boolean {
	if (style.display === 'none') return true

	if (style.position !== 'absolute' && style.position !== 'fixed') return false

	if (style.visibility !== 'visible') return true

	const clipped = style.clipPath !== 'none' || style.getPropertyValue('clip') !== 'auto'

	return clipped && Number.parseFloat(style.width) <= 1 && Number.parseFloat(style.height) <= 1
}

/**
 * The SVG elements that paint only by reference: the definitions, the paint
 * servers, and the masks, clips, markers, symbols, and filters. The SVG 2
 * user-agent sheet sets `display: none` on them, but a reference still paints
 * them, so the capture keeps them whatever their display.
 *
 * @internal
 */
const SVG_RESOURCES = new Set([
	'defs',
	'pattern',
	'lineargradient',
	'radialgradient',
	'mask',
	'clippath',
	'marker',
	'symbol',
	'filter',
])

/** Whether `element` is an SVG element that paints only by reference. @internal */
function isSvgResource(element: Element): boolean {
	return element instanceof SVGElement && SVG_RESOURCES.has(element.localName.toLowerCase())
}

/**
 * Copies a source element's full computed style inline onto its clone.
 * Rasterizing through a `foreignObject` renders the clone detached from the
 * document's stylesheets. Every class-driven and inherited value (color,
 * layout, and font) therefore has to travel on the element itself. An image
 * cannot scroll, so the clone shows no scrollbar. The declarations in `extra`
 * come last, so they override the copied values.
 *
 * @internal
 */
function copyComputedStyle(computed: CSSStyleDeclaration, clone: Element, extra: string): void {
	clone.setAttribute(
		'style',
		Array.from(computed, (property) => `${property}:${computed.getPropertyValue(property)};`).join(
			'',
		) + `scrollbar-width:none;${extra}`,
	)
}

/**
 * Splits a computed value at each `separator` outside parentheses, such as the
 * spaces of `calc(50% + 2px) 4px`, or the commas between the layers of a
 * `box-shadow`. Each part is trimmed, and an empty part is dropped.
 *
 * @internal
 */
function splitValue(value: string, separator = ' '): string[] {
	const parts: string[] = []

	let depth = 0

	let part = ''

	for (const character of value) {
		if (character === '(') depth++

		if (character === ')') depth--

		if (character === separator && depth === 0) {
			if (part.trim()) parts.push(part.trim())

			part = ''
		} else {
			part += character
		}
	}

	if (part.trim()) parts.push(part.trim())

	return parts
}

/** One layer of a computed `box-shadow`. @internal */
type ShadowLayer = {
	/** The text of the layer, as the computed value gives it. */
	text: string
	color: string
	/** The offsets, the blur, and the spread, in CSS pixels. */
	lengths: number[]
	inset: boolean
}

/** Reads the layers of a computed `box-shadow`, such as `rgb(0 0 0) 0px 0px 0px 1px inset`. @internal */
function readShadows(boxShadow: string): ShadowLayer[] {
	if (boxShadow === 'none') return []

	return splitValue(boxShadow, ',').map((text) => {
		const tokens = splitValue(text)

		return {
			text,
			color: tokens.find((token) => token !== 'inset' && !token.endsWith('px')) ?? 'currentcolor',
			lengths: tokens.filter((token) => token.endsWith('px')).map(Number.parseFloat),
			inset: tokens.includes('inset'),
		}
	})
}

/** The style that {@link ringToOutline} reads. @internal */
export type RingStyle = Pick<CSSStyleDeclaration, 'boxShadow' | 'outlineStyle' | 'borderTopWidth'>

/**
 * Gives the declarations that draw a shadow ring of an element as an outline.
 * A shadow ring is a visible `box-shadow` layer with a spread, and with no
 * offset and no blur, such as the `ring` and `inset-ring` of Tailwind.
 *
 * WebKit on iOS draws such a layer at the wrong place in an SVG image, so a
 * raster shows only a part of the ring. It draws an outline correctly. Thus
 * the capture draws the ring as an outline of the same width and color. An
 * inset ring is in the padding box, so its outline goes in by the border and
 * by the spread. The other layers stay a `box-shadow`.
 *
 * The rule applies when the element has one shadow ring and no outline of its
 * own, because an element has only one outline. Else it gives no declaration.
 *
 * @internal
 */
export function ringToOutline(style: RingStyle): string {
	if (style.outlineStyle !== 'none') return ''

	const layers = readShadows(style.boxShadow)

	const rings = layers.filter(({ color, lengths: [x = 0, y = 0, blur = 0, spread = 0] }) => {
		return x === 0 && y === 0 && blur === 0 && spread > 0 && parseAlpha(color) > 0
	})

	const [ring] = rings

	if (!ring || rings.length > 1) return ''

	const spread = ring.lengths[3] ?? 0

	const offset = ring.inset ? -(Number.parseFloat(style.borderTopWidth) + spread) : 0

	const rest = layers.filter((layer) => layer !== ring).map((layer) => layer.text)

	return `box-shadow:${rest.join(',') || 'none'};outline:${spread}px solid ${ring.color};outline-offset:${offset}px;`
}

/**
 * Adds `move` to the computed `translate` of an element. The move then adds to
 * a translate of the element, and does not replace it. The `translate`
 * property applies before the `rotate`, `scale`, and `transform` of the
 * element, so the move is in the frame of the parent.
 *
 * @internal
 */
function addTranslate(translate: string, move: Shift): string {
	const [x = '0px', y = '0px', z] = translate === 'none' ? [] : splitValue(translate)

	return `calc(${x} + ${move.x}px) calc(${y} + ${move.y}px)${z ? ` ${z}` : ''}`
}

/**
 * Walks a source tree and its clone in lockstep, and freezes each node's
 * computed style onto the clone ({@link copyComputedStyle}). The detached copy
 * then lays out and paints exactly as rendered. The walk drops each child that
 * paints nothing ({@link paintsNothing}). It empties each box that the plan
 * prunes, and moves each box that the plan moves. It draws a shadow ring as an
 * outline ({@link ringToOutline}).
 *
 * A clone shows each scroll box at its start. Thus the walk moves each child of
 * a scrolled box by the scroll offset, so the clone shows the part of the box
 * that the page shows. A fixed child does not scroll, so it does not move.
 *
 * @param offset - The move that the scroll of the parent gives to `source`.
 * @internal
 */
export function freezeStyleTree(
	source: Element,
	clone: Element,
	computed: CSSStyleDeclaration,
	plan: CapturePlan,
	offset: Shift = NO_SHIFT,
): void {
	// A pruned box stays as an empty, hidden box of the same size. The rest of
	// the clone then lays out as the page does, and the planned moves hold.
	if (plan.pruned.has(source)) {
		clone.replaceChildren()

		copyComputedStyle(computed, clone, 'visibility:hidden;')

		return
	}

	const shift = plan.shifts.get(source) ?? NO_SHIFT

	const move = { x: shift.x + offset.x, y: shift.y + offset.y }

	copyComputedStyle(
		computed,
		clone,
		(move.x || move.y ? `translate:${addTranslate(computed.translate, move)};` : '') +
			ringToOutline(computed),
	)

	const scroll = { x: -source.scrollLeft, y: -source.scrollTop }

	// Pair the children before a removal, so the two lists stay in step.
	const sourceChildren = Array.from(source.children)

	const cloneChildren = Array.from(clone.children)

	for (const [index, sourceChild] of sourceChildren.entries()) {
		const cloneChild = cloneChildren[index]

		if (!cloneChild) continue

		const style = getComputedStyle(sourceChild)

		if (paintsNothing(style) && !isSvgResource(sourceChild)) cloneChild.remove()
		else
			freezeStyleTree(
				sourceChild,
				cloneChild,
				style,
				plan,
				style.position === 'fixed' ? NO_SHIFT : scroll,
			)
	}
}

/** Reads a blob as a `data:` URL. @internal */
function toDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()

		reader.addEventListener('load', () => resolve(reader.result as string))

		reader.addEventListener('error', () => reject(reader.error))

		reader.readAsDataURL(blob)
	})
}

/**
 * Gives the `@font-face` rule of the latin face of the ui font, with the bytes
 * of the face in a `data:` URL.
 *
 * An image that an SVG draws loads no file, so the face of the page does not
 * reach the `foreignObject` raster, and the text of the image falls back to a
 * system font. A `data:` URL holds the bytes in the image, so the raster draws
 * the text in the ui font. The first raster loads the file, and each later
 * raster uses the same rule. When the load fails, the rule is empty, the image
 * draws its text in the fallback font, and the next raster tries again.
 *
 * @internal
 */
function embeddedFontRule(): Promise<string> {
	fontRule ??= fetch(FONT_URL)
		.then((response) => {
			if (!response.ok) throw new Error(`raster font failed to load: ${response.status}`)

			return response.blob()
		})
		.then((blob) => toDataUrl(new Blob([blob], { type: 'font/woff2' })))
		.then(
			(source) =>
				`@font-face{font-family:'Google Sans Flex';font-weight:300 900;font-display:block;src:url(${source}) format('woff2-variations');}`,
		)
		.catch(() => {
			fontRule = undefined

			return ''
		})

	return fontRule
}

/** Loads a data-URL into an `Image`, resolving once decoded. @internal */
function loadImage(source: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image()

		image.decoding = 'async'

		image.addEventListener('load', () => resolve(image))

		image.addEventListener('error', () => reject(new Error('raster image failed to load')))

		image.src = source
	})
}

/**
 * Draws a decoded image to a `2×` canvas and encodes it. With a `ground`, it
 * paints white and then each surface layer under the image, so the image has no
 * transparent pixels. With no `ground`, a PNG keeps its transparent pixels.
 *
 * @internal
 */
async function encode(
	image: HTMLImageElement,
	width: number,
	height: number,
	type: RasterImageType,
	ground: string[] | null,
): Promise<Blob | null> {
	const canvas = document.createElement('canvas')

	canvas.width = width * RASTER_SCALE

	canvas.height = height * RASTER_SCALE

	const context = canvas.getContext('2d')

	if (!context) return null

	if (ground) {
		// White under all, so a translucent ground with no opaque one beneath it
		// never blends with the black of an empty canvas.
		for (const color of ['#ffffff', ...ground]) {
			context.fillStyle = color

			context.fillRect(0, 0, canvas.width, canvas.height)
		}
	}

	context.drawImage(image, 0, 0, canvas.width, canvas.height)

	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), type, JPEG_QUALITY)
	})
}

/**
 * Draws a frozen clone ({@link freezeStyleTree}) to a bitmap, cropped to `box`.
 * The SVG embeds the latin face of the ui font, so the text of the image keeps
 * the font of the page. A JPEG always paints its `ground`.
 *
 * @param clone - The frozen clone. It must have the size of its source root.
 * @param box - The crop, relative to the border box of the source root.
 * @param ground - The surface to paint under the image, or `null` for none.
 * @internal
 */
export async function drawClone(
	clone: HTMLElement,
	box: CaptureBox,
	type: RasterImageType,
	ground: string[] | null,
): Promise<Blob | null> {
	// The clone keeps the size of the root. It moves by the crop origin, so the
	// crop fills the image.
	clone.style.translate = `${-box.x}px ${-box.y}px`

	clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')

	const serialized = new XMLSerializer().serializeToString(clone)

	const font = await embeddedFontRule()

	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}">` +
		`<style>${font}</style>` +
		`<foreignObject x="0" y="0" width="${box.width}" height="${box.height}">${serialized}</foreignObject></svg>`

	const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)

	return encode(image, box.width, box.height, type, type === 'image/jpeg' ? (ground ?? []) : ground)
}

/**
 * Rasterizes an element to a {@link Blob}, as the page shows it now: its border
 * box, with each scroll box at its scroll offset. The capture clones the
 * element, freezes the computed style of each node onto the clone, and draws
 * the clone through an SVG `foreignObject` at twice the CSS pixel size. The
 * live page does not change. The image embeds the latin face of the ui font.
 *
 * The capture measures and clones before its first `await`, so a change of the
 * page after the call does not show. An element in a portal, such as an open
 * menu, is not in the element, so it does not show.
 *
 * @remarks
 * The raster loads no file. An `<img>` with a URL that is not a `data:` URL, a
 * `<canvas>`, and a `<video>` draw empty. The value of a form field that the
 * reader typed does not show, because a clone copies attributes only. A sticky
 * box in a scrolled box draws where the scroll puts the content. The capture
 * moves each child of a scrolled box with `translate`, and a translated box is
 * the containing block of each positioned box in it. Thus a fixed or absolute
 * box below a child of a scrolled box, whose containing block is the scrolled
 * box or a box above it, draws at the wrong place after a scroll.
 *
 * @param root - The element to capture.
 * @param options - The bitmap `type`, and whether the image is `opaque`.
 * @returns The encoded image, or `null` when the canvas cannot encode it.
 */
export function rasterizeElement(
	root: HTMLElement,
	{ type = 'image/png', opaque = false }: RasterizeElementOptions = {},
): Promise<Blob | null> {
	const rect = root.getBoundingClientRect()

	const box: CaptureBox = {
		x: 0,
		y: 0,
		width: Math.max(1, Math.round(rect.width)),
		height: Math.max(1, Math.round(rect.height)),
	}

	const clone = root.cloneNode(true) as HTMLElement

	freezeStyleTree(root, clone, getComputedStyle(root), KEEP_ALL)

	// The box is the border box of the root, which excludes its margin. The
	// clone therefore drops the margin, so it starts at the origin of the box.
	clone.style.margin = '0'

	return drawClone(clone, box, type, opaque ? readGround(root) : null)
}
