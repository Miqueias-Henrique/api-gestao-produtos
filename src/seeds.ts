import bcrypt from 'bcryptjs';
import { AppDataSource } from './data-source';
import { Product } from './entities/Product';
import { ProductCategory } from './entities/ProductCategory';
import { ProductSituation } from './entities/ProductSituation';
import { Situation } from './entities/Situation';
import { User } from './entities/User';

async function runSeeds() {
  console.log('Conectando ao banco de dados via TypeORM para o Seed...');
  await AppDataSource.initialize();

  try {
    const categoryRepo = AppDataSource.getRepository(ProductCategory);
    const prodSitRepo = AppDataSource.getRepository(ProductSituation);
    const userSitRepo = AppDataSource.getRepository(Situation);
    const userRepo = AppDataSource.getRepository(User);

    const categories = ['Eletrônicos', 'Móveis', 'Roupas', 'Alimentos'];
    for (const name of categories) {
      if (!(await categoryRepo.findOneBy({ name }))) {
        await categoryRepo.save(categoryRepo.create({ name }));
      }
    }
    console.log('Categorias verificadas/inseridas.');

    const productSituations = ['Em Estoque', 'Esgotado', 'Descontinuado'];
    for (const name of productSituations) {
      if (!(await prodSitRepo.findOneBy({ name }))) {
        await prodSitRepo.save(prodSitRepo.create({ name }));
      }
    }
    console.log('Situações de Produto verificadas/inseridas.');

    const userSituations = ['Ativo', 'Inativo', 'Pendente', 'Banido'];
    for (const nameSituation of userSituations) {
      if (!(await userSitRepo.findOneBy({ nameSituation }))) {
        await userSitRepo.save(userSitRepo.create({ nameSituation }));
      }
    }
    console.log('Situações de Usuário verificadas/inseridas.');

    const activeSituation = await userSitRepo.findOneByOrFail({ nameSituation: 'Ativo' });
    const defaultPassword = await bcrypt.hash('12345678', 10);

    const seedUsers: Array<{
      name: string;
      email: string;
      tipoUsuario: 'ADMIN' | 'USER';
    }> = [
      { name: 'Admin', email: 'admin@sistema.com', tipoUsuario: 'ADMIN' },
      { name: 'Usuário Padrão', email: 'usuario@sistema.com', tipoUsuario: 'USER' },
    ];

    for (const item of seedUsers) {
      if (!(await userRepo.findOneBy({ email: item.email }))) {
        await userRepo.save(userRepo.create({
          name: item.name,
          email: item.email,
          password: defaultPassword,
          tipoUsuario: item.tipoUsuario,
          situationId: activeSituation.id,
        }));
      }
    }
    console.log('Usuários verificados/inseridos.');

    const productRepo = AppDataSource.getRepository(Product);
    const inStock = await prodSitRepo.findOneByOrFail({ name: 'Em Estoque' });
    const products = [
      {
        name: 'Notebook',
        slug: 'notebook',
        description: 'Notebook para uso pessoal e profissional.',
        price: 3500.0,
        category: 'Eletrônicos',
      },
      {
        name: 'Cadeira',
        slug: 'cadeira',
        description: 'Cadeira ergonômica para escritório.',
        price: 850.0,
        category: 'Móveis',
      },
      {
        name: 'Camiseta',
        slug: 'camiseta',
        description: 'Camiseta básica de algodão.',
        price: 79.9,
        category: 'Roupas',
      },
    ];
    for (const item of products) {
      if (!(await productRepo.findOneBy({ slug: item.slug }))) {
        const category = await categoryRepo.findOneByOrFail({ name: item.category });
        await productRepo.save(productRepo.create({
          name: item.name,
          slug: item.slug,
          description: item.description,
          price: item.price,
          productCategoryId: category.id,
          productSituationId: inStock.id,
        }));
      }
    }
    console.log('Produtos verificados/inseridos.');

    console.log('Seeds finalizados com sucesso!');
  } finally {
    await AppDataSource.destroy();
  }
}

runSeeds().catch(error => {
  console.error('Erro ao executar seeds:', error);
  process.exitCode = 1;
});
