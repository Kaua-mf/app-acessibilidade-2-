import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Informa se um leitor de tela (TalkBack/VoiceOver) está ligado, e atualiza
 * sozinho se a pessoa ligar ou desligar durante o uso do app.
 */
export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (active) setEnabled(value);
      })
      .catch(() => {
        // Sem a informação, assumimos que não há leitor de tela
      });

    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}
