# AGENTS.md — Guia Compartilhado (Antigravity & Claude)

Este repositório usa um protocolo compartilhado para que **Antigravity** e **Claude** trabalhem juntos de forma direta, previsível e sem retrabalho.

## Visão Geral do Projeto
- **Repositório:** `Miqueias-Henrique/api-gestao-produtos`
- **Stack:** Node.js 22+, TypeScript, Express 4, TypeORM 1.x, MySQL (`mysql2`), Yup, JWT (`jsonwebtoken`), `bcryptjs`, `nodemailer`, Swagger (`swagger-ui-express`).
- **Arquitetura:**
  - `src/entities/` — Modelos e relações TypeORM (`User`, `Situation`, `Product`, `ProductCategory`, `ProductSituation`)
  - `src/migrations/` — Migrations versionadas (`synchronize` deve permanecer desativado)
  - `src/services/` — Regras de acesso ao banco, paginação (`PaginationService`) e e-mail (`MailService`)
  - `src/controllers/` — Tratamento HTTP, validação Yup (`abortEarly: false`) e respostas de erro (`sendError`)
  - `src/middlewares/` — `authMiddleware.ts` (JWT) e `adminMiddleware.ts` (perfil `ADMIN`)
  - `src/routes/` — Rotas públicas, protegidas e validações
  - `tests/` — Testes unitários/HTTP (`pagination.cjs`) e integração E2E (`p1.cjs`)

## Comandos Principais
- `npm run build` — Compila TypeScript (`tsc`) para `dist/`
- `npm run test:unit` — Roda build + testes unitários/rotas HTTP sem depender de MySQL
- `npm test` — Roda build + testes completos (requer MySQL ativo conforme `.env`)
- `npm run start:watch` — Servidor de desenvolvimento com `tsx watch src/server.ts`

## Protocolo de Interação Antigravity ↔ Claude
1. **Leia antes de agir:** Sempre confira `docs/HANDOFF.md` e os PRs/Issues abertos (`gh pr list`, `gh issue list`) antes de iniciar uma tarefa.
2. **Trabalhe em branches/PRs:** Evite commits diretos na `main` para mudanças de código em colaboração. Crie uma branch descritiva (ex.: `feat/...`, `fix/...`, `review/...`) e abra um PR para o outro agente revisar.
3. **Use `docs/HANDOFF.md` como quadro de passagem de bastão:** Ao finalizar uma entrega ou pedir revisão/continuidade, atualize `docs/HANDOFF.md` com:
   - Quem atuou por último (`Antigravity` ou `Claude`)
   - Branch/PR atual e commits relevantes
   - O que foi feito e validado (`build`, `test:unit`, `test`)
   - O que o próximo agente deve fazer exatamente
4. **Comunicação em PRs/Issues:** Use comentários em PRs (`gh pr comment`) para code review objetivo apontando arquivo, linha e motivo.
5. **Regras de segurança:** Nunca commite `.env`, chaves de API (`ANTHROPIC_API_KEY`, `JWT_SECRET`) ou dados sensíveis.
