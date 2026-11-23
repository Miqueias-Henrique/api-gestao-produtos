const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { PaginationService, PageOutOfRangeError } = require('../dist/services/PaginationService');
const { SituationService } = require('../dist/services/SituationService');
const { UserService } = require('../dist/services/UserService');
const { ProductService, generateBaseSlug } = require('../dist/services/ProductService');
const { ProductCategoryService } = require('../dist/services/ProductCategoryService');
const { ProductSituationService } = require('../dist/services/ProductSituationService');
const { MailService } = require('../dist/services/MailService');

async function main() {
  process.env.JWT_SECRET = 'test-jwt-secret';

  const pagination = new PaginationService();
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
  let optionsSeen;
  const repository = {
    async findAndCount(options) {
      optionsSeen = options;
      const ordered = [...rows].sort((a, b) => b.id - a.id);
      return [ordered.slice(options.skip, options.skip + options.take), rows.length];
    },
  };

  const first = await pagination.paginate(repository, 1, 2, { relations: { situation: true } });
  assert.deepEqual(first, { data: [{ id: 3 }, { id: 2 }], total: 3, page: 1, limit: 2, lastPage: 2 });
  assert.deepEqual(optionsSeen.relations, { situation: true });
  assert.deepEqual(optionsSeen.order, { id: 'DESC' });

  const second = await pagination.paginate(repository, 2, 2);
  assert.deepEqual(second.data, [{ id: 1 }]);
  assert.equal(optionsSeen.skip, 2);
  await assert.rejects(() => pagination.paginate(repository, 3, 2), PageOutOfRangeError);

  const emptyRepository = { async findAndCount() { return [[], 0]; } };
  assert.deepEqual(await pagination.paginate(emptyRepository), {
    data: [], total: 0, page: 1, limit: 10, lastPage: 0,
  });
  await assert.rejects(() => pagination.paginate(emptyRepository, 2), PageOutOfRangeError);
  console.log('PASS: paginação, ordenação, relações e página inexistente.');

  const serviceInstance = new SituationService();
  let findOneQuery;
  serviceInstance.repository = {
    async findOne(query) {
      findOneQuery = query;
      return null;
    },
  };
  await serviceInstance.findByName('Ativo');
  assert.deepEqual(findOneQuery, { where: { nameSituation: 'Ativo' } });
  await serviceInstance.findByName('Ativo', 1);
  assert.equal(findOneQuery.where.nameSituation, 'Ativo');
  assert.equal(findOneQuery.where.id._type, 'not');
  assert.equal(findOneQuery.where.id._value, 1);

  assert.equal(generateBaseSlug('Café com Leite 100%'), 'cafe-com-leite-100');
  assert.equal(generateBaseSlug('!!!'), 'produto');

  const memorySituations = [
    { id: 1, nameSituation: 'Ativo' },
    { id: 2, nameSituation: 'Inativo' },
  ];
  const adminPasswordHash = await bcrypt.hash('admin1234', 10);
  const userPasswordHash = await bcrypt.hash('user12345', 10);
  const memoryUsers = [
    {
      id: 1,
      name: 'Administrador',
      email: 'admin@teste.com',
      password: adminPasswordHash,
      tipoUsuario: 'ADMIN',
      recoverPassword: null,
      recoverPasswordExpiresAt: null,
      situationId: 1,
      situation: memorySituations[0],
    },
    {
      id: 2,
      name: 'Usuário Comum',
      email: 'user@teste.com',
      password: userPasswordHash,
      tipoUsuario: 'USER',
      recoverPassword: null,
      recoverPasswordExpiresAt: null,
      situationId: 1,
      situation: memorySituations[0],
    },
    {
      id: 3,
      name: 'Usuário Inativo',
      email: 'inativo@teste.com',
      password: userPasswordHash,
      tipoUsuario: 'USER',
      recoverPassword: null,
      recoverPasswordExpiresAt: null,
      situationId: 2,
      situation: memorySituations[1],
    },
  ];
  const memoryCategories = [{ id: 1, name: 'Eletrônicos' }];
  const memoryProductSituations = [{ id: 1, name: 'Em Estoque' }];
  const memoryProducts = [];
  let sentRecoverEmail = null;

  SituationService.prototype.findById = async (id) =>
    memorySituations.find((item) => item.id === id) ?? null;
  SituationService.prototype.findByName = async (nameSituation, ignoreId) =>
    memorySituations.find(
      (item) => item.nameSituation === nameSituation && (ignoreId === undefined || item.id !== ignoreId),
    ) ?? null;
  SituationService.prototype.create = async (data) => {
    const created = { id: memorySituations.length + 1, ...data };
    memorySituations.push(created);
    return created;
  };
  SituationService.prototype.update = async (id, data) => {
    const item = memorySituations.find((row) => row.id === id);
    if (!item) return false;
    Object.assign(item, data);
    return true;
  };

  UserService.prototype.findAll = async (page = 1, limit = 10) => ({
    data: [...memoryUsers].reverse(),
    total: memoryUsers.length,
    page,
    limit,
    lastPage: 1,
  });
  UserService.prototype.findById = async (id) =>
    memoryUsers.find((u) => u.id === id) ?? null;
  UserService.prototype.findByEmail = async (email, ignoreId) =>
    memoryUsers.find(
      (u) => u.email === email && (ignoreId === undefined || u.id !== ignoreId),
    ) ?? null;
  UserService.prototype.findByEmailWithSituation = async (email) =>
    memoryUsers.find((u) => u.email === email) ?? null;
  UserService.prototype.findByRecoverKey = async (email, recoverPassword) =>
    memoryUsers.find((u) => u.email === email && u.recoverPassword === recoverPassword) ?? null;
  UserService.prototype.create = async (data) => {
    const created = {
      id: memoryUsers.length + 1,
      recoverPassword: null,
      recoverPasswordExpiresAt: null,
      situation: memorySituations.find((s) => s.id === data.situationId),
      ...data,
    };
    memoryUsers.push(created);
    return created;
  };
  UserService.prototype.save = async (user) => {
    const idx = memoryUsers.findIndex((u) => u.id === user.id);
    if (idx >= 0) memoryUsers[idx] = user;
    return user;
  };
  UserService.prototype.update = async (id, data) => {
    const item = memoryUsers.find((u) => u.id === id);
    if (!item) return false;
    Object.assign(item, data);
    return true;
  };

  ProductCategoryService.prototype.findById = async (id) =>
    memoryCategories.find((c) => c.id === id) ?? null;
  ProductSituationService.prototype.findById = async (id) =>
    memoryProductSituations.find((s) => s.id === id) ?? null;

  ProductService.prototype.findById = async (id) =>
    memoryProducts.find((p) => p.id === id) ?? null;
  ProductService.prototype.findBySlug = async (slug) =>
    memoryProducts.find((p) => p.slug === slug) ?? null;
  ProductService.prototype.create = async (data) => {
    const created = { id: memoryProducts.length + 1, ...data };
    memoryProducts.push(created);
    return created;
  };
  ProductService.prototype.update = async (id, data) => {
    const item = memoryProducts.find((p) => p.id === id);
    if (!item) return false;
    Object.assign(item, data);
    return true;
  };

  MailService.prototype.sendRecoverPasswordEmail = async (to, userName, link) => {
    sentRecoverEmail = { to, userName, link };
  };

  const app = require('../dist/app').default;
  const server = app.listen(0);
  const port = server.address().port;

  async function request(method, path, body, token) {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers.authorization = `Bearer ${token}`;
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return [response.status, await response.json(), response.headers];
  }

  try {
    let [status, body, headers] = await request('GET', '/test-connection');
    assert.equal(status, 200);
    assert.equal(headers.get('access-control-allow-origin'), '*');

    [status] = await request('GET', '/situations');
    assert.equal(status, 401);

    [status] = await request('POST', '/login', { email: 'admin@teste.com', password: 'errada' });
    assert.equal(status, 401);

    [status] = await request('POST', '/login', { email: 'inativo@teste.com', password: 'user12345' });
    assert.equal(status, 403);

    [status, body] = await request('POST', '/login', { email: 'admin@teste.com', password: 'admin1234' });
    assert.equal(status, 200);
    const adminToken = body.token;
    assert.ok(adminToken);

    [status, body] = await request('POST', '/login', { email: 'user@teste.com', password: 'user12345' });
    assert.equal(status, 200);
    const userToken = body.token;
    assert.ok(userToken);

    [status, body] = await request('GET', '/validate-token', undefined, adminToken);
    assert.equal(status, 200);
    assert.equal(body.userId, 1);

    [status] = await request('POST', '/situations', { nameSituation: 'Pendente' }, userToken);
    assert.equal(status, 403);

    [status, body] = await request('POST', '/situations', {}, adminToken);
    assert.equal(status, 400);
    assert.deepEqual(body, { error: ['O campo nome é obrigatório!'] });

    [status, body] = await request('POST', '/situations', { nameSituation: '' }, adminToken);
    assert.equal(status, 400);
    assert.deepEqual(body, {
      error: [
        'O campo nome é obrigatório!',
        'O campo nome deve ter no mínimo 3 caracteres!',
      ],
    });

    [status, body] = await request('POST', '/situations', { nameSituation: 'ab' }, adminToken);
    assert.equal(status, 400);
    assert.deepEqual(body, { error: ['O campo nome deve ter no mínimo 3 caracteres!'] });

    [status, body] = await request('POST', '/situations', { nameSituation: 'Ativo' }, adminToken);
    assert.equal(status, 400);
    assert.deepEqual(body, { error: 'Já existe uma situação cadastrada com esse nome.' });

    [status, body] = await request('POST', '/situations', { nameSituation: '  Pendente  ' }, adminToken);
    assert.equal(status, 201);
    assert.deepEqual(body, { id: 3, nameSituation: 'Pendente' });

    [status] = await request('PUT', '/situations/999', { nameSituation: 'Outro' }, adminToken);
    assert.equal(status, 404);

    [status, body] = await request('PUT', '/situations/3', { nameSituation: 'Ativo' }, adminToken);
    assert.equal(status, 400);
    assert.deepEqual(body, { error: 'Já existe uma situação cadastrada com esse nome.' });

    [status] = await request('PUT', '/situations/3', { nameSituation: 'Pendente' }, adminToken);
    assert.equal(status, 200);

    [status] = await request('PUT', '/situations/3', { nameSituation: 'Bloqueado', extraField: 'ignorado' }, adminToken);
    assert.equal(status, 200);
    assert.deepEqual(memorySituations[2], { id: 3, nameSituation: 'Bloqueado' });

    [status, body] = await request(
      'POST',
      '/users',
      { name: 'Maria Silva', email: 'maria@teste.com', password: 'password123', situationId: 1 },
      adminToken,
    );
    assert.equal(status, 201);
    assert.equal(body.password, undefined);
    assert.equal(body.tipoUsuario, 'USER');

    [status, body] = await request(
      'POST',
      '/users',
      { name: 'Outra Maria', email: 'maria@teste.com', password: 'password123', situationId: 1 },
      adminToken,
    );
    assert.equal(status, 400);

    [status, body] = await request('GET', '/users', undefined, userToken);
    assert.equal(status, 200);
    assert.ok(body.data.every((u) => u.password === undefined && u.recoverPassword === undefined));

    [status] = await request('PUT', '/users-password/1', { password: 'novasenha123' }, userToken);
    assert.equal(status, 403);

    [status] = await request('PUT', '/users-password/2', { password: 'novasenha123' }, userToken);
    assert.equal(status, 200);

    [status] = await request('PUT', '/users-password/2', { password: 'adminset123' }, adminToken);
    assert.equal(status, 200);

    [status] = await request('POST', '/recover-password', {
      email: 'user@teste.com',
      urlRecoverPassword: 'https://frontend.exemplo.com/reset',
    });
    assert.equal(status, 200);
    assert.ok(sentRecoverEmail && sentRecoverEmail.to === 'user@teste.com');
    const recoverUrl = new URL(sentRecoverEmail.link);
    const recoverKey = recoverUrl.searchParams.get('key');
    assert.ok(recoverKey);

    [status] = await request('POST', '/validate-recover-password', {
      email: 'user@teste.com',
      recoverPassword: recoverKey,
    });
    assert.equal(status, 200);

    [status] = await request('POST', '/reset-password', {
      email: 'user@teste.com',
      key: recoverKey,
      password: 'senharesetada1',
    });
    assert.equal(status, 200);

    [status] = await request('POST', '/validate-recover-password', {
      email: 'user@teste.com',
      recoverPassword: recoverKey,
    });
    assert.equal(status, 404);

    [status] = await request('POST', '/login', {
      email: 'user@teste.com',
      password: 'senharesetada1',
    });
    assert.equal(status, 200);

    [status, body] = await request(
      'POST',
      '/products',
      {
        name: 'Notebook Gamer',
        description: 'Notebook com placa dedicada',
        price: 4999.9,
        productCategoryId: 1,
        productSituationId: 1,
      },
      userToken,
    );
    assert.equal(status, 201);
    assert.equal(body.slug, 'notebook-gamer');

    [status, body] = await request(
      'POST',
      '/products',
      {
        name: 'Notebook Gamer',
        description: 'Segunda versão do notebook',
        price: 5499.9,
        productCategoryId: 1,
        productSituationId: 1,
      },
      userToken,
    );
    assert.equal(status, 201);
    assert.equal(body.slug, 'notebook-gamer-2');

    [status] = await request(
      'POST',
      '/products',
      {
        name: 'Produto Negativo',
        description: 'Preço inválido',
        price: -10,
        productCategoryId: 1,
        productSituationId: 1,
      },
      userToken,
    );
    assert.equal(status, 400);

    [status] = await request('PUT', '/products/2', { slug: 'notebook-gamer' }, userToken);
    assert.equal(status, 409);

    [status, body] = await request('PUT', '/products/2', { name: 'Notebook Pro', price: 6000 }, userToken);
    assert.equal(status, 200);
    assert.equal(body.data.slug, 'notebook-pro');

    console.log('PASS: autenticação JWT, permissões ADMIN, recuperação de senha, validação Yup, duplicidade e produtos com slug.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
