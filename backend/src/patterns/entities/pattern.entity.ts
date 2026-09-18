import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum PatternCategory {
  GEOMETRIC = 'geometric',
  PERSIAN_FLORAL = 'persian_floral',
  MEDALLION = 'medallion',
  TRIBAL = 'tribal',
  CONTEMPORARY = 'contemporary',
}

@Entity('patterns')
export class Pattern {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: PatternCategory })
  category: PatternCategory;

  @Column({ type: 'text' })
  svgPath: string;

  @Column({ type: 'jsonb', default: () => '\'["primary","secondary"]\'' })
  colorSlots: string[];
}
