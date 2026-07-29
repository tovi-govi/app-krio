import { Tabs } from "expo-router";
import { Droplets, Info, Package, ShoppingCart } from "lucide-react-native";
import { Colors } from "@/constants/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 16,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Droplets size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: "About",
          tabBarIcon: ({ color, size }) => <Info size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
