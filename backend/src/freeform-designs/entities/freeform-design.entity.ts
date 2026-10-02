import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { TileRugCategory } from '../../tile-designs/entities/tile-design.entity';

export type PileTexture = 'cut' | 'loop' | 'shag' | 'highlow' | 'photo';
export type Carving = 'none' | 'groove' | 'ribbed' | 'contour';
export type PileHeight = 'low' | 'standard' | 'high';

/** How a surface is made: which yarn colour, pile, carving and height. */
export interface SurfaceFinish {
  swatchId: string;
  texture: PileTexture;
  carve: Carving;
  carveAngle: number;
  pile: PileHeight;
}

/** One free-form region of a hand-tufted rug; points are in feet from the top-left corner. */
export interface FreeformShape extends SurfaceFinish {
  id: string;
  points: { x: number; y: number }[];
  smooth: boolean;
}

/** A single-piece hand-tufted rug (not modular tiles): a ground plus shapes laid over it. */
@Entity('freeform_designs')
// Serves "my designs, newest first" - every list query filters by owner and sorts by date.
@Index(['userId', 'updatedAt'])
export class FreeformDesign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column('float')
  widthFt: number;

  @Column('float')
  heightFt: number;

  @Column({
    type: 'enum',
    enum: TileRugCategory,
    default: TileRugCategory.AREA,
  })
  rugCategory: TileRugCategory;

  @Column()
  backgroundId: string;

  @Column({ type: 'jsonb' })
  ground: SurfaceFinish;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  shapes: FreeformShape[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  myStyles: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
