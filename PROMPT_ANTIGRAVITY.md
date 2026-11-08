# Prompt Mestre para o Google Antigravity — Web App Guia de Visitas Imobiliárias

> **Como usar:** Copie todo o bloco abaixo e cole diretamente no chat do **Google Antigravity** com a pasta deste repositório (`guia-de-visitas-`) aberta. Todos os arquivos de referência (`DESIGN.md` e `ARCHITECTURE_AND_QA_SPEC.md`) já estão na raiz do repositório para leitura imediata pelo agente.

---

## COPIE E COLE NO ANTIGRAVITY A PARTIR DAQUI:

```markdown
Atue simultaneamente sob as diretrizes estritas de um **Principal Backend & Distributed State Engineer (PhD Level)** e de um **Principal QA & Site Reliability Engineer Internacional (ISO/IEC 25010:2023, ISO/IEC/IEEE 29119, WebKit/iOS Jetsam Internals, Nielsen Norman Group & Steven Hoober)**.

Sua missão é construir, testar e deixar 100% pronto para uso imediato em produção (GitHub Pages no repositório `guia-de-visitas-`) o Web App completo **Guia de Visitas Imobiliárias**.

Antes de escrever qualquer linha de código, leia obrigatoriamente os dois arquivos na raiz deste repositório:
1. `./DESIGN.md` — Sistema de design oficial inspirado no Airtable ("warm workshop with color-coded chapters").
2. `./ARCHITECTURE_AND_QA_SPEC.md` — Especificação arquitetural (DDD, Arquitetura Hexagonal, sincronização para 1 ou 2 visitantes, Fencing Tokens, Idempotência) e matriz de testes de QA (Zero Data Loss, prevenção de crash WebKit/Jetsam no iOS e ergonomia mobile).

---

### 1. REQUISITOS FUNCIONAIS INEGOCIÁVEIS (ESCOPO EXATO)

Você deve entregar uma aplicação web completa, responsiva (Mobile-First para uso em campo durante visitas e Desktop-Ready para montagem do roteiro) e pronta para hospedagem no **GitHub Pages** (`base: './'` no Vite + `HashRouter` + GitHub Actions workflow `.github/workflows/deploy.yml`).

#### A. Primeira Página: Roteiro Completo do Dia & Interface do Corretor
1. **Exibição do Roteiro do Dia:** Na primeira página, exiba o roteiro completo do dia na exata ordem enviada/cadastrada, com visual editorial impecável seguindo o `DESIGN.md`.
2. **Interface de Cadastro e Ordenação dos Imóveis pelo Corretor:**
   - Permitir criar/editar o Guia de Visitas (Título do roteiro, Data da visita, Nome do Corretor).
   - Adicionar múltiplos imóveis em ordem sequencial (`Imóvel 01`, `Imóvel 02`, `Imóvel 03`...), permitindo reordenar (subir/descer na ordem da visita), editar ou remover qualquer imóvel antes de finalizar.
   - Para cada imóvel, o corretor preenche:
     - **Foto da Fachada:** Upload de arquivo de imagem (com compressão automática client-side via `<canvas>` para WebP/JPEG max 1200px e liberação imediata de memória `canvas.width = 0; canvas.height = 0`) OU colagem de URL da foto da fachada, com preview instantâneo.
     - **Nome do Condomínio:** Texto obrigatório (ex: *Condomínio Aldeia do Vale*).
     - **Preço do Imóvel:** Valor formatado em moeda brasileira (`R$`).
     - **Descrição Completa da Casa / Imóvel:** Texto detalhado com todas as características do imóvel.
3. **Configuração de 1 ou 2 Visitantes ao Finalizar o Cadastro:**
   - Ao finalizar o cadastro do guia, o corretor escolhe quantas pessoas farão as visitas:
     - **Opção 1: 1 Pessoa (Visita Individual)** — Campo para o nome do Cliente.
     - **Opção 2: 2 Pessoas (Duas Páginas Individuais com Cruzamento Final)** — Campos para o nome do **Cliente 1** e do **Cliente 2** (ex: casal, sócios ou familiares visitando juntos).
4. **Entregas Geradas Após Finalizar o Cadastro dos Imóveis:**
   - **Entrega 1 — Resumo do Guia de Visitas em PDF (Estritamente como especificado):**
     - Botão **"Gerar e Baixar PDF do Guia de Visitas"**.
     - **Página 1 do PDF (Prólogo / Resumo do Roteiro):** Um prólogo elegante resumindo a **ordem das visitas**, contendo em formato de lista numerada: Ordem da visita (`#01`, `#02`...), **Nome do Condomínio** e **Preço do Imóvel**.
     - **Páginas Seguintes do PDF (1 Página para Cada Imóvel):** Exatamente uma página inteira dedicada para cada imóvel na ordem do roteiro, contendo a **Foto da Fachada** em destaque, o **Nome do Condomínio**, o **Preço** e a **Descrição Completa** da casa. **Apenas isso** (sem campos de avaliação ou poluição visual no PDF pré-visita).
   - **Entrega 2 — Página(s) Web de Visita para Enviar ao(s) Cliente(s):**
     - Se for **1 pessoa**: gera 1 Link/Página Web exclusivo de visita para o cliente (com botão de Copiar Link, Enviar por WhatsApp e QR Code, além de botão para abrir/testar diretamente).
     - Se forem **2 pessoas**: gera **2 Links/Páginas Web de visita individuais e independentes** (Página exclusiva do **Cliente 1** e Página exclusiva do **Cliente 2**), além do painel/link de consolidação do **Relatório Cruzado**.
     - *Requisito de Persistência para GitHub Pages:* O link enviado ao cliente deve carregar todos os dados do roteiro de forma autossuficiente (via payload comprimido com `lz-string` na URL hash/query + persistência em `IndexedDB`/`localStorage` local + suporte a exportação/importação de código compacto de sincronização), garantindo que funcione imediatamente em qualquer celular mesmo sem servidor backend externo!

---

#### B. Página Web do Cliente Durante a Visita (Fluxo Sequencial Guiado)
1. **Tela de Abertura do Cliente:**
   - Quando o cliente abrir sua página individual no celular, ele vê a capa do seu Guia de Visitas (com saudação pelo nome dele, resumo da ordem do dia) e o botão principal de destaque: **"Começar Visitas"**.
2. **Página de Cada Imóvel em Ordem (Imóvel 1 -> Imóvel 2 -> ... -> Imóvel N):**
   - Ao apertar **"Começar Visitas"**, o sistema leva o cliente para a página do **Imóvel 1** (seguindo rigorosamente a ordem do PDF enviado).
   - Na página do imóvel atual, exiba:
     - Indicador de progresso claro (`Imóvel 01 de N`).
     - **Foto da Fachada** em alta nitidez.
     - **Nome do Condomínio** e **Preço do Imóvel**.
     - **Descrição Completa** da casa.
     - **Caixa de Texto de Observações:** Área de texto onde o cliente anota suas observações e impressões durante a visita (com salvamento automático instantâneo no armazenamento local a cada tecla digitada — *Zero Data Loss*).
     - **Opções de Decisão no Final da Página:** Três caixas/cards interativos e táteis:
       1. **Gostei** (identidade visual Forest Ink `#0a2e0e` / Moss `#214224`)
       2. **Descartado** (identidade visual Terracotta `#aa2d00` / Burnt Sienna `#912e1f`)
       3. **Em Dúvida** (identidade visual Marigold `#fcb42a` / Peach Glow `#fcab79`)
3. **Regra Estrita de Bloqueio de Navegação (Trava de Visita):**
   - O cliente **SÓ sai da página do imóvel que está visitando** se escolher uma das três caixas (**Gostei**, **Descartado** ou **Em Dúvida**) e clicar no botão **"Salvar Anotações e Ir para o Próximo Imóvel"** (ou **"Salvar e Finalizar Visitas"** no último imóvel).
   - Enquanto nenhuma das 3 caixas estiver marcada, o botão de avançar deve permanecer bloqueado/desabilitado com aviso claro.
4. **Menu Hambúrguer de Consulta Rápida (Sem Sair da Visita Atual):**
   - Durante toda a visita, deve haver um botão **Hambúrguer** fixo no cabeçalho da página.
   - Ao clicar no Hambúrguer, abre-se um painel deslizante (*Drawer / Modal Sheet* sobreposto) onde o cliente pode **acessar as informações gerais de todos os imóveis do roteiro** (Ordem, Foto da Fachada, Nome do Condomínio, Preço, Descrição Completa e até as notas/decisões que ele já registrou nos imóveis anteriores) para comparar ou lembrar de algo de um imóvel anterior.
   - **Regra Inegociável:** Consultar o Menu Hambúrguer **JAMAIS tira o cliente da página da visita atual** e jamais apaga ou reseta o texto que ele está digitando na caixa de observações do imóvel atual.

---

#### C. Finalização das Visitas e Geração de Relatórios (Individual e Cruzado)
1. **Página de Conclusão ("Gerar Relatórios"):**
   - Quando todas as visitas forem finalizadas, o cliente é levado à página de encerramento com o botão **"Gerar Relatórios"**.
2. **Relatório Individual (1 Pessoa ou Visão Individual):**
   - Exibe na tela e permite exportar em **PDF** um resumo completo de todas as visitas na ordem realizada, mostrando para cada imóvel: Foto da Fachada, Condomínio, Preço, a escolha final do cliente (**Gostei**, **Descartado** ou **Em Dúvida**) e todas as **observações anotadas**.
3. **Relatório Cruzado para 2 Pessoas (Cruzamento de Opiniões e Observações):**
   - Quando o guia tiver sido configurado para **2 pessoas** (Cliente 1 e Cliente 2):
     - Cada cliente realiza sua visita em sua própria página individual.
     - Sincronização Híbrida Zero-Falha:
       1. Se ambos estiverem no mesmo navegador/sessão sincronizada ou via canal de sincronização (`BroadcastChannel` + `localStorage` compartilhado + exportação/importação de **Código/Link Rápido de Pareamento via WhatsApp ou QR Code**), o sistema cruza automaticamente os dados dos dois visitantes.
       2. Ao final da visita de cada um dos 2 clientes, ofereça também um botão de 1 clique **"Compartilhar / Cruzar Minhas Respostas com [Nome do Outro Visitante / Corretor]"** que gera um link/código compacto com as escolhas e notas daquele visitante para fusão imediata em qualquer dispositivo (garantindo funcionamento 100% offline/online em condomínios sem sinal!).
     - O **Relatório Cruzado (Match Matrix)** deve exibir:
       - Resumo executivo de compatibilidade (quantos imóveis ambos gostaram, quantos tiveram divergência, quantos ficaram em dúvida e quantos foram descartados).
       - Para cada imóvel na ordem visitada:
         - Dados do imóvel (Ordem, Fachada, Condomínio, Preço).
         - Selo de Cruzamento automático:
           - **Match Perfeito!** (Ambos escolheram *Gostei*)
           - **Ponto de Debate / Divergência** (Opiniões opostas, ex: um *Gostei* e outro *Descartado* ou *Em Dúvida*)
           - **Dúvida em Conjunto** (Ambos *Em Dúvida*)
           - **Descartado por Ambos** (Ambos *Descartado*)
         - Quadro comparativo lado a lado:
           - **Coluna Cliente 1:** Escolha (`Gostei` / `Descartado` / `Em Dúvida`) + Observações completas anotadas pelo Cliente 1.
           - **Coluna Cliente 2:** Escolha (`Gostei` / `Descartado` / `Em Dúvida`) + Observações completas anotadas pelo Cliente 2.
       - Botão para **Baixar Relatório Cruzado em PDF** com layout editorial impecável.

---

### 2. DIRETRIZES DE DESIGN SYSTEM (`./DESIGN.md` — AIRTABLE STYLE REFERENCE)

Siga rigorosamente todos os tokens de `./DESIGN.md`:
- **Canvas Principal:** Sempre ` Parchment Cream (#faf5e8)` — NUNCA use `#ffffff` puro como fundo geral da página. Use `#ffffff` apenas para a superfície interna dos cards (`border-radius: 16px`, `padding: 24px`) e barra de navegação superior.
- **Tipografia:** Carregue do Google Fonts no `index.html` as fontes `'Roboto Slab'` (peso 900, substituindo `Haas Groot Disp` para headlines de 32px a 48px com `letter-spacing: 0px`) e `'Inter'` (pesos 400, 500, 600, substituindo `Haas` para corpo, botões e UI).
- **Botões (CTAs):**
  - Primário: Fundo **Onyx (`#181d26`)**, texto `#ffffff`, peso 600, `16px`, `border-radius: 12px`, `padding: 16px 24px`, sombra `--shadow-subtle`.
  - Secundário (Ghost): Fundo `#ffffff`, borda `1px solid #181d26`, texto `#181d26`, `border-radius: 12px`, `padding: 16px 24px`.
- **Feature Cards Coloridos por Capítulo (`border-radius: 24px`):**
  - Use os blocos saturados do `DESIGN.md` (`#aa2d00` Terracotta, `#254fad` Sapphire, `#0a2e0e` Forest Ink, `#fcab79` Peach Glow, `#c7e5f2` Pale Sky, `#fcb42a` Marigold) com painéis brancos internos para estruturar visualmente os capítulos do roteiro, as caixas de decisão e o relatório comparativo.

---

### 3. ARQUITETURA, QUALIDADE E EXECUÇÃO SEM ERROS (`./ARCHITECTURE_AND_QA_SPEC.md`)

1. **Stack Técnica Recomendada (Zero-Bug & GitHub Pages Ready):**
   - React 18 + TypeScript (strict mode) + Vite + Tailwind CSS (ou CSS Variables nativas mapeando 100% do `DESIGN.md`) + `lucide-react` para ícones + `jspdf` para geração determinística dos PDFs + `lz-string` para serialização compacta de estado em links compartilháveis.
   - Roteamento baseado em hash (`HashRouter` ou gerenciador de estado sincronizado com `window.location.hash`) e `base: './'` no `vite.config.ts` para que nunca ocorra erro 404 ao recarregar páginas no GitHub Pages (`/guia-de-visitas-/`).
2. **Prevenção de Falhas Mobile (WebKit / iOS Jetsam & Zero Data Loss):**
   - Comprima todas as imagens enviadas para no máximo 1200px (JPEG/WebP 0.78) e zere o `<canvas>` temporário (`canvas.width = 0; canvas.height = 0`) imediatamente após gerar o DataURL.
   - Implemente `ErrorBoundary` global com opção de recuperação segura.
   - Garanta um roteiro de demonstração pré-carregado opcional (botão *"Carregar Roteiro de Exemplo"* na tela do corretor) para teste imediato de todas as funcionalidades com 1 clique.
3. **Verificação Obrigatória Antes de Concluir:**
   - Instale as dependências (`npm install`).
   - Execute a checagem de tipos (`npx tsc --noEmit`) e o build de produção (`npm run build`), corrigindo 100% de eventuais avisos ou erros.
   - Inicie o servidor local e valide visualmente todos os fluxos descritos nos casos de teste `TC-01` a `TC-07` do arquivo `ARCHITECTURE_AND_QA_SPEC.md`.
```
