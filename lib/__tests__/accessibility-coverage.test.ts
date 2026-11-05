/**
 * Garante que as telas continuem acessíveis para leitores de tela (TalkBack/VoiceOver).
 *
 * Lê o código-fonte das telas e confere, para cada <Pressable>:
 *  - tem accessibilityRole (o leitor de tela diz "botão", "interruptor", "opção"...);
 *  - tem accessibilityLabel (sem ele, um botão só com emoji vira "lâmpada" ou "alto-falante");
 *  - o rótulo não tem emoji;
 *  - opções (radio) e interruptores (switch) informam o estado (selecionado/ligado).
 *
 * Se alguém criar um botão novo sem esses dados, este teste falha e aponta a linha.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(__dirname, '../..') + path.sep;

const SCREENS = [
  'app/(tabs)/index.tsx',
  'app/(tabs)/light-detection.tsx',
  'app/(tabs)/calibration.tsx',
  'app/color-detection.tsx',
];

interface Problem {
  line: number;
  message: string;
}

function auditSource(fileName: string, source: string): { pressables: number; problems: Problem[] } {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const problems: Problem[] = [];
  let pressables = 0;

  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText(sourceFile) === 'Pressable') {
        pressables++;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        const props = new Map<string, ts.JsxAttribute>();
        for (const attribute of node.attributes.properties) {
          if (ts.isJsxAttribute(attribute)) props.set(attribute.name.getText(sourceFile), attribute);
        }

        const literal = (name: string): string | undefined => {
          const initializer = props.get(name)?.initializer;
          return initializer && ts.isStringLiteral(initializer) ? initializer.text : undefined;
        };

        if (!props.has('accessibilityRole')) {
          problems.push({ line, message: 'Pressable sem accessibilityRole' });
        }
        if (!props.has('accessibilityLabel')) {
          problems.push({ line, message: 'Pressable sem accessibilityLabel' });
        }

        const label = literal('accessibilityLabel');
        if (label !== undefined && /\p{Extended_Pictographic}/u.test(label)) {
          problems.push({ line, message: `accessibilityLabel com emoji: "${label}"` });
        }

        const role = literal('accessibilityRole');
        if ((role === 'radio' || role === 'switch') && !props.has('accessibilityState')) {
          problems.push({ line, message: `Pressable com papel "${role}" sem accessibilityState` });
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return { pressables, problems };
}

describe('Acessibilidade das telas', () => {
  describe('auditoria (o teste de verdade detecta problemas)', () => {
    it('aponta botão sem papel nem rótulo', () => {
      const { pressables, problems } = auditSource('x.tsx', '<Pressable onPress={f}><Text>💡</Text></Pressable>');
      expect(pressables).toBe(1);
      expect(problems.map((p) => p.message)).toEqual([
        'Pressable sem accessibilityRole',
        'Pressable sem accessibilityLabel',
      ]);
    });

    it('aponta rótulo com emoji', () => {
      const { problems } = auditSource(
        'x.tsx',
        '<Pressable accessibilityRole="button" accessibilityLabel="🔊 Som" />'
      );
      expect(problems).toHaveLength(1);
      expect(problems[0].message).toContain('emoji');
    });

    it('aponta radio e switch sem estado', () => {
      const radio = auditSource('x.tsx', '<Pressable accessibilityRole="radio" accessibilityLabel="A" />');
      const toggle = auditSource('x.tsx', '<Pressable accessibilityRole="switch" accessibilityLabel="B" />');
      expect(radio.problems).toHaveLength(1);
      expect(toggle.problems).toHaveLength(1);
    });

    it('aceita botão completo', () => {
      const { problems } = auditSource(
        'x.tsx',
        '<Pressable accessibilityRole="switch" accessibilityLabel="Apito" accessibilityState={{ checked: true }} />'
      );
      expect(problems).toEqual([]);
    });
  });

  describe.each(SCREENS)('%s', (screen) => {
    const { pressables, problems } = auditSource(screen, fs.readFileSync(ROOT + screen, 'utf-8'));

    it('tem botões para auditar', () => {
      expect(pressables).toBeGreaterThan(0);
    });

    it('todos os botões têm papel, rótulo e estado quando necessário', () => {
      const report = problems.map((p) => `linha ${p.line}: ${p.message}`);
      expect(report).toEqual([]);
    });
  });
});
