import { Not } from 'typeorm';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { PaginatedResult, PaginationService } from './PaginationService';

const pagination = new PaginationService();

export type PublicUser = Omit<User, 'password' | 'recoverPassword' | 'recoverPasswordExpiresAt'>;

export function sanitizeUser(user: User): PublicUser {
  const { password, recoverPassword, recoverPasswordExpiresAt, ...publicData } = user;
  return publicData;
}

export class UserService {
  private repository = AppDataSource.getRepository(User);

  async create(data: Partial<User>): Promise<User> {
    const user = this.repository.create(data);
    return await this.repository.save(user);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<PaginatedResult<User>> {
    return pagination.paginate(this.repository, page, limit, { relations: { situation: true } });
  }

  async findById(id: number): Promise<User | null> {
    return await this.repository.findOne({ where: { id }, relations: { situation: true } });
  }

  async findByEmail(email: string, ignoreId?: number): Promise<User | null> {
    if (ignoreId !== undefined) {
      return await this.repository.findOne({
        where: {
          email,
          id: Not(ignoreId),
        },
      });
    }
    return await this.repository.findOne({ where: { email } });
  }

  async findByEmailWithSituation(email: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { email },
      relations: { situation: true },
    });
  }

  async findByRecoverKey(email: string, recoverPassword: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { email, recoverPassword },
    });
  }

  async save(user: User): Promise<User> {
    return await this.repository.save(user);
  }

  async update(id: number, data: Partial<User>): Promise<boolean> {
    const result = await this.repository.update(id, data);
    return (result.affected ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
