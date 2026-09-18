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

  @Column({ type: 'jsonb', default: () => "'[]'" })
  categories: string[];
}
