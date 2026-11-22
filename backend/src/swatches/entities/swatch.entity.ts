import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('swatches')
export class Swatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Stable slug (e.g. `solid-wine`), the id clients see. The uuid stays internal. */
  @Column({ unique: true })
  code: string;

  @Column()
  familyId: string;

  @Column()
  familyName: string;

  @Column()
  colorName: string;

  @Column()
  swatchColor: string;

  /** Top-view photo of one physical tile; null for flat-color styles. */
  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  categories: string[];
}
