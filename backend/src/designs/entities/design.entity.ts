import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Color } from '../../colors/entities/color.entity';
import { Pattern } from '../../patterns/entities/pattern.entity';
import { Material } from '../../materials/entities/material.entity';
import { PileType } from '../../materials/entities/pile-type.entity';
import { DesignBorder } from './design-border.entity';

export enum DesignShape {
  RECTANGLE = 'rectangle',
  ROUND = 'round',
  RUNNER = 'runner',
}

@Entity('designs')
export class Design {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column()
  sellerId: string;

  @Column({ type: 'enum', enum: DesignShape })
  shape: DesignShape;

  @Column('float')
  widthFt: number;

  @Column('float')
  heightFt: number;

  @ManyToOne(() => Color)
  @JoinColumn({ name: 'fieldColorId' })
  fieldColor: Color;

  @Column()
  fieldColorId: string;

  @ManyToOne(() => Pattern)
  @JoinColumn({ name: 'fieldPatternId' })
  fieldPattern: Pattern;

  @Column()
  fieldPatternId: string;

  @OneToMany(() => DesignBorder, (border) => border.design, {
    cascade: true,
    eager: true,
  })
  borders: DesignBorder[];

  @Column({ default: false })
  medallionEnabled: boolean;

  @ManyToOne(() => Pattern, { nullable: true })
  @JoinColumn({ name: 'medallionPatternId' })
  medallionPattern: Pattern | null;

  @Column({ nullable: true })
  medallionPatternId: string | null;

  @ManyToOne(() => Color, { nullable: true })
  @JoinColumn({ name: 'medallionColorId' })
  medallionColor: Color | null;

  @Column({ nullable: true })
  medallionColorId: string | null;

  @Column('float', { default: 1 })
  medallionScale: number;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'materialId' })
  material: Material;

  @Column()
  materialId: string;

  @ManyToOne(() => PileType)
  @JoinColumn({ name: 'pileTypeId' })
  pileType: PileType;

  @Column()
  pileTypeId: string;

  @Column('numeric', { precision: 10, scale: 2 })
  priceEstimate: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
