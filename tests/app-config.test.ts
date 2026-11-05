import { describe, it, expect } from "vitest";
import config from "../app.config";

type PluginEntry = string | [string, Record<string, unknown>];

const plugins = (config.plugins ?? []) as PluginEntry[];

function pluginName(entry: PluginEntry): string {
  return typeof entry === "string" ? entry : entry[0];
}

function pluginOptions(name: string): Record<string, unknown> | undefined {
  const entry = plugins.find((p) => pluginName(p) === name);
  if (!entry) return undefined;
  return typeof entry === "string" ? {} : entry[1];
}

describe("app.config: permissões", () => {
  describe("câmera", () => {
    it("deve usar o plugin expo-camera (o iOS exige o texto de uso da câmera)", () => {
      expect(pluginOptions("expo-camera")).toBeDefined();
    });

    it("deve explicar em português para que a câmera é usada", () => {
      const text = pluginOptions("expo-camera")?.cameraPermission as string;
      expect(typeof text).toBe("string");
      expect(text).toContain("câmera");
      expect(text).toContain("$(PRODUCT_NAME)");
      // Texto padrão em inglês significa que alguém esqueceu de traduzir
      expect(text).not.toContain("Allow");
    });

    it("deve dizer que as imagens não são salvas nem enviadas", () => {
      const text = pluginOptions("expo-camera")?.cameraPermission as string;
      expect(text).toContain("não são salvas nem enviadas");
    });

    it("não deve pedir gravação de áudio no Android", () => {
      expect(pluginOptions("expo-camera")?.recordAudioAndroid).toBe(false);
    });
  });

  describe("áudio", () => {
    it("deve usar o expo-audio sem microfone, sem gravação e sem reprodução em segundo plano", () => {
      const options = pluginOptions("expo-audio");
      expect(options).toBeDefined();
      expect(options?.microphonePermission).toBe(false);
      expect(options?.recordAudioAndroid).toBe(false);
      expect(options?.enableBackgroundPlayback).toBe(false);
      expect(options?.enableBackgroundRecording).toBe(false);
    });
  });

  describe("Android", () => {
    const android = config.android as {
      permissions?: string[];
      blockedPermissions?: string[];
    };

    it("deve bloquear o microfone e as notificações, que o app não usa", () => {
      expect(android.blockedPermissions).toContain("android.permission.RECORD_AUDIO");
      expect(android.blockedPermissions).toContain("android.permission.POST_NOTIFICATIONS");
    });

    it("não deve pedir notificações em android.permissions", () => {
      const requested = android.permissions ?? [];
      expect(requested.includes("POST_NOTIFICATIONS")).toBe(false);
      expect(requested.includes("android.permission.POST_NOTIFICATIONS")).toBe(false);
    });

    it("deve usar nomes completos (android.permission.X) nas permissões bloqueadas", () => {
      for (const permission of android.blockedPermissions ?? []) {
        expect(permission.startsWith("android.permission.")).toBe(true);
      }
    });

    it("não deve bloquear a câmera nem a vibração, que o app usa", () => {
      const blocked = android.blockedPermissions ?? [];
      expect(blocked.includes("android.permission.CAMERA")).toBe(false);
      expect(blocked.includes("android.permission.VIBRATE")).toBe(false);
    });
  });

  describe("plugins que o app não usa", () => {
    it("não deve incluir o plugin expo-video (reprodução em segundo plano e picture-in-picture)", () => {
      expect(pluginOptions("expo-video")).toBeUndefined();
    });

    it("não deve incluir o plugin expo-notifications", () => {
      expect(pluginOptions("expo-notifications")).toBeUndefined();
    });

    it("não deve repetir plugins", () => {
      const names = plugins.map(pluginName);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe("iOS", () => {
    const ios = config.ios as { infoPlist?: Record<string, unknown> };

    it("deve manter a declaração de criptografia isenta", () => {
      expect(ios.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
    });

    it("deve declarar o português do Brasil para o aviso de permissão sair em português", () => {
      expect(ios.infoPlist?.CFBundleDevelopmentRegion).toBe("pt-BR");
      expect(ios.infoPlist?.CFBundleLocalizations).toEqual(["pt-BR"]);
    });
  });
});
