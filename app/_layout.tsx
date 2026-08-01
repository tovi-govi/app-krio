import { useEffect } from "react";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

// Keep the splash screen visible until we explicitly hide it below.
// Any rejection here is harmless (e.g. already hidden / unsupported in this
// environment), so we swallow it instead of letting it surface as an
// "Unhandled promise rejection".
SplashScreen.preventAutoHideAsync().catch(() => { });

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

    SplashScreen.hideAsync().catch(() => { });

    const firstSegment = segments[0];
    const isLoginRoute = firstSegment === "login";

    if (!user && !isLoginRoute) {
      router.replace("/login");
      return;
    }

    if (user && isLoginRoute) {
      router.replace(user.role === "delivery" ? "/delivery" : "/admin");
    }
  }, [isLoading, segments, user]);

  return <Stack screenOptions={{ headerShown: false }} />;
}