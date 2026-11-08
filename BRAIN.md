# 🧠 Cérebro do Projeto (Project Brain Map) — Guia de Visitas Imobiliárias

## 1. Nódulo Central (Core Architecture)
- **Stack:** React 18, TypeScript (Strict Mode), Vite, Tailwind CSS com tokens de `DESIGN.md`, `lucide-react`, `jspdf`, `lz-string`, `idb`, `qrcode`.
- **Topologia de Hospedagem:** Static SPA no GitHub Pages com `base: './'` e roteamento estritamente via `HashRouter` (`#/`), eliminando erros 404 em subcaminhos.
- **Princípios Fundamentais:**
  - *Hexagonal / DDD:* Desacoplamento entre domínio puro, adaptadores de infraestrutura e camada de apresentação.
  - *Zero Data Loss & Offline First:* Auto-save atômico a cada tecla digitada em `IndexedDB` e `localStorage`.
  - *WebKit / iOS Jetsam Safety:* Teto de memória gráfica de `<canvas>` estritamente < 30 MB, com zeramento de dimensões (`width = 0, height = 0`) e revogação imediata de `URL.revokeObjectURL()`.
  - *Puzzle Method:* Construção faturada em peças atômicas testadas antes do próximo encaixe.

---

## 2. A Teia de Ramificações (Knowledge Graph / Modularity)
- 🕸️ **Domain / Core Logic (`src/domain/`)**:
  - `models/tour.ts`: Entidades `VisitTour`, `PropertyStop` (ordem 1..N, condomínio, preço em centavos, foto, descrição).
  - `models/session.ts`: Agregado `VisitorSession`, `PropertyEvaluation` (decisões LIKED, DISCARDED, DOUBT, fencing tokens, idempotência).
  - `models/comparison.ts`: Entidades de relatório cruzado e `MatchStatus`.
  - `services/comparisonEngine.ts`: Matriz determinística de cruzamento de compatibilidade de 2 visitantes.
  - `services/validation.ts`: Validações de máquina de estados (avanço obrigatório com decisão).
  - `value-objects/money.ts`: Conversão e máscara BRL centavos <-> R$ formatado.

- 🕸️ **Entrypoints & Routing (`src/`)**:
  - `main.tsx`: Ponto de entrada React 18 com ErrorBoundary global.
  - `App.tsx`: Roteador HashRouter gerenciando rotas:
    - `#/`: Dashboard do Corretor (Criação/Edição de Roteiro).
    - `#/visit/:tourId/:slot`: Interface guiada do cliente visitante.
    - `#/report/:tourId`: Relatório individual ou comparativo cruzado.

- 🕸️ **Infrastructure & Storage (`src/infrastructure/`)**:
  - `storage/indexedDb.ts`: Adaptador assíncrono para persistência de roteiros, sessões e rascunhos com fallback em `localStorage`.
  - `codecs/urlCodec.ts`: Serialização e compressão bidirecional de estado com `lz-string` para links e QR Codes.
  - `media/imageCompression.ts`: Pipeline de compressão client-side em canvas (<1200px, 0.78 JPEG/WebP) com liberação imediata de buffer.
  - `pdf/guidePdfGenerator.ts`: Gerador do PDF do Guia Pré-Visita (Pág 1: Prólogo; Págs 2..N+1: Imóveis individuais sem campos de avaliação; yield cooperativo).
  - `pdf/reportPdfGenerator.ts`: Gerador de relatórios pós-visita (Individual e Match Matrix).
  - `demo/demoData.ts`: Roteiro de exemplo luxuoso para teste em 1 clique.

- 🕸️ **UI & Presentation (`src/presentation/`)**:
  - `components/layout/Header.tsx`: Barra de navegação superior com badge e gatilho do Menu Hambúrguer.
  - `components/layout/HamburgerDrawer.tsx`: Drawer não-destrutivo sobreposto que preserva 100% o estado e texto digitado do cliente.
  - `components/broker/`: Formulário de roteiro, reordenação de imóveis (Move Up/Down), uploader com preview.
  - `components/visitor/`: Capa de boas-vindas, exibição sequencial de imóvel, seletor de decisão tri-state (Gostei, Descartado, Em Dúvida) e trava de avanço.
  - `components/reports/`: Visualização do relatório individual e tabela comparativa lado a lado da Match Matrix.

- 🕸️ **Quality Assurance & Test Matrix (`src/test/`)**:
  - `tc-01-broker-tour.test.tsx`: Teste TC-01 (Cadastro e reordenação pelo corretor).
  - `tc-02-pdf-export.test.ts`: Teste TC-02 (Estrutura estrita do PDF pré-visita sem avaliações).
  - `tc-03-decision-gate.test.tsx`: Teste TC-03 (Trava de decisão obrigatória no fluxo do cliente).
  - `tc-04-hamburger-drawer.test.tsx`: Teste TC-04 (Consulta no hambúrguer sem perda de dados).
  - `tc-05-single-visitor-report.test.tsx`: Teste TC-05 (Relatório individual consolidado e PDF).
  - `tc-06-dual-visitor-cross-report.test.tsx`: Teste TC-06 (Relatório cruzado e Match Matrix).
  - `tc-07-github-pages-build.test.ts`: Teste TC-07 (Build estático, base './', HashRouter, favicon).

---

## 3. Matriz de Roteamento Rápido ("Onde ir em cada situação")
- *Alteração de Regras do Corretor / Imóveis* ➔ `src/domain/models/tour.ts` e `src/presentation/components/broker/`
- *Lógica da Trava de Decisão do Cliente* ➔ `src/domain/services/validation.ts` e `src/presentation/components/visitor/DecisionSelector.tsx`
- *Comportamento do Menu Hambúrguer (Zero Data Loss)* ➔ `src/presentation/components/layout/HamburgerDrawer.tsx`
- *Formatador de Moeda / Preço BRL* ➔ `src/domain/value-objects/money.ts`
- *Compressão de Imagens e Memória Canvas (<30MB)* ➔ `src/infrastructure/media/imageCompression.ts`
- *Geração do PDF do Guia Pré-Visita (TC-02)* ➔ `src/infrastructure/pdf/guidePdfGenerator.ts`
- *Cálculo da Matriz de Compatibilidade (Match Matrix)* ➔ `src/domain/services/comparisonEngine.ts`
- *Persistência Local e Auto-Save* ➔ `src/infrastructure/storage/indexedDb.ts`
- *Configurações do Vite e GitHub Pages (`base: './'`)* ➔ `vite.config.ts`

---

## 4. Grafo de Relações e Dependências Cruzadas
- `BrokerDashboardView` ➔ cria `VisitTour` ➔ persiste em `indexedDb` ➔ gera link via `urlCodec` / exporta via `guidePdfGenerator`
- `ClientVisitView` ➔ carrega `VisitTour` ➔ gerencia `VisitorSession` ➔ auto-save contínuo em `indexedDb` ➔ `HamburgerDrawer` lê sem desmontar
- `DecisionSelector` ➔ valida seleção (`LIKED` | `DISCARDED` | `DOUBT`) ➔ desbloqueia avanço para `k+1`
- `ReportsView` ➔ lê `VisitorSession` (1 ou 2) ➔ executa `comparisonEngine` ➔ renderiza `MatchMatrixTable` ➔ exporta via `reportPdfGenerator`
