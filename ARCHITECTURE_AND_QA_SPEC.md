# Especificação de Engenharia Backend/Estado & Auditoria Preventiva de QA
**Projeto:** Guia de Visitas Imobiliárias (`guia-de-visitas-`)  
**Ambiente de Deploy:** GitHub Pages (Static SPA / Serverless Client-Side & Distributed State)  
**Governança Técnica:** `@phd-backend-engineer` (DDD, Arquitetura Hexagonal, Concorrência & Segurança OWASP ASVS 5.0) + `@analista-qa-global` (ISO/IEC 25010:2023, ISO/IEC/IEEE 29119, WebKit/iOS Jetsam Internals, Nielsen Norman Group & Steven Hoober)

---

## PARTE I — Especificação do Principal Backend Engineer (`@phd-backend-engineer`)

### 1. Relatório de Auditoria Preventiva e Diagnóstico de Gargalos Topológicos

Ao projetar um Web App completo hospedado no **GitHub Pages** (infraestrutura estática distribuída via CDN sem runtime Node.js/Python persistente no servidor de origem), identificam-se 4 gargalos físicos e topológicos que causariam falha em produção caso não sejam endereçados arquiteturalmente:

1. **Isolamento de Estado entre Dispositivos (Corretor vs. Cliente 1 vs. Cliente 2):**
   - *Diagnóstico:* No GitHub Pages, salvar o roteiro cadastrado pelo corretor apenas no `localStorage` do navegador do corretor impede que o Cliente 1 e o Cliente 2 abram o roteiro em seus próprios smartphones (iOS/Android), pois o `localStorage` é confinado por origem e dispositivo físico.
   - *Solução Determinística Híbrida (Dual-Transport Adapter):*
     - **Camada Primária (Self-Contained Compressed State Payload + Local IndexedDB):** O roteiro completo (ou seu delta de respostas) é serializado em JSON tipado, comprimido via `lz-string` (ou `CompressionStream` deflate-raw + Base64URL) e embutido nos links compartilháveis (`#/...`), além de persistido localmente em `IndexedDB` (suportando blobs de imagens muito superiores ao limite de 5 MB do `localStorage`).
     - **Camada Secundária (Cloud Sync / Serverless KV Adapter Opcional & Merge Instantâneo via Token/QR):** Interface `ISyncPort` desacoplada que sincroniza automaticamente os estados do Cliente 1 e Cliente 2 via armazenamento JSON em nuvem gratuito/configurável **E** oferece consolidação 100% offline/instantânea via **Código/Link de Cruzamento (Merge Token)** ou **QR Code** ao final da visita (essencial para condomínios fechados afastados onde há perda de conectividade 4G/5G).
2. **Estouro de Memória e Payload por Imagens de Fachada Não Otimizadas:**
   - *Diagnóstico:* Fotos tiradas de smartphones modernos possuem entre 4 MB e 12 MB (HEIC/JPEG 4032×3024). Injetar 5 a 10 fotos brutas em Base64 dentro do estado ou gerador de PDF estoura a memória do WebKit no iOS e inviabiliza o compartilhamento de URLs.
   - *Solução:* Pipeline determinístico de compressão client-side assíncrono (`ImageCompressionService`) que redimensiona a foto da fachada para no máximo `1200px` no eixo maior em formato `image/webp` ou `image/jpeg` (qualidade `0.78`, resultando em ~60 KB–120 KB por fachada) e suporta também URLs externas diretas de imagens, limpando imediatamente o buffer do `<canvas>` após o processamento (`canvas.width = 0; canvas.height = 0`).
3. **Condições de Corrida (Race Conditions) no Cruzamento de 2 Visitantes:**
   - *Diagnóstico:* Quando 2 pessoas realizam a visita (ex.: casal ou sócios), atualizações concorrentes ou reenvios de pacotes sob rede instável podem sobrescrever as avaliações (`Gostei`, `Descartado`, `Em Dúvida`) ou observações de um dos visitantes.
   - *Solução (Kleppmann Fencing Tokens + RFC 9110 Idempotency):* Cada visitante opera em uma partição de estado estritamente isolada (`visitorSlot: 'VISITOR_1' | 'VISITOR_2'`). Cada submissão de avaliação de imóvel incrementa atomicamente um **Fencing Token Monotônico (`fencingToken: number`)** e carrega uma chave determinística **`idempotencyKey = SHA256(tourId + visitorSlot + propertyId + fencingToken)`**. O motor de fusão (`ComparativeReportEngine`) aceita apenas escritas com `fencingToken` estritamente superior ao `highWaterMark` registrado para aquele par `(visitorSlot, propertyId)`.
4. **Segurança e Validação de Entrada (OWASP ASVS v5.0 Cap. V2):**
   - *Diagnóstico:* Como dados do roteiro e observações dos clientes trafegam via parâmetros de URL, JSON importado/sincronizado e gerador de PDF, payloads malformados podem causar DOM XSS ou *Silent Data Loss* (perda silenciosa de dados por bloqueio cego).
   - *Solução:* Validação por *Allow-list* estrutural (Schema Validator / Value Objects) na camada de entrada (*Driving Adapter*) combinada com *Contextual Output Encoding* nativo do React e sanitização estrita na geração do PDF, proibindo qualquer uso de `innerHTML` ou `eval`.

---

### 2. Justificativa Arquitetural (DDD + Arquitetura Hexagonal / Clean Architecture)

Para atingir conformidade máxima com a **ISO/IEC 25010:2023** (Adequação Funcional, Confiabilidade, Manutenibilidade e Segurança contra Danos / *Fail Sanely*), a aplicação é estruturada em **3 Contextos Delimitados (Bounded Contexts)** sob **Arquitetura Hexagonal (Ports & Adapters)**:

1. **`TourCatalogContext` (Gestão do Roteiro e Imóveis pelo Corretor):**
   - **Aggregate Root:** `VisitTour` (identificado por `tourId`, contendo data, título, configuração `visitorCount: 1 | 2`, nomes dos visitantes `visitor1Name`, `visitor2Name` e lista ordenada imutável de `PropertyStop`).
   - **Entity:** `PropertyStop` (`propertyId`, `orderIndex: number` 1..N, `condominiumName: string`, `priceCents: number`, `title: string`, `fullDescription: string`, `facadeImageDataUrl: string`).
2. **`ActiveVisitExecutionContext` (Execução Guiada da Visita pelo Cliente):**
   - **Aggregate Root:** `VisitorSession` (`sessionId`, `tourId`, `visitorSlot: 'VISITOR_1' | 'VISITOR_2'`, `visitorName`, `status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'`, `currentStopIndex: number`, `evaluations: Record<PropertyId, PropertyEvaluation>`).
   - **Value Object:** `PropertyEvaluation` (`propertyId`, `decision: 'LIKED' | 'DISCARDED' | 'DOUBT'`, `notes: string`, `fencingToken: number`, `idempotencyKey: string`, `updatedAtIso: string`).
   - **Invariante de Domínio Inegociável (State Machine Guard):** A transição de `currentStopIndex = k` para `k + 1` (ou para `COMPLETED` quando `k == N - 1`) lança exceção de domínio (`DomainRuleViolationError`) se `evaluations[property_k].decision` não pertencer ao conjunto estrito `{'LIKED', 'DISCARDED', 'DOUBT'}`. O acesso ao menu Hambúrguer (`QuickCompareDrawer`) é uma operação puramente de leitura (*Query* via CQRS) que jamais muta `currentStopIndex`.
3. **`ReportingAndComparisonContext` (Geração de PDF do Guia e Relatórios Individual / Cruzado):**
   - **Domain Service 1 — `GuidePdfGeneratorPort`:** Gera o PDF oficial do Guia de Visitas contendo **exclusivamente**:
     - **Página 1 (Prólogo / Sumário Executivo do Roteiro):** Lista ordenada de todas as visitas do dia com Ordem (`01`, `02`...), Nome do Condomínio e Preço do Imóvel formatado em `R$`.
     - **Páginas 2 a N+1 (1 Página Exclusiva por Imóvel):** Cada imóvel em sua própria página dedicada contendo Foto da Fachada, Nome do Condomínio, Preço e Descrição Completa.
   - **Domain Service 2 — `ComparativeReportService`:**
     - Quando `visitorCount === 1`: consolida o Relatório Individual com a decisão (`Gostei`, `Descartado`, `Em Dúvida`) e as observações de cada imóvel na ordem visitada.
     - Quando `visitorCount === 2`: cruza deterministicamente `VisitorSession[VISITOR_1]` e `VisitorSession[VISITOR_2]` gerando a **Matriz de Compatibilidade (Match Matrix)**:
       - `MATCH_POSITIVE`: Ambos escolheram `LIKED` (Gostei).
       - `PARTIAL_ALIGNMENT`: Um escolheu `LIKED` e o outro `DOUBT` (Em Dúvida).
       - `MUTUAL_DOUBT`: Ambos escolheram `DOUBT`.
       - `DIVERGENCE`: Um escolheu `LIKED` e o outro `DISCARDED` (Descartado).
       - `CONSENSUAL_DISCARD`: Ambos escolheram `DISCARDED` (ou um `DISCARDED` e outro `DOUBT`).

---

### 3. Análise de Complexidade (Big-O) e Particularidades de Runtime (Browser JS Engine & WebKit)

- **Navegação Sequencial e Validação de Estado:** $O(1)$ em tempo e espaço através de indexação direta por `currentStopIndex` e mapa hash `evaluations[propertyId]`.
- **Consulta no Menu Hambúrguer (Comparação em Tempo Real):** $O(N)$ onde $N$ é o número de imóveis no roteiro do dia (tipicamente $1 \le N \le 15$), renderizado sem desmontar o componente `CurrentPropertyVisitView` (preservando o foco, estado do input e zero perda de rascunho).
- **Cruzamento de Dados dos 2 Clientes (`ComparativeReportService.crossEvaluate`):**
  - Complexidade Temporal: $O(N)$ (junção linear indexada por `propertyId` sobre a lista ordenada de $N$ imóveis, evitando loops aninhados $O(N^2)$).
  - Complexidade Espacial: $O(N)$ para a estrutura imutável `CrossEvaluationReport`.
- **Geração de PDF Client-Side (`jsPDF` / Canvas Offscreen):**
  - Complexidade Temporal: $O(N)$ com cedência cooperativa ao Event Loop (`await new Promise(requestAnimationFrame)`) entre a renderização de cada página do PDF para não bloquear a *Main Thread* (evitando congelamento da UI).
  - Complexidade Espacial no iOS/WebKit: Reuso de um único elemento `<canvas>` temporário com desalocação explícita (`canvas.width = 0; canvas.height = 0`) ao término de cada página, mantendo o consumo de memória gráfica estritamente abaixo de **30 MB** (muito distante do teto fatal de **384 MB** do WebKit Bug 195325 e do limite de **400–450 MB** do daemon **Jetsam** em iPhones de 4 GB de RAM).

---

## PARTE II — Diretrizes e Quality Gates do Principal QA & SRE Auditor (`@analista-qa-global`)

### 1. Visão Executiva de Risco (Prevenção de Churn Voluntário e Proteção da Experiência do Cliente)

Durante uma visita presencial a condomínios fechados, o cliente de alto padrão está em movimento, utilizando um smartphone (frequentemente iPhone/Safari sob sol forte e conexão 4G/5G intermitente). Qualquer falha técnica durante o roteiro destrói a percepção de valor do atendimento imobiliário:
- **Risco Crítico 1 — Perda Silenciosa de Anotações (*Silent Data Loss*):** Se o cliente digitar um parágrafo de observações sobre um imóvel e a aba do Safari recarregar (ou ele abrir o menu hambúrguer para comparar com a casa anterior) e o texto sumir, ocorre frustração imediata.
  - *Prescrição Normativa (ISO/IEC 25010:2023 Safety / Fail Sanely + Heurística 5 de Nielsen):* Implementar **Auto-Save Atômico Instantâneo** em `IndexedDB` / `localStorage` a cada alteração no campo de observações (`onChange` com persistência imediata do rascunho por `tourId + visitorSlot + propertyId`), garantindo **Zero Data Loss** mesmo se o aparelho desligar ou a página for atualizada.
- **Risco Crítico 2 — Extermínio da Aba pelo Subsistema Jetsam no iOS (`WebKit.WebContent` Crash):**
  - *Fundamentação Científica (WebKit `MemoryPressureHandlerCocoa.mm` & Kernel XNU `Jetsam`):* O iOS opera com **zero swap** para aplicações web. Carregar múltiplas fotos de alta resolução em `<canvas>` sem liberar memória causa o abatimento sumário da aba pelo Jetsam ao atingir 384 MB de canvas ou 400–450 MB de RAM total.
  - *Prescrição Normativa (IEEE TSE 2025 MemLab/LeakPair):* Compressão das fachadas no momento do upload, limpeza obrigatória de `URL.createObjectURL` via `URL.revokeObjectURL`, zeramento de `<canvas>` temporários (`width = 0; height = 0`) e remoção de todos os `addEventListener` / `setTimeout` no cleanup de `useEffect`.
- **Risco Crítico 3 — Fuga acidental da página da visita atual ou perda de contexto no Menu Hambúrguer:**
  - *Fundamentação Científica (ISO/IEC 25010:2023 Interaction Capability + Steven Hoober Mobile Viewport Ergonomics + Heurística 1 e 3 de Nielsen):*
  - *Prescrição Normativa:*
    1. O Menu Hambúrguer deve abrir como um **Drawer / Modal Overlay** sobreposto à página da visita atual (sem alterar a rota ativa e sem desmontar o formulário da visita atual).
    2. No Drawer, o cliente visualiza o resumo geral de todos os imóveis (Ordem, Foto da Fachada, Condomínio, Preço, Descrição Completa e suas próprias notas/escolhas já feitas nos imóveis anteriores) com indicação clara de qual é o **Imóvel Atual em Visita**.
    3. A única forma de avançar do Imóvel $k$ para o Imóvel $k+1$ é selecionando explicitamente uma das 3 caixas (`Gostei`, `Descartado` ou `Em Dúvida`) no rodapé da visita atual e confirmando em **"Salvar e Ir para o Próximo Imóvel"**.
- **Risco Crítico 4 — Isolamento de Falhas (*Bulkhead Pattern* - Michael T. Nygard, *Release It!*):**
  - Envolver os módulos principais (Painel do Corretor, Gerador de PDF, Visita Guiada do Cliente e Relatório Cruzado) em um componente `ErrorBoundary` resiliente que, em caso de qualquer erro inesperado, preserva 100% dos dados salvos e permite recuperação com 1 clique sem Tela Branca da Morte (*White Screen of Death*).

---

### 2. Matriz de Verificação de Qualidade (ISO/IEC/IEEE 29119 Test Cases Obrigatórios)

| ID | Caso de Teste (ISO/IEC/IEEE 29119-4) | Pré-condição / Entrada | Resultado Esperado (Oráculo Determinístico) |
|----|--------------------------------------|------------------------|---------------------------------------------|
| **TC-01** | Cadastro Ordenado de Roteiro pelo Corretor | Corretor adiciona 3 imóveis com Foto da Fachada, Nome do Condomínio, Preço e Descrição Completa, e reordena a sequência | A página inicial exibe o roteiro completo na exata ordem configurada (`01`, `02`, `03`). |
| **TC-02** | Exportação do Guia em PDF ("Apenas Isso") | Corretor finaliza o cadastro de $N$ imóveis e aciona "Baixar Guia em PDF" | O PDF gerado contém: **Página 1 (Prólogo)** listando Ordem das Visitas, Nome do Condomínio e Preço; **Páginas 2 a $N+1$** contendo exatamente 1 página por imóvel com Foto da Fachada e Descrição Completa (com condomínio e preço). Nenhuma página extra ou dado de avaliação aparece neste PDF. |
| **TC-03** | Fluxo do Cliente — Início e Trava de Decisão Obrigatória | Cliente abre seu link, clica em "Começar Visitas" e tenta ir ao Imóvel 2 sem escolher entre `Gostei`, `Descartado` ou `Em Dúvida` | O botão de avançar permanece bloqueado/desabilitado e exibe aviso claro. Ao selecionar uma das 3 caixas, o botão habilita, salva a escolha + observações e avança para o Imóvel 2. |
| **TC-04** | Consulta no Menu Hambúrguer sem Sair da Visita Atual | Cliente está no Imóvel 2, digita texto na caixa de observações, abre o Menu Hambúrguer, consulta os dados do Imóvel 1 e do Imóvel 3, e fecha o menu | O cliente permanece na página do Imóvel 2 e o texto digitado na caixa de observações permanece 100% intacto (*Zero Data Loss*). |
| **TC-05** | Modo 1 Visitante — Relatório Final Individual | Roteiro configurado para 1 pessoa; cliente conclui todos os $N$ imóveis e clica em "Gerar Relatórios" | Exibe o relatório consolidado com todos os imóveis visitados, a opção escolhida (`Gostei`, `Descartado`, `Em Dúvida`) e as observações de cada um, com exportação em PDF/compartilhamento. |
| **TC-06** | Modo 2 Visitantes — Páginas Individuais e Relatório Cruzado | Corretor seleciona "2 Pessoas farão as visitas" (Cliente A e Cliente B). O sistema gera 2 páginas/links individuais. Ambos concluem as visitas. | O sistema cruza as avaliações e observações de Cliente A e Cliente B para cada imóvel, exibindo lado a lado as escolhas, o status de compatibilidade (Match / Divergência / Dúvida / Descarte) e as observações dos dois, com exportação em PDF. |
| **TC-07** | Compatibilidade com GitHub Pages (`/guia-de-visitas-/`) | Build de produção (`npm run build`) servido em subcaminho `/guia-de-visitas-/` | Zero erros 404 de assets ou rotas (uso de `base: './'` no Vite e `HashRouter`), `favicon` presente (zero 404 no console) e 100% responsivo em mobile (iOS Safari / Android Chrome) e desktop. |
