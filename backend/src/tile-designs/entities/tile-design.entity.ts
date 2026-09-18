import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum TileDesignOrientation {
  NORMAL = 'normal',
  DIAGONAL = 'diagonal',
}

export enum TileRugCategory {
  AREA = 'area',
  RUNNER = 'runner',
  WALL = 'wall',
}

export enum TileCutType {
  FULL = 'full',
  HALF = 'half',
  QUAD = 'quad',
  THIRD = 'third',
  QUARTER = 'quarter',
  NINTH = 'ninth',
  SIXTEENTH = 'sixteenth',
  DIAGONAL = 'diagonal',
  ARC = 'arc',
  ARC_REMNANT = 'arc-remnant',
}

export interface TileSlot {
  x: number;
  y: number;
}

export interface TileCell {
  row: number;
  col: number;
  swatchId: string;
  cutType: TileCutType;
  rotation: 0 | 90 | 180 | 270;
  /** Sub-cell grid index for cuts that subdivide a tile (quad, third, quarter, ninth,
   * sixteenth) - which slot of that grid the piece occupies. Omitted for fixed-orientation
   * cuts, which use `rotation` instead. */
  slot?: TileSlot;
}

@Entity('tile_designs')
export class TileDesign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column('int')
  widthTiles: number;

  @Column('int')
  heightTiles: number;

  @Column({ type: 'enum', enum: TileDesignOrientation, default: TileDesignOrientation.NORMAL })
  orientation: TileDesignOrientation;

  @Column({ type: 'enum', enum: TileRugCategory, default: TileRugCategory.AREA })
  rugCategory: TileRugCategory;

  @Column()
  backgroundId: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  tiles: TileCell[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  myStyles: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
