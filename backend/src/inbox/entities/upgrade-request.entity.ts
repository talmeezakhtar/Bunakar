import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Someone asking for Pro, until payments are connected (the Pro waitlist). */
@Entity('upgrade_requests')
export class UpgradeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  /** 'home' (designing for their own home) or 'business' (studio, maker, exporter). */
  @Column()
  use: string;

  /** 'monthly' or 'yearly'. */
  @Column()
  billing: string;

  @Column('text', { nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
