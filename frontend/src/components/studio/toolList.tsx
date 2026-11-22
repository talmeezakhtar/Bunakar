import type { ReactNode } from 'react'
import { Circle, Eraser, Eyedropper, HandGrabbing, LineSegment, PaintBucket, PencilSimple, Selection, Square } from '@phosphor-icons/react'
import type { ChartTool } from './ChartCanvas'

/** Tools, with their keyboard shortcut. */
export const TOOLS: { id: ChartTool; label: string; key: string; icon: ReactNode }[] = [
  { id: 'pencil', label: 'Pencil', key: 'B', icon: <PencilSimple size={19} /> },
  { id: 'eraser', label: 'Eraser', key: 'E', icon: <Eraser size={19} /> },
  { id: 'line', label: 'Line', key: 'L', icon: <LineSegment size={19} /> },
  { id: 'rect', label: 'Rectangle', key: 'R', icon: <Square size={19} /> },
  { id: 'rect-fill', label: 'Filled rectangle', key: 'Shift+R', icon: <Square size={19} weight="fill" /> },
  { id: 'ellipse', label: 'Ellipse', key: 'O', icon: <Circle size={19} /> },
  { id: 'ellipse-fill', label: 'Filled ellipse', key: 'Shift+O', icon: <Circle size={19} weight="fill" /> },
  { id: 'fill', label: 'Fill', key: 'G', icon: <PaintBucket size={19} /> },
  { id: 'pick', label: 'Pick a yarn', key: 'I', icon: <Eyedropper size={19} /> },
  { id: 'select', label: 'Select', key: 'M', icon: <Selection size={19} /> },
  { id: 'hand', label: 'Move the view', key: 'H', icon: <HandGrabbing size={19} /> },
]
