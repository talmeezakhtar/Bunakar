import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Color } from '../../colors/entities/color.entity';
import { Pattern } from '../../patterns/entities/pattern.entity';
import { Design } from './design.entity';

@Entity('design_borders')
export class DesignBorder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Design, (design) => design.borders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'designId' })
  design: Design;

  @Column()
  designId: string;

  @Column('int')
  order: number;

  @Column('float')
  widthIn: number;

  @ManyToOne(() => Color)
  @JoinColumn({ name: 'colorId' })
  color: Color;

  @Column()
  colorId: string;

  @ManyToOne(() => Pattern)
  @JoinColumn({ name: 'patternId' })
  pattern: Pattern;

  @Column()
  patternId: string;
}
