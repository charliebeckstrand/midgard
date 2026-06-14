/**
 * Geometry and visibility for one scrollbar thumb, in pixels.
 *
 * @internal
 */
export type ThumbState = { size: number; offset: number; visible: boolean }

/**
 * Zero-size, hidden thumb used when content fits the viewport.
 *
 * @internal
 */
export const hiddenThumb: ThumbState = { size: 0, offset: 0, visible: false }

/**
 * Floor for thumb length in pixels; keeps the thumb grabbable on long content.
 *
 * @internal
 */
export const MIN_THUMB_SIZE = 20

/**
 * Idle delay before the auto-mode scrollbar fades out, in milliseconds.
 *
 * @internal
 */
export const SCROLL_FADE_DELAY_MS = 800
