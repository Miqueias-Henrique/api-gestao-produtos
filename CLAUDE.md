# CLAUDE.md

Leia primeiro [AGENTS.md](./AGENTS.md) e [docs/HANDOFF.md](./docs/HANDOFF.md) antes de propor ou editar código neste repositório.

## Resumo Rápido para o Claude
- **Linguagem do projeto:** Código e commits seguem padrão claro; mensagens/documentação em **pt-BR**.
- **Validação obrigatória após mudanças:**
  ```bash
  npm run build && npm run test:unit
  ```
  *(Se MySQL estiver configurado e rodando, execute também `npm test`.)*
- **Restrições importantes:**
  - Não habilite `synchronize: true` no TypeORM (`src/data-source.ts`).
  - Mantenha campos sensíveis de `User` (`password`, `recoverPassword`, `recoverPasswordExpiresAt`) filtrados nas respostas.
  - Ao terminar sua parte ou revisar uma branch do Antigravity, atualize `docs/HANDOFF.md` (ou comente no PR aberto) explicando o que mudou e qual é o próximo passo.
