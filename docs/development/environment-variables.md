# Governança de Variáveis de Ambiente — F1Atlas

> **Projeto:** F1Atlas — Plataforma Interativa de Automobilismo  
> **Status:** Normativo  
> **Responsáveis:** Security Auditor, DevOps / Backend Engineer  
> **Verificador:** `scripts/security/validate-env.mjs` (`npm run verify:security`)  

---

## 1. Princípios e Modelo de Camadas

O gerenciamento de configurações no F1Atlas obedece à separação estrita entre arquivos de modelo públicos e configurações privadas locais:

| Arquivo | Localização | Controle de Versão | Finalidade |
| :--- | :--- | :---: | :--- |
| `.env.example` | Raiz do repositório | **Versionado** | Modelo público contendo a declaração de todas as variáveis suportadas, tipos esperados e comentários explicativos. **Proibido conter segredos reais.** |
| `.env` | Raiz do repositório | **Ignorado (.gitignore)** | Configurações locais de desenvolvimento na máquina do desenvolvedor. |
| `.env.local` | Raiz / apps | **Ignorado (.gitignore)** | Sobrescritas locais privadas específicas da máquina. |
| `.env.test` | Raiz | **Ignorado (.gitignore)** | Configurações dedicadas à execução de suites de teste locais. |

---

## 2. Convenções de Nomenclatura e Separação Pública/Privada

### 2.1. Padrão de Nomes
- Todas as variáveis devem ser nomeadas em `UPPER_SNAKE_CASE` (ex.: `NODE_ENV`, `PORT`, `NEXT_PUBLIC_ANALYTICS_ENABLED`).
- Não utilizar espaços antes ou depois do sinal de igual (`=`).

### 2.2. Variáveis Públicas do Frontend (`NEXT_PUBLIC_`)
- No ecossistema Next.js, qualquer variável com o prefixo `NEXT_PUBLIC_` é embutida estaticamente no pacote JavaScript enviado ao navegador do usuário.
- **REGRA DE OURO:** É expressamente proibido prefixar variáveis contendo credenciais, tokens, senhas, chaves privadas ou URLs de banco de dados com `NEXT_PUBLIC_`.
- O verificador estático `validate-env.mjs` bloqueia qualquer variável `NEXT_PUBLIC_` contendo termos sensíveis (`SECRET`, `PASSWORD`, `TOKEN`, `CREDENTIAL`, `PRIVATE`, `AUTH_KEY`).

### 2.3. Variáveis Privadas do Backend
- Variáveis sem o prefixo `NEXT_PUBLIC_` são de acesso exclusivo do runtime Node.js no backend (`apps/api` ou rotas SSR seguras), nunca expostas ao cliente web.

---

## 3. Preparação do Google Analytics 4 (GA4)

Para a telemetria do MVP, o `.env.example` prevê exclusivamente duas configurações:

```dotenv
# Google Analytics 4
# Identificador público do fluxo de dados web (formato: G-XXXXXXXXXX)
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_ANALYTICS_ENABLED=false
```

- **Natureza do Measurement ID:** O `NEXT_PUBLIC_GA_MEASUREMENT_ID` é um identificador de stream público, não uma credencial secreta.
- **Validação Condicional:**
  - Se `NEXT_PUBLIC_ANALYTICS_ENABLED=true`, a variável `NEXT_PUBLIC_GA_MEASUREMENT_ID` torna-se obrigatória e deve respeitar o formato `^G-[A-Z0-9]{4,15}$`.
  - Se `NEXT_PUBLIC_ANALYTICS_ENABLED=false` ou omitida, o ID pode permanecer vazio sem interromper o harness ou os quality gates.
- **Protocolo de Medição:** Não utilizar nem solicitar segredos de API (`api_secret`) nesta fase do projeto.

---

## 4. Injeção de Segredos em Produção

- Em ambientes de produção (Vercel, container ou cloud), credenciais reais **nunca** devem ser gravadas em arquivos em disco no repositório.
- A injeção deve ser realizada exclusivamente via painel de variáveis de ambiente da plataforma de hospedagem ou Secrets Manager seguro.
- O pipeline de CI deve executar em modo clone limpo, validando apenas a presença e integridade do `.env.example` sem exigir preenchimento de credenciais privadas.

---

## 5. Validação Automatizada e Quality Gates

A governança é assegurada determinísticamente por:
1. `npm run verify:security` — Executa `scripts/security/validate-env.mjs` juntamente com scanners de segredos e publicação.
2. `scripts/tests/environment.test.mjs` — Suite de 9 testes automatizados cobrindo sintaxe, duplicação, GA4 condicional e tentativa de exposição de segredos.
3. Código de saída Unix: `0` para conformidade, `1` para violação e `2` para falha estrutural.
