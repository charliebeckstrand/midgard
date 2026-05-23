export type ThumbState = { size: number; offset: number; visible: boolean }

export const hiddenThumb: ThumbState = { size: 0, offset: 0, visible: false }

export const MIN_THUMB_SIZE = 20

export const SCROLL_FADE_DELAY_MS = 800
