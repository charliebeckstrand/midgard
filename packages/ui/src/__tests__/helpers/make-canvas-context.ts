import { vi } from 'vitest'

/**
 * Build a stub CanvasRenderingContext2D; jsdom ships no canvas backend.
 * Override any field via `overrides` to assert on or replace behavior.
 */
export function makeCanvasContext(
	overrides: Partial<CanvasRenderingContext2D> = {},
): CanvasRenderingContext2D {
	const partial: Partial<CanvasRenderingContext2D> = {
		beginPath: vi.fn(),
		closePath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		arc: vi.fn(),
		fill: vi.fn(),
		stroke: vi.fn(),
		clearRect: vi.fn(),
		drawImage: vi.fn(),
		lineCap: 'butt',
		lineJoin: 'miter',
		strokeStyle: '#000',
		fillStyle: '#000',
		lineWidth: 1,
		...overrides,
	}

	return partial as CanvasRenderingContext2D
}
