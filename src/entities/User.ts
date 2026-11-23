import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { Situation } from './Situation';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  password!: string;

  @Column({ type: 'enum', enum: ['ADMIN', 'USER'], default: 'USER' })
  tipoUsuario!: 'ADMIN' | 'USER';

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  recoverPassword!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  recoverPasswordExpiresAt!: Date | null;

  @Column({ type: 'int', nullable: true })
  situationId!: number;

  @ManyToOne(() => Situation, (situation) => situation.users, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'situationId' })
  situation!: Relation<Situation>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
