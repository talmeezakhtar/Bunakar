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

export const CONSTRUCTIONS = [
  'knotted',
  'flatweave',
  'tufted',
  'hooked',
  'braided',
  'needlepoint',
  'tiles',
] as const;
export type Construction = (typeof CONSTRUCTIONS)[number];

/**
 * A Bunakar Studio rug. The whole rug document (layers, palette, layout, finish) lives in `doc`
 * as JSON, with its knot charts compressed inside it; the columns beside it are what lists need.
 */
@Entity('rug_designs')
@Index(['userId', 'updatedAt'])
export class RugDesign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 20 })
  construction: Construction;

  @Column('double precision')
  widthFt: number;

  @Column('double precision')
  heightFt: number;

  @Column({ type: 'jsonb' })
  doc: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  thumbnail: string | null;

  /** Whether the read-only share link works. The owner turns it on by sharing. */
  @Column({ default: false })
  shared: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
