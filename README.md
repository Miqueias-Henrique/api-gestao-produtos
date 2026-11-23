# WEB II — API P1

API REST em Node.js, Express, TypeScript, TypeORM e MySQL baseada no diagrama da disciplina. As cinco entidades (`User`, `Situation`, `Product`, `ProductCategory` e `ProductSituation`) são os modelos persistentes da aplicação. A tabela `migrations` é administrada pelo TypeORM.

## Preparação

Requer Node.js 22+ e um servidor MySQL acessível. Se usar Docker, inicie o contêiner MySQL e confira a porta publicada. Crie **um banco vazio** antes da primeira migration; não execute a migration inicial sobre um banco que já contenha as tabelas da API.

1. Copie `.env.example` para `.env` e preencha `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`, `JWT_SECRET` e as credenciais SMTP (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`). Não publique o `.env`.
2. Instale as dependências com `npm ci`.
3. Execute `npm run migration:run` para compilar e criar as tabelas. `npm run migration:show` lista o estado das migrations.
4. Opcionalmente execute `npm run seed:run` para inserir dados de demonstração (incluindo um usuário administrador `admin@sistema.com` e um usuário comum `usuario@sistema.com`, ambos com senha inicial `12345678`).
5. Inicie com `npm run start:watch` para desenvolvimento, ou `npm run build` seguido de `npm start`.

`npm run test:unit` executa os testes unitários e de rotas HTTP sem MySQL. Com o MySQL ligado, `npm test` também cria um banco temporário, verifica migrations, seeds e o fluxo completo de autenticação e CRUD e o remove ao terminar. O usuário configurado em `.env` precisa poder criar e remover bancos de teste.

As migrations só criam ou alteram a estrutura. `synchronize` fica desativado para evitar alterações automáticas no banco. O comando `migration:revert` desfaz a última migration **e pode apagar tabelas e dados**; use somente em um banco de teste.

## Rotas

### Públicas
- `GET /` e `GET /test-connection`: verificação da API.
- `POST /login`: autentica com `email` e `password` (exige usuário com situação `Ativo`) e retorna um token JWT (`Bearer`).
- `POST /recover-password`: gera chave de recuperação com validade de 30 minutos e envia o link por e-mail via `nodemailer`.
- `POST /validate-recover-password`: valida a chave de recuperação informada.
- `POST /reset-password`: redefine a senha com `email`, `key` e `password` (mínimo 8 caracteres) e invalida a chave após o uso.

### Protegidas (JWT)
Todas as demais rotas exigem o cabeçalho `Authorization: Bearer <token>`:
- `GET /validate-token`: valida o token atual e retorna o `userId`.
- `PUT /users-password/:id`: atualiza a senha do próprio usuário ou, se autenticado como `ADMIN`, de qualquer usuário.
- Recursos CRUD: `/users`, `/situations`, `/products`, `/product-categories` e `/product-situations` (`POST`, `GET`, `GET /:id`, `PUT /:id` e `DELETE /:id`).
- Operações de escrita (`POST`, `PUT`, `DELETE`) em `/users`, `/situations`, `/product-categories` e `/product-situations` exigem perfil `ADMIN`.

A listagem aceita `page` e `limit` (`GET /products?page=1&limit=10`), com limite máximo de 100 registros por página. O resultado contém `data`, `total`, `page`, `limit` e `lastPage`, ordenado por ID decrescente. Uma lista vazia retorna `data: []` e `lastPage: 0`; uma página acima da última retorna HTTP 400. A documentação interativa fica em `http://localhost:3000/api-docs` quando `PORT=3000`.

Exemplo de criação de usuário (autenticado como `ADMIN`):

```json
POST /users
{"name":"Maria","email":"maria@example.com","password":"********","situationId":1}
```

Para criar um produto, cadastre antes uma categoria e uma situação de produto e envie `name`, `description`, `price`, `productCategoryId` e `productSituationId`. O `slug` único é gerado automaticamente a partir do nome. IDs devem ser inteiros positivos.

## Dependências principais

```bash
npm i yup cors bcryptjs jsonwebtoken nodemailer
```

- **Validação**: `yup` com `abortEarly: false` e verificação prévia de duplicidade no banco (incluindo `Not(id)` na edição).
- **Segurança**: senhas criptografadas com `bcryptjs`, autenticação com `jsonwebtoken`, remoção de campos sensíveis (`password`, `recoverPassword`, `recoverPasswordExpiresAt`) nas respostas de usuários e suporte a requisições externas com `cors`.

## Organização

- `src/entities`: modelos e relações TypeORM.
- `src/migrations`: criação e evolução versionada das tabelas e chaves estrangeiras.
- `src/middlewares`: autenticação JWT (`authMiddleware.ts`) e verificação de administrador (`adminMiddleware.ts`).
- `src/controllers`: respostas HTTP e validação de entrada.
- `src/services`: acesso aos repositórios, paginação compartilhada e envio de e-mail.
- `src/routes`: rotas públicas, protegidas e middlewares.
- `src/seeds.ts`: dados iniciais de demonstração.
- `src/app.ts` e `src/server.ts`: configuração Express e inicialização do servidor.
