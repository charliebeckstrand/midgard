import { k } from '../../recipes/kata/container'

export const sizeMap = k.size
export const paddingMap = k.padding

export type ContainerSize = keyof typeof sizeMap
export type ContainerPadding = keyof typeof paddingMap
