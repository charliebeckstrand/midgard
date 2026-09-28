import { encode } from 'uqr'

type QrCodeProps = {
	/** The text that the code holds. */
	value: string
	/** The name for assistive technology. */
	label: string
	className?: string
}

/**
 * QR code of `value`, drawn as SVG with one path, so it scales without blur.
 *
 * @remarks
 * The code is dark on a white ground in both color schemes, because a scanner
 * needs the contrast. The four-module border is the quiet zone that the QR
 * standard asks for.
 */
export function QrCode({ value, label, className }: QrCodeProps) {
	const { data, size } = encode(value, { border: 4 })

	let path = ''

	data.forEach((row, y) => {
		row.forEach((dark, x) => {
			if (dark) path += `M${x} ${y}h1v1h-1z`
		})
	})

	return (
		<svg
			role="img"
			aria-label={label}
			viewBox={`0 0 ${size} ${size}`}
			shapeRendering="crispEdges"
			className={className}
		>
			<rect width={size} height={size} fill="#fff" />
			<path d={path} fill="#000" />
		</svg>
	)
}
