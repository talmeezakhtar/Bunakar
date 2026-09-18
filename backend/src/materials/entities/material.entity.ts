import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum MaterialName {
  WOOL = 'wool',
  SILK = 'silk',
  JUTE = 'jute',
  COTTON = 'cotton',
}

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: MaterialName })
  name: MaterialName;

  @Column()
  textureSwatchUrl: string;
}
