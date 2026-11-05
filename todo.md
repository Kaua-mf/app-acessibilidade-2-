# Acessibilidade Visual - TODO

## Funcionalidades Principais

- [x] Tela 1 - Identificação de Cores
  - [x] Integração da câmera em tempo real
  - [x] Detecção e análise de cores
  - [x] Exibição do nome da cor em texto grande
  - [x] Feedback por voz (text-to-speech)
  - [x] Moldura de leitura visível e com alto contraste
  - [x] Botão "Modo Luz" grande e acessível
  - [x] Feedback haptic ao tocar botão

- [x] Tela 2 - Detecção de Luz
  - [x] Integração da câmera em tempo real
  - [x] Detecção de intensidade de luz
  - [x] Indicador visual simples (círculo dinâmico)
  - [x] Exibição de percentagem de luz
  - [x] Botão "Voltar" grande e acessível
  - [x] Feedback haptic ao tocar botão

## Design e Interface

- [x] Paleta de cores com alto contraste
- [x] Tipografia grande e legível (32-40px)
- [x] Botões grandes (80x80px)
- [x] Moldura de leitura com bordas grossas
- [x] Indicador visual de luz (círculo dinâmico)
- [x] Espaçamento generoso entre elementos
- [x] Sem elementos decorativos que causem distração
- [x] Logo personalizado (olho + lâmpada)

## Acessibilidade

- [x] Permissão de câmera solicitada
- [x] Text-to-speech funcionando
- [x] Haptic feedback funcionando
- [x] Contraste máximo em todos os elementos
- [x] Fontes grandes e legíveis
- [x] Navegação simples e intuitiva
- [x] Sem tela de login ou onboarding

## Navegação

- [x] Sem tela de login ou onboarding
- [x] Acesso direto ao app com três abas
- [x] Navegação entre Tela 1 e Tela 2
- [x] Botões de navegação grandes e acessíveis
- [x] Tela inicial com instruções

## Testes

- [ ] Testar detecção de cores em diferentes iluminações
- [ ] Testar feedback sonoro em diferentes volumes
- [ ] Testar haptic feedback em diferentes dispositivos
- [ ] Testar navegação entre telas
- [ ] Testar permissões de câmera e áudio
- [ ] Testar acessibilidade com screen reader


## Síntese de Apito Variável

- [x] Criar utilitário de síntese de áudio com Web Audio API
- [x] Implementar geração de apito com frequência variável (200-2000 Hz)
- [x] Integrar síntese na Tela 2 de Detecção de Luz
- [x] Botão para ativar/desativar apito
- [x] Exibição de frequência em Hz
- [ ] Testar síntese em diferentes dispositivos
- [ ] Otimizar performance da síntese de áudio


## Processamento de Imagem Real

- [x] Criar utilitário de análise de cores de imagem
- [x] Integrar processamento de frames da câmera
- [x] Detectar cores no centro da moldura
- [x] Converter RGB para nome de cor
- [x] Exibir confiança de detecção
- [x] Exibir valores RGB e hex
- [x] Criar 27 testes unitários (todos passando)
- [ ] Otimizar performance do processamento
- [ ] Testar detecção em diferentes iluminações


## Calibração de Cores

- [x] Criar utilitário de armazenamento de configurações (AsyncStorage)
- [x] Implementar tela de calibração com sliders interativos
- [x] Adicionar presets de calibração (interior, exterior, baixa luz)
- [x] Criar 33 testes unitários (todos passando)
- [x] Adicionar aba de calibração no layout principal
- [x] Implementar persistência com AsyncStorage
- [x] Adicionar validação de configurações
- [ ] Integrar configurações na detecção de cores (próximo passo)


## Melhorias na Tela Inicial

- [x] Converter caixas de informação em atalhos clicáveis
- [x] Adicionar navegação para Identificação de Cores
- [x] Adicionar navegação para Detecção de Luz
- [x] Adicionar feedback visual ao tocar nos atalhos (escala e opacidade)
- [x] Adicionar feedback haptic ao tocar nos atalhos


## Ajustes de UI e Configurações de Fala

- [x] Adicionar controle de velocidade da fala na calibração
- [x] Adicionar controle de pitch da voz na calibração
- [x] Criar utilitário de configurações de fala com AsyncStorage
- [x] Criar 27 testes unitários para fala (todos passando)
- [x] Ajustar padding do app para evitar corte do app bar
- [x] Ajustar espaçamento do título "Acessibilidade Visual"
- [x] Adicionar padding bottom para evitar corte pela tab bar
- [ ] Testar layout em diferentes tamanhos de tela


## Ajustes Finais de Layout

- [x] Remover barra de rolagem (ScrollView)
- [x] Centralizar conteúdo verticalmente
- [x] Mudar fundo para preto (theme.config.js)
- [x] Posicionar título logo abaixo da câmera
- [x] Remover padding desnecessário
- [x] Ajustar cores para branco em fundo preto
- [x] Simplificar layout sem ScrollView


## Botões de Navegação

- [x] Adicionar botão "Voltar" visível na tela de Identificação de Cores
- [x] Adicionar botão "Voltar" visível na tela de Detecção de Luz
- [x] Garantir que botões estejam sempre visíveis e acessíveis
- [x] Posicionar botão de voltar no canto superior esquerdo (Cores)
- [x] Posicionar botão de voltar junto com outros controles (Luz)


## Integração de Configurações de Fala

- [x] Carregar configurações de fala na tela de Cores
- [x] Usar rate e pitch carregados ao reproduzir nomes de cores
- [x] Usar volume carregado ao reproduzir nomes de cores
- [x] Respeitar configuração de enabled para ativar/desativar fala
- [x] Atualizar áudio quando configurações mudam
- [x] Todos os 98 testes passando


## Ajustes de Posicionamento da UI

- [x] Remover texto "Acessibilidade Visual" do topo da tela inicial
- [x] Subir a barra de abas (tab bar) mais para cima
- [x] Reduzir altura da tab bar de 56 para 48px
- [x] Reduzir padding top de 8 para 4px
- [x] Reduzir bottom padding para melhor espaçamento


## Feedback de Vibração Aprimorado

- [x] Adicionar vibração Heavy nos botões da tela inicial
- [x] Adicionar vibração Medium nos botões de voltar
- [x] Adicionar vibração Medium nos botões de modo luz/cores
- [x] Adicionar vibração Medium nos sliders de calibração
- [x] Adicionar vibração Heavy nos botões de toggle de apito
- [x] Adicionar vibração Heavy nos botões de preset e reset
- [x] Adicionar vibração Heavy nos botões de permissão de câmera
- [x] Todos os 98 testes passando


## Reposicionamento da Tab Bar

- [x] Mover tab bar mais para cima
- [x] Posicionar tab bar no meio da tela (bottom: 50%)
- [x] Adicionar borda inferior para melhor definição
- [x] Mover tab bar para perto do final da página
- [x] Garantir que todos os ícones fiquem visíveis
- [x] Todos os 98 testes passando


## Quadrado de Visualização Aprimorado

- [x] Mover quadrado para o meio da tela (ambas as telas)
- [x] Deixar quadrado amarelo (#FFFF00) com borda preta
- [x] Aumentar tamanho do quadrado para 180x180px
- [x] Remover border-radius (quadrado sem cantos arredondados)
- [x] Posicionar display de informações abaixo do quadrado
- [x] Todos os 98 testes passando
