import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('swatches')
export class Swatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
