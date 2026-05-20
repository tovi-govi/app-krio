import { useEffect } from "react";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

export const unstable_settings = {
  initialRouteName: "login",
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </CartProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0];
    const isLoginRoute = firstSegment === "login";

    if (!user && !isLoginRoute) {
      router.replace("/login");
      return;
    }

    if (user && isLoginRoute) {
      router.replace(user.role === "admin" ? "/admin" : "/(tabs)");
    }
  }, [isLoading, segments, user]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
