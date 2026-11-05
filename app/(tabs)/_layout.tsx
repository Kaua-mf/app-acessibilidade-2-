import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { Platform } from "react-native";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 8 : Math.max(insets.bottom, 4);
  const tabBarHeight = 48 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: "#FFFF00",
        tabBarInactiveTintColor: "#666666",
        tabBarStyle: {
          position: 'absolute',
          bottom: 16,
          left: 0,
          right: 0,
          paddingTop: 4,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: '#000000',
          borderTopColor: '#FFFF00',
          borderTopWidth: 4,
          borderBottomColor: '#000000',
          borderBottomWidth: 0,
        },
      }}
    >
      {/* Home sem botão na bandeja inferior (apenas 3 itens visíveis) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarAccessibilityLabel: "Início",
          tabBarIcon: () => null,
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="color-detection"
        options={{
          title: "Cores",
          tabBarAccessibilityLabel: "Identificação de cores",
          tabBarIcon: () => <Text style={{ fontSize: 28, lineHeight: 28 }}>🎨</Text>,
        }}
      />
      <Tabs.Screen
        name="light-detection"
        options={{
          title: "Luz",
          tabBarAccessibilityLabel: "Detecção de luz",
          tabBarIcon: () => <Text style={{ fontSize: 28, lineHeight: 28 }}>💡</Text>,
        }}
      />
      <Tabs.Screen
        name="calibration"
        options={{
          title: "Configurações",
          tabBarAccessibilityLabel: "Configurações",
          tabBarIcon: () => <Text style={{ fontSize: 28, lineHeight: 28 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
