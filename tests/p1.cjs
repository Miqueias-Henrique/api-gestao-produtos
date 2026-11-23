require('dotenv').config();
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function main() {
  const dbName = `webii_p1_test_${process.pid}`;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-integration-secret';
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  let db;
  let server;
  let created = false;
  try {
    await admin.query(`CREATE DATABASE \`${dbName}\``);
    created = true;
    process.env.DB_NAME = dbName;
    const { AppDataSource } = require('../dist/data-source');
    db = AppDataSource;
    await db.initialize();
    await db.query('CREATE TABLE situations (id int primary key)');
    await assert.rejects(() => db.runMigrations(), /banco vazio/);
    await db.query('DROP TABLE situations');
    const migrations = await db.runMigrations();
    assert.equal(migrations.length, 3);
    const [tables] = await admin.query(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
      [dbName],
    );
    assert.deepEqual(tables.map((row) => row.TABLE_NAME).sort(), [
      'migrations', 'product_categories', 'product_situations', 'products', 'situations', 'users',
    ]);
    const [columns] = await admin.query(
      'SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND COLUMN_NAME IN (?, ?)',
      [dbName, 'createdAt', 'updatedAt'],
    );
    assert.equal(columns.length, 10);
    assert.ok(columns.every((row) => row.DATA_TYPE === 'timestamp'));

    const { Situation } = require('../dist/entities/Situation');
    const { User } = require('../dist/entities/User');
    const activeSit = await db.getRepository(Situation).save({ nameSituation: 'Ativo' });
    await db.getRepository(User).save({
      name: 'Root Admin',
      email: 'root@teste.com',
      password: await bcrypt.hash('admin1234', 10),
      tipoUsuario: 'ADMIN',
      situationId: activeSit.id,
    });

    const app = require('../dist/app').default;
    server = app.listen(0);
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
      return [
        response.status,
        response.headers.get('content-type')?.includes('application/json')
          ? await response.json()
          : await response.text(),
      ];
    }

    let [status, loginBody] = await request('POST', '/login', {
      email: 'root@teste.com',
      password: 'admin1234',
    });
    assert.equal(status, 200);
    const token = loginBody.token;
    assert.ok(token);

    let invalidSituation;
    [status, invalidSituation] = await request('POST', '/situations', {}, token);
    assert.equal(status, 400);
    assert.deepEqual(invalidSituation, { error: ['O campo nome é obrigatório!'] });
    [status, invalidSituation] = await request('POST', '/situations', { nameSituation: '' }, token);
    assert.equal(status, 400);
    assert.deepEqual(invalidSituation, {
      error: [
        'O campo nome é obrigatório!',
        'O campo nome deve ter no mínimo 3 caracteres!',
      ],
    });
    [status, invalidSituation] = await request('POST', '/situations', { nameSituation: 'ab' }, token);
    assert.equal(status, 400);
    assert.deepEqual(invalidSituation, { error: ['O campo nome deve ter no mínimo 3 caracteres!'] });

    let situation;
    [status, situation] = await request('POST', '/situations', { nameSituation: 'Teste' }, token);
    assert.equal(status, 201);
    const situationId = situation.id;
    [status, invalidSituation] = await request('POST', '/situations', { nameSituation: 'Teste' }, token);
    assert.equal(status, 400);
    assert.deepEqual(invalidSituation, { error: 'Já existe uma situação cadastrada com esse nome.' });

    let secondSituation;
    [status, secondSituation] = await request('POST', '/situations', { nameSituation: 'Segundo' }, token);
    assert.equal(status, 201);
    [status, invalidSituation] = await request('PUT', `/situations/${situationId}`, { nameSituation: 'Segundo' }, token);
    assert.equal(status, 400);
    [status] = await request('PUT', `/situations/${situationId}`, { nameSituation: 'Teste' }, token);
    assert.equal(status, 200);

    let firstPage, secondPage;
    [status, firstPage] = await request('GET', '/situations?page=1&limit=1', undefined, token);
    assert.equal(status, 200);
    assert.equal(firstPage.lastPage, 3);
    assert.equal(firstPage.data[0].id, secondSituation.id);
    [status, secondPage] = await request('GET', '/situations?page=2&limit=1', undefined, token);
    assert.equal(status, 200);
    assert.equal(secondPage.data[0].id, situationId);
    [status] = await request('GET', '/situations?page=4&limit=1', undefined, token);
    assert.equal(status, 400);

    let category, productSituation, user, product;
    [status, category] = await request('POST', '/product-categories', { name: 'Categoria Teste' }, token);
    assert.equal(status, 201);
    [status, productSituation] = await request('POST', '/product-situations', { name: 'Disponível' }, token);
    assert.equal(status, 201);
    [status, user] = await request(
      'POST',
      '/users',
      { name: 'Maria', email: 'maria@example.com', password: 'password123', situationId },
      token,
    );
    assert.equal(status, 201);
    assert.equal(user.password, undefined);
    [status] = await request(
      'POST',
      '/users',
      { name: 'Outra', email: 'maria@example.com', password: 'password123', situationId },
      token,
    );
    assert.equal(status, 400);

    [status, product] = await request(
      'POST',
      '/products',
      {
        name: 'Produto Teste',
        description: 'Descrição do produto teste',
        price: 99.9,
        productCategoryId: category.id,
        productSituationId: productSituation.id,
      },
      token,
    );
    assert.equal(status, 201);
    assert.equal(product.slug, 'produto-teste');

    [status] = await request(
      'POST',
      '/products',
      {
        name: 'Inválido',
        description: 'Sem categoria',
        price: 10,
        productCategoryId: 999999,
        productSituationId: productSituation.id,
      },
      token,
    );
    assert.equal(status, 404);

    for (const [path, id] of [
      ['situations', situationId],
      ['product-categories', category.id],
      ['product-situations', productSituation.id],
      ['users', user.id],
      ['products', product.id],
    ]) {
      [status] = await request('GET', `/${path}/${id}`, undefined, token);
      assert.equal(status, 200, path);
      let list;
      [status, list] = await request('GET', `/${path}?page=1&limit=10`, undefined, token);
      assert.equal(status, 200, path);
      assert.ok(list.total >= 1, path);
    }

    [status] = await request(
      'PUT',
      `/users/${user.id}`,
      { name: 'Maria Atualizada', email: 'maria@example.com', situationId },
      token,
    );
    assert.equal(status, 200);
    [status] = await request('PUT', `/users-password/${user.id}`, { password: 'novasenha123' }, token);
    assert.equal(status, 200);

    [status] = await request('PUT', `/products/${product.id}`, { name: 'Produto Atualizado' }, token);
    assert.equal(status, 200);

    for (const [path, id, body] of [
      ['situations', situationId, { nameSituation: 'Teste Atualizado' }],
      ['product-categories', category.id, { name: 'Categoria Atualizada' }],
      ['product-situations', productSituation.id, { name: 'Disponível Atualizado' }],
    ]) {
      [status] = await request('PUT', `/${path}/${id}`, body, token);
      assert.equal(status, 200, path);
    }

    for (const [path, id] of [
      ['products', product.id],
      ['users', user.id],
      ['product-categories', category.id],
      ['product-situations', productSituation.id],
      ['situations', situationId],
    ]) {
      [status] = await request('DELETE', `/${path}/${id}`, undefined, token);
      assert.equal(status, 200, path);
      [status] = await request('GET', `/${path}/${id}`, undefined, token);
      assert.equal(status, 404, path);
    }

    [status] = await request('GET', '/users/1abc', undefined, token);
    assert.equal(status, 400);
    [status] = await request('GET', '/products?page=0', undefined, token);
    assert.equal(status, 400);
    [status] = await request('POST', '/products', {}, token);
    assert.equal(status, 400);
    [status] = await request('GET', '/api-docs/');
    assert.equal(status, 200);

    const seed = spawnSync(process.execPath, ['dist/seeds.js'], {
      cwd: process.cwd(),
      env: process.env,
      encoding: 'utf8',
    });
    assert.equal(seed.status, 0, `${seed.stdout}\n${seed.stderr}`);
    const active = await db.query("SELECT id FROM situations WHERE nameSituation = 'Ativo'");
    const adminUser = await db.query("SELECT situationId, tipoUsuario FROM users WHERE email = 'admin@sistema.com'");
    assert.equal(adminUser[0].situationId, active[0].id);
    assert.equal(adminUser[0].tipoUsuario, 'ADMIN');

    for (let i = 0; i < migrations.length; i++) {
      await db.undoLastMigration();
    }
    const [remaining] = await admin.query(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME NOT IN (?)',
      [dbName, 'migrations'],
    );
    assert.equal(remaining.length, 0);
    console.log('PASS: migrations up/down, schema, seeds, auth JWT, CRUD completo, paginação e validação HTTP.');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db?.isInitialized) await db.destroy();
    if (created) await admin.query(`DROP DATABASE \`${dbName}\``);
    await admin.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
