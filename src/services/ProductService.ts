import { AppDataSource } from '../data-source';
import { Product } from '../entities/Product';
import { PaginatedResult, PaginationService } from './PaginationService';

const pagination = new PaginationService();

export function generateBaseSlug(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'produto';
}

export class ProductService {
  private repository = AppDataSource.getRepository(Product);

  async create(data: Partial<Product>): Promise<Product> {
    const product = this.repository.create(data);
    return await this.repository.save(product);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<PaginatedResult<Product>> {
    return pagination.paginate(this.repository, page, limit, {
      relations: { productCategory: true, productSituation: true },
    });
  }

  async findById(id: number): Promise<Product | null> {
    return await this.repository.findOne({
      where: { id },
      relations: { productCategory: true, productSituation: true },
    });
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return await this.repository.findOneBy({ slug });
  }

  async generateUniqueSlug(name: string, ignoreId?: number): Promise<string> {
    const base = generateBaseSlug(name);
    let slug = base;
    let counter = 2;

    while (true) {
      const existing = await this.findBySlug(slug);
      if (!existing || existing.id === ignoreId) {
        return slug;
      }
      slug = `${base}-${counter}`;
      counter++;
    }
  }

  async update(id: number, data: Partial<Product>): Promise<boolean> {
    const result = await this.repository.update(id, data);
    return (result.affected ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
