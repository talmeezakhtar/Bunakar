import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum PileTypeName {
  HAND_KNOTTED = 'hand_knotted',
  TUFTED = 'tufted',
  FLATWEAVE = 'flatweave',
  SHAG = 'shag',
}

@Entity('pile_types')
export class PileType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PileTypeName })
  name: PileTypeName;

  @Column()
  textureSwatchUrl: string;
}
