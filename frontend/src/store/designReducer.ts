import type { Design, DesignBorder, DesignShape } from '../types/design'

export type DesignAction =
  | { type: 'SET_SHAPE'; shape: DesignShape }
  | { type: 'SET_SIZE'; widthFt: number; heightFt: number }
  | { type: 'SET_FIELD_COLOR'; colorId: string }
  | { type: 'SET_FIELD_PATTERN'; patternId: string }
  | { type: 'ADD_BORDER'; border: DesignBorder }
  | { type: 'UPDATE_BORDER'; index: number; border: Partial<DesignBorder> }
  | { type: 'REMOVE_BORDER'; index: number }
  | { type: 'REORDER_BORDERS'; borders: DesignBorder[] }
  | { type: 'SET_MEDALLION'; enabled: boolean; patternId?: string; colorId?: string; scale?: number }
  | { type: 'SET_MATERIAL'; materialId: string }
  | { type: 'SET_PILE_TYPE'; pileTypeId: string }
  | { type: 'RESET'; design: Design }

export function designReducer(state: Design, action: DesignAction): Design {
  switch (action.type) {
    case 'SET_SHAPE':
      return { ...state, shape: action.shape }
    case 'SET_SIZE':
      return { ...state, widthFt: action.widthFt, heightFt: action.heightFt }
    case 'SET_FIELD_COLOR':
      return { ...state, fieldColorId: action.colorId }
    case 'SET_FIELD_PATTERN':
      return { ...state, fieldPatternId: action.patternId }
    case 'ADD_BORDER':
      return { ...state, borders: [...state.borders, action.border] }
    case 'UPDATE_BORDER':
      return {
        ...state,
        borders: state.borders.map((border, i) =>
          i === action.index ? { ...border, ...action.border } : border,
        ),
      }
    case 'REMOVE_BORDER':
      return { ...state, borders: state.borders.filter((_, i) => i !== action.index) }
    case 'REORDER_BORDERS':
      return { ...state, borders: action.borders }
    case 'SET_MEDALLION':
      return {
        ...state,
        medallionEnabled: action.enabled,
        medallionPatternId: action.patternId ?? state.medallionPatternId,
        medallionColorId: action.colorId ?? state.medallionColorId,
        medallionScale: action.scale ?? state.medallionScale,
      }
    case 'SET_MATERIAL':
      return { ...state, materialId: action.materialId }
    case 'SET_PILE_TYPE':
      return { ...state, pileTypeId: action.pileTypeId }
    case 'RESET':
      return action.design
    default:
      return state
  }
}
