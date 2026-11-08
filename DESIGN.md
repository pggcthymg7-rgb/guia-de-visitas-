# Airtable — Style Reference & Design System Oficial (Guia de Visitas)
> warm workshop with color-coded chapters

**Theme:** light

Source measurements are normalized; roles and recommendations are interpreted. Font summary lists are independent, not paired by position. HTML examples are reconstructions, not source components.

Airtable presents as a warm, editorial workspace rather than a cold SaaS dashboard. The canvas is a soft cream parchment (`#faf5e8`) — never stark white — which gives the whole site a paper-like, almost printed feel. Typography is bold and unapologetic: a custom display face at near-900 weight for hero headlines pairs with a workhorse sans for body and UI. Buttons are pure black, not the expected brand-blue, giving the page an architectural, almost print-publication confidence. The signature move is color-coded feature cards — each use case gets its own saturated hue (terracotta, deep blue, forest green, peach, pink) functioning as chapter dividers in a visual catalog. The overall effect is a creative studio notebook: warm, organized, opinionated, and human.

---

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Parchment Cream | `#faf5e8` | `--color-parchment-cream` | Page canvas — the warm off-white that defines the entire site's atmosphere, replacing standard pure-white backgrounds |
| Pure White | `#ffffff` | `--color-pure-white` | Light supporting surface for subtle backgrounds and section separation. Do not promote it to the primary CTA color |
| Frost White | `#f8fafc` | `--color-frost-white` | Alternate light surface for nested elements, subtle nav backgrounds |
| Onyx | `#181d26` | `--color-onyx` | Supporting neutral for secondary UI, dividers, and muted labels. Primary CTA button fill |
| Charcoal | `#333840` | `--color-charcoal` | Body text, secondary text levels, border accents — the workhorse dark neutral |
| Graphite | `#525965` | `--color-graphite` | Muted text, sub-labels, less prominent body copy |
| Steel | `#9297a0` | `--color-steel` | Placeholder text, disabled states, low-emphasis labels |
| Silver Border | `#e0e2e6` | `--color-silver-border` | Hairline dividers, card borders, subtle structural separators |
| Midnight Indigo | `#040e20` | `--color-midnight-indigo` | Deepest heading text, near-black with cool bias for maximum editorial weight |
| Cobalt Blue | `#1b61c9` | `--color-cobalt-blue` | Blue supporting accent for decorative details and low-frequency emphasis. Do not promote it to the primary CTA color |
| Sapphire | `#254fad` | `--color-sapphire` | Violet/Blue supporting accent for chapter cards and comparative analytics |
| Terracotta | `#aa2d00` | `--color-terracotta` | Orange/Red supporting accent for chapter cards and "Descartado" state |
| Burnt Sienna | `#912e1f` | `--color-burnt-sienna` | Dark terracotta variant for card backgrounds and text on warm sections |
| Peach Glow | `#fcab79` | `--color-peach-glow` | Soft warm wash for highlight panels, accent backgrounds |
| Forest Ink | `#0a2e0e` | `--color-forest-ink` | Green supporting accent for chapter cards and "Gostei" state |
| Moss | `#214224` | `--color-moss` | Secondary green text and border accents on green-themed sections |
| Petal Pink | `#fa91e0` | `--color-petal-pink` | Playful accent for tags, category chips, dual-visitor badges |
| Marigold | `#fcb42a` | `--color-marigold` | Warm accent for badges, tag chips, and "Em Dúvida" state |
| Pale Sky | `#c7e5f2` | `--color-pale-sky` | Light supporting surface for subtle backgrounds and section separation |

---

## Tokens — Typography

### Haas Groot Disp — Display headlines — the custom serif/slab face used for hero statements and large section titles, driven by 900 weight for editorial weight · `--font-haas-groot-disp`
- **Substitute (Google Fonts Mandatory Load):** `'Roboto Slab'`, `'Fraunces'`, or `'Playfair Display'` at weight `900`
- **Weights:** 400, 900
- **Sizes:** 20px, 32px, 40px, 48px
- **Line height:** 1.15 to 1.50
- **Letter spacing:** `0px` (normal — never add tracking to display headlines)
- **Role:** Display headlines — hero statements, tour titles, property order headers (`Imóvel 01`), and report headers

### Haas — Body, nav, buttons, subheadings, UI labels — the workhorse sans-serif at 400 for body, 500 for emphasis, 600 for buttons and labels · `--font-haas`
- **Substitute (Google Fonts Mandatory Load):** `'Inter'`
- **Weights:** 400, 500, 600
- **Sizes:** 14px, 16px, 18px, 20px, 24px, 32px, 40px
- **Line height:** 1.15, 1.20, 1.25, 1.30, 1.35, 1.50
- **Letter spacing:** 0.0050em at 14px, 0.0060em at 16px, 0.0070em at 18px, 0.0100em at 20px, 0.0110em at 24px, 0.0200em at 32px+

### Type Scale

| Role | Family | Weight | Size | Line Height | Letter Spacing | Token |
|------|--------|--------|------|-------------|----------------|-------|
| caption | Haas / Inter | 400 / 500 | 14px | 1.35 | 0.07px | `--text-caption` |
| body-sm | Haas / Inter | 400 / 500 | 16px | 1.3 | 0.096px | `--text-body-sm` |
| body | Haas / Inter | 400 | 18px | 1.35 | 0.126px | `--text-body` |
| subheading | Haas / Inter | 500 / 600 | 20px | 1.3 | 0.2px | `--text-subheading` |
| heading-sm | Haas / Inter | 600 | 24px | 1.25 | 0.264px | `--text-heading-sm` |
| heading | Haas Groot Disp | 900 | 32px | 1.2 | 0px | `--text-heading` |
| heading-lg | Haas Groot Disp | 900 | 40px | 1.15 | 0px | `--text-heading-lg` |
| display | Haas Groot Disp | 900 | 48px | 1.5 | 0px | `--text-display` |

---

## Tokens — Spacing & Shapes

- **Base unit:** `8px`
- **Density:** comfortable
- **Page max-width:** `1200px`
- **Section gap:** `64px` (Desktop) / `40px` (Mobile)
- **Card padding:** `24px` (Desktop) / `16px` (Mobile)
- **Element gap:** `16px`

### Border Radius

| Element | Value | Token |
|---------|-------|-------|
| tags / chips | `32px` | `--radius-tags` |
| cards | `16px` | `--radius-cards` |
| buttons | `12px` | `--radius-buttons` |
| featureCards | `24px` | `--radius-featurecards` |

### Shadows

- **Primary CTA Button (`--shadow-subtle`):** `rgba(0, 0, 0, 0.32) 0px 0px 1px 0px, rgba(0, 0, 0, 0.08) 0px 0px 2px 0px, rgba(45, 127, 249, 0.28) 0px 1px 3px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 0.5px inset`
- **Top Navigation (`--shadow-lg`):** `rgba(15, 48, 106, 0.05) 0px 0px 20px 0px`

---

## Application Mapping — Guia de Visitas Imobiliárias

1. **Top Navigation Bar & Hamburger Drawer (Modo Visita):**
   - Barra superior fixa em `#ffffff` com sombra `--shadow-lg`.
   - No modo visita do cliente, exibe à esquerda o badge da visita atual (`Imóvel 01 de 05`), ao centro o nome do roteiro, e à direita o botão **Hambúrguer** (`1px solid #181d26`, `border-radius: 12px`).
   - Ao abrir o Hambúrguer, abre-se um **Drawer / Bottom Sheet** (máximo de 50% a 75% de altura em mobile com backdrop translúcido ou gaveta lateral em desktop) sobre o fundo `#faf5e8`, listando todos os imóveis do roteiro para consulta e comparação rápida **sem desmontar nem sair da página da visita atual**.
2. **Color-Coded Chapter Cards para os Imóveis e Decisões:**
   - **Gostei (`LIKED`):** Bloco externo ou borda ativa em **Forest Ink (`#0a2e0e`)** / **Moss (`#214224`)**, chip em `#c7e5f2` ou verde suave com texto `#0a2e0e`.
   - **Em Dúvida (`DOUBT`):** Bloco externo ou borda ativa em **Marigold (`#fcb42a`)** / **Peach Glow (`#fcab79`)**, texto em `#181d26`.
   - **Descartado (`DISCARDED`):** Bloco externo ou borda ativa em **Terracotta (`#aa2d00`)** / **Burnt Sienna (`#912e1f`)**, texto contrastante.
3. **Trava de Progressão Obrigatória na Visita:**
   - O botão primário **"Salvar Anotações e Ir para o Próximo Imóvel"** (`#181d26` Onyx) permanece bloqueado (`disabled` com `--color-steel: #9297a0`) até que o cliente selecione explicitamente uma das 3 caixas (`Gostei`, `Descartado` ou `Em Dúvida`).

---

## CSS Custom Properties (Quick Start)

```css
:root {
  /* Colors */
  --color-parchment-cream: #faf5e8;
  --color-pure-white: #ffffff;
  --color-frost-white: #f8fafc;
  --color-onyx: #181d26;
  --color-charcoal: #333840;
  --color-graphite: #525965;
  --color-steel: #9297a0;
  --color-silver-border: #e0e2e6;
  --color-midnight-indigo: #040e20;
  --color-cobalt-blue: #1b61c9;
  --color-sapphire: #254fad;
  --color-terracotta: #aa2d00;
  --color-burnt-sienna: #912e1f;
  --color-peach-glow: #fcab79;
  --color-forest-ink: #0a2e0e;
  --color-moss: #214224;
  --color-petal-pink: #fa91e0;
  --color-marigold: #fcb42a;
  --color-pale-sky: #c7e5f2;

  /* Typography — Font Families */
  --font-haas-groot-disp: 'Roboto Slab', 'Fraunces', Georgia, serif;
  --font-haas: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Spacing */
  --spacing-unit: 8px;
  --spacing-8: 8px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-64: 64px;

  /* Layout */
  --page-max-width: 1200px;
  --section-gap: 64px;
  --card-padding: 24px;
  --element-gap: 16px;

  /* Named Radii */
  --radius-tags: 32px;
  --radius-cards: 16px;
  --radius-buttons: 12px;
  --radius-featurecards: 24px;

  /* Shadows */
  --shadow-subtle: rgba(0, 0, 0, 0.32) 0px 0px 1px 0px, rgba(0, 0, 0, 0.08) 0px 0px 2px 0px, rgba(45, 127, 249, 0.28) 0px 1px 3px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 0.5px inset;
  --shadow-lg: rgba(15, 48, 106, 0.05) 0px 0px 20px 0px;

  /* Surfaces */
  --surface-parchment-canvas: #faf5e8;
  --surface-white-card: #ffffff;
  --surface-frost-white: #f8fafc;
  --surface-pale-sky: #c7e5f2;
  --surface-onyx-frame: #181d26;
}
```
