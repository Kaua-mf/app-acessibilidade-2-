import { describe, it, expect } from 'vitest';
import {
  CAMERA_UNAVAILABLE_NAME,
  INITIALIZING_COLOR_NAME,
  colorReadingLabel,
  describeLightLevel,
  formatValueForSpeech,
  lightReadingLabel,
  optionLabel,
  presetLabel,
} from '../accessibility-labels';
import { UNCERTAIN_COLOR_NAME } from '../color-stabilizer';

describe('formatValueForSpeech', () => {
  it('escreve porcentagem por extenso', () => {
    expect(formatValueForSpeech(50, 'percent')).toBe('50 por cento');
  });

  it('usa singular e plural de pixels', () => {
    expect(formatValueForSpeech(1, 'pixels')).toBe('1 pixel');
    expect(formatValueForSpeech(20, 'pixels')).toBe('20 pixels');
  });

  it('escreve milissegundos por extenso', () => {
    expect(formatValueForSpeech(500, 'milliseconds')).toBe('500 milissegundos');
    expect(formatValueForSpeech(1, 'milliseconds')).toBe('1 milissegundo');
  });

  it('usa vírgula decimal nos multiplicadores', () => {
    expect(formatValueForSpeech(1.1, 'multiplier')).toBe('1,1 vezes');
    expect(formatValueForSpeech(0.6, 'multiplier')).toBe('0,6 vezes');
  });

  it('usa vírgula decimal sem unidade', () => {
    expect(formatValueForSpeech(1.15, 'none')).toBe('1,15');
    expect(formatValueForSpeech(1, 'none')).toBe('1');
  });

  it('nunca devolve ponto decimal nem o símbolo %', () => {
    for (const unit of ['percent', 'pixels', 'milliseconds', 'multiplier', 'none'] as const) {
      const text = formatValueForSpeech(1.5, unit);
      expect(text).not.toContain('.');
      expect(text).not.toContain('%');
    }
  });
});

describe('optionLabel', () => {
  it('junta o nome do ajuste e o valor', () => {
    expect(optionLabel('Sensibilidade de cores', 75, 'percent')).toBe(
      'Sensibilidade de cores: 75 por cento'
    );
    expect(optionLabel('Velocidade da fala', 0.9, 'multiplier')).toBe('Velocidade da fala: 0,9 vezes');
  });
});

describe('presetLabel', () => {
  it('traduz os presets conhecidos, sem emoji', () => {
    expect(presetLabel('interior')).toBe('Interior');
    expect(presetLabel('exterior')).toBe('Exterior');
    expect(presetLabel('low-light')).toBe('Pouca luz');
  });

  it('devolve a própria chave se o preset for desconhecido', () => {
    expect(presetLabel('outro')).toBe('outro');
  });
});

describe('describeLightLevel', () => {
  it('cobre toda a faixa de 0 a 100, em ordem crescente', () => {
    expect(describeLightLevel(0)).toBe('quase sem luz');
    expect(describeLightLevel(9)).toBe('quase sem luz');
    expect(describeLightLevel(10)).toBe('pouca luz');
    expect(describeLightLevel(29)).toBe('pouca luz');
    expect(describeLightLevel(30)).toBe('luz moderada');
    expect(describeLightLevel(54)).toBe('luz moderada');
    expect(describeLightLevel(55)).toBe('bem iluminado');
    expect(describeLightLevel(79)).toBe('bem iluminado');
    expect(describeLightLevel(80)).toBe('muito claro');
    expect(describeLightLevel(100)).toBe('muito claro');
  });

  it('limita valores fora da faixa e trata valores inválidos', () => {
    expect(describeLightLevel(-20)).toBe('quase sem luz');
    expect(describeLightLevel(250)).toBe('muito claro');
    expect(describeLightLevel(NaN)).toBe('quase sem luz');
  });
});

describe('lightReadingLabel', () => {
  it('descreve o nível com número e palavras', () => {
    expect(lightReadingLabel(42)).toBe('Intensidade de luz: 42 por cento, luz moderada');
  });

  it('arredonda valores quebrados', () => {
    expect(lightReadingLabel(41.6)).toBe('Intensidade de luz: 42 por cento, luz moderada');
  });

  it('avisa quando a câmera falhou, sem falar um número desatualizado', () => {
    const label = lightReadingLabel(42, true);
    expect(label).toContain(CAMERA_UNAVAILABLE_NAME);
    expect(label).not.toContain('42');
  });
});

describe('colorReadingLabel', () => {
  it('fala o nome da cor e a confiança por extenso', () => {
    expect(colorReadingLabel('Vermelho', 90)).toBe('Cor detectada: Vermelho. Confiança de 90 por cento');
  });

  it('descreve o estado de inicialização', () => {
    expect(colorReadingLabel(INITIALIZING_COLOR_NAME, 0)).toBe('Inicializando a leitura de cores');
  });

  it('descreve falha de câmera', () => {
    expect(colorReadingLabel(CAMERA_UNAVAILABLE_NAME, 0)).toContain('Câmera indisponível');
  });

  it('orienta o usuário quando a cor é incerta', () => {
    const label = colorReadingLabel(UNCERTAIN_COLOR_NAME, 40);
    expect(label).toContain('Cor incerta');
    expect(label).toContain('iluminação');
  });

  it('nunca contém emoji nem reticências do texto de tela', () => {
    for (const text of [
      colorReadingLabel(INITIALIZING_COLOR_NAME, 0),
      colorReadingLabel('Azul', 77),
      lightReadingLabel(10),
    ]) {
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(text).not.toContain('...');
    }
  });
});
