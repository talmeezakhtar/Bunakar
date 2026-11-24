import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Free: design, a few saved designs, small watermarked images. Pro: unlimited saves,
 * full-size renders, production exports. */
export enum UserPlan {
  FREE = 'free',
  PRO = 'pro',
}

export enum UserRole {
  SELLER = 'seller',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.SELLER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserPlan, default: UserPlan.FREE })
  plan: UserPlan;

  /** When the current plan started (null for Free accounts that never upgraded). */
  @Column({ type: 'timestamptz', nullable: true })
  planSince: Date | null;

  /** Signing out bumps this; tokens carry the value they were issued with, so older ones stop
   * working on every device. */
  @Column({ type: 'int', default: 0 })
  tokenVersion: number;

  @CreateDateColumn()
  createdAt: Date;
}
