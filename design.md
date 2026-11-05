# Design do Aplicativo - Acessibilidade Visual

## Visão Geral

Aplicativo móvel moderno focado em acessibilidade para pessoas com deficiência visual. Interface extremamente simples, intuitiva e com alto contraste, priorizando usabilidade e clareza.

**Princípios de Design:**
- Alto contraste (branco/preto ou amarelo/preto)
- Fontes grandes e legíveis
- Elementos bem espaçados
- Botões grandes e acessíveis
- Ícones simples e universais
- Feedback por áudio em todas as interações
- Sem tela de login ou onboarding
- Acesso direto à função principal ao abrir

---

## Telas

### Tela 1: Identificação de Cores

**Objetivo:** Detectar e anunciar cores em tempo real através da câmera do dispositivo.

**Layout:**
- **Fundo:** Visualização da câmera ocupando toda a tela
- **Centro:** Quadrado/moldura bem visível com bordas grossas e alto contraste
  - Este é o ponto de leitura da cor
  - Cor da moldura: Branco ou amarelo com borda preta (contraste máximo)
  - Tamanho: ~120x120px (visível mas não invasivo)
- **Texto da Cor:** Posicionado acima ou abaixo da moldura
  - Fonte: Grande (32-40px)
  - Cor: Alto contraste (branco em fundo preto ou preto em fundo branco)
  - Exemplo: "Vermelho", "Azul", "Verde"
  - Feedback por voz: Anúncio automático da cor detectada

**Botões:**
- **Botão "Modo Luz"** (parte inferior da tela)
  - Tamanho: Grande (60x60px mínimo)
  - Ícone: Simples (ex: ícone de som/alerta)
  - Texto: "Modo Luz" (opcional, pode ser apenas ícone)
  - Ação: Navega para Tela 2
  - Feedback: Haptic + som ao tocar

**Elementos de Acessibilidade:**
- Feedback por voz anunciando a cor detectada
- Haptic feedback ao tocar botões
- Contraste máximo em todos os elementos
- Sem elementos decorativos que causem distração

---

### Tela 2: Detecção de Luz com Feedback Sonoro

**Objetivo:** Detectar intensidade de luz e fornecer feedback sonoro (apito variável em frequência).

**Layout:**
- **Fundo:** Visualização da câmera ocupando toda a tela
- **Centro:** Indicador visual simples
  - Opção 1: Círculo que muda de tamanho conforme a intensidade da luz
  - Opção 2: Barra vertical/horizontal que sobe/desce
  - Cor: Alto contraste (branco/preto ou amarelo/preto)
- **Feedback Sonoro:** Principal elemento
  - Apito que varia de frequência conforme a intensidade da luz
  - Frequência baixa = pouca luz
  - Frequência alta = muita luz
  - Som contínuo ou pulsante conforme a luz muda

**Botões:**
- **Botão "Voltar para Cores"** (parte inferior da tela)
  - Tamanho: Grande (60x60px mínimo)
  - Ícone: Seta simples apontando para trás
  - Texto: "Voltar" (opcional)
  - Ação: Retorna para Tela 1
  - Feedback: Haptic + som ao tocar

**Elementos de Acessibilidade:**
- Feedback sonoro é o elemento principal (não visual)
- Indicador visual simples para usuários com visão residual
- Haptic feedback ao tocar botões
- Sem elementos visuais complexos que causem distração

---

## Fluxo de Navegação

```
Abertura do App
    ↓
Tela 1: Identificação de Cores (câmera ativa)
    ↓
Toque em "Modo Luz"
    ↓
Tela 2: Detecção de Luz (câmera ativa)
    ↓
Toque em "Voltar"
    ↓
Tela 1: Identificação de Cores
```

---

## Paleta de Cores

**Alto Contraste (Acessibilidade):**
- **Fundo Principal:** Preto (#000000) ou Branco (#FFFFFF)
- **Texto Principal:** Branco (#FFFFFF) em fundo preto, ou Preto (#000000) em fundo branco
- **Moldura de Leitura:** Amarelo (#FFFF00) ou Branco (#FFFFFF) com borda preta
- **Botões:** Amarelo (#FFFF00) com texto preto, ou Branco (#FFFFFF) com borda preta
- **Indicadores:** Amarelo (#FFFF00) ou Branco (#FFFFFF)

**Modo Claro (Light Mode):**
- Background: Branco (#FFFFFF)
- Foreground: Preto (#000000)
- Moldura: Amarelo (#FFFF00) com borda preta

**Modo Escuro (Dark Mode):**
- Background: Preto (#000000)
- Foreground: Branco (#FFFFFF)
- Moldura: Amarelo (#FFFF00) com borda preta

---

## Tipografia

- **Tamanho de Fonte Principal:** 32-40px (nomes de cores, indicadores)
- **Tamanho de Fonte Secundária:** 18-24px (labels de botões, se necessário)
- **Família:** Sans-serif moderna (ex: Inter, Roboto)
- **Peso:** Bold para destaque, Regular para secundário
- **Espaçamento:** Generoso (1.5x line-height mínimo)

---

## Componentes Principais

### 1. Moldura de Leitura (Tela 1)
- Quadrado com bordas grossas (4-6px)
- Dimensões: ~120x120px
- Posição: Centro da tela
- Cor: Amarelo ou Branco com borda preta
- Função: Indicar ponto de leitura da cor

### 2. Texto da Cor (Tela 1)
- Posição: Acima ou abaixo da moldura
- Tamanho: 32-40px
- Cor: Alto contraste
- Atualização: Em tempo real conforme a cor muda

### 3. Indicador de Luz (Tela 2)
- Opção 1: Círculo que muda de tamanho
- Opção 2: Barra que sobe/desce
- Posição: Centro da tela
- Cor: Amarelo ou Branco com borda preta
- Atualização: Em tempo real conforme a luz muda

### 4. Botão de Ação
- Tamanho: 60x60px mínimo
- Forma: Circular ou quadrada com bordas arredondadas
- Cor: Amarelo (#FFFF00) com texto preto, ou Branco com borda preta
- Ícone: Simples e universal
- Feedback: Haptic + som ao tocar
- Posição: Parte inferior da tela (acima da barra de segurança)

---

## Interações

### Toque em Botão
- **Feedback Visual:** Mudança de opacidade ou escala (0.95x)
- **Feedback Haptic:** Impacto leve (ImpactFeedbackStyle.Light)
- **Feedback Sonoro:** Beep curto e agradável

### Detecção de Cor (Tela 1)
- **Feedback Visual:** Atualização do texto em tempo real
- **Feedback Sonoro:** Anúncio da cor detectada (text-to-speech)
- **Frequência:** A cada 500-1000ms (evitar atualizações muito rápidas)

### Detecção de Luz (Tela 2)
- **Feedback Visual:** Indicador muda de tamanho/posição
- **Feedback Sonoro:** Apito contínuo com frequência variável
- **Frequência:** Atualização em tempo real (50-100ms)

---

## Acessibilidade

### Para Pessoas com Deficiência Visual Total
- Feedback sonoro é o elemento principal
- Text-to-speech para anúncio de cores
- Apito variável para indicação de luz
- Haptic feedback para confirmação de ações
- Botões grandes e bem espaçados

### Para Pessoas com Visão Residual
- Alto contraste em todos os elementos
- Fontes grandes (32-40px mínimo)
- Elementos bem espaçados
- Indicadores visuais simples (moldura, círculo, barra)
- Sem elementos decorativos que causem confusão

### Navegação
- Sem tela de login ou onboarding
- Acesso direto à função principal
- Navegação simples entre duas telas
- Botões grandes e fáceis de tocar
- Feedback claro em cada ação

---

## Especificações Técnicas

### Câmera
- Ativa ao abrir o app
- Permissão solicitada ao primeiro uso
- Visualização em tempo real
- Leitura de cor/luz no centro da tela

### Áudio
- Text-to-speech para anúncio de cores
- Síntese de apito para detecção de luz
- Beep para feedback de botão
- PlaysInSilentModeIOS: true (áudio mesmo em modo silencioso)

### Haptic
- Feedback ao tocar botões
- Feedback ao detectar mudanças significativas (opcional)

### Permissões
- Câmera (obrigatória)
- Microfone (para áudio)
- Acesso a áudio do sistema (para text-to-speech)

---

## Próximas Etapas

1. Implementar Tela 1 com câmera e detecção de cores
2. Implementar Tela 2 com detecção de luz e feedback sonoro
3. Integrar text-to-speech para anúncio de cores
4. Integrar síntese de áudio para apito variável
5. Testar acessibilidade com usuários reais
6. Refinar design baseado em feedback
