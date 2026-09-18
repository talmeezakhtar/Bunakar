import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ColorGroup {
  TRADITIONAL = 'traditional',
  PASTEL = 'pastel',
  BOLD = 'bold',
}

@Entity('colors')
export class Color {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  hex: string;

  @Column({ type: 'enum', enum: ColorGroup })
  group: ColorGroup;
}
