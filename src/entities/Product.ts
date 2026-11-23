import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { ProductCategory } from './ProductCategory';
import { ProductSituation } from './ProductSituation';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  slug!: string;

  @Column({ type: 'longtext', nullable: false })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price!: number;

  @Column({ type: 'int', nullable: true })
  productSituationId!: number;

  @Column({ type: 'int', nullable: true })
  productCategoryId!: number;

  @ManyToOne(() => ProductSituation, (situation) => situation.products, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productSituationId' })
  productSituation!: Relation<ProductSituation>;

  @ManyToOne(() => ProductCategory, (category) => category.products, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productCategoryId' })
  productCategory!: Relation<ProductCategory>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
