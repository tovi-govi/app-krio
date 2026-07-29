import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

// Global unhandled promise rejection handler
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("unhandledrejection", (event) => {
    console.warn("[App] Suppressed unhandled promise rejection:", event.reason);
    if (event.preventDefault) event.preventDefault();
  });
}

// Guard against SplashModule missing internal native methods on Web / Expo Go
try {
  SplashScreen.preventAutoHideAsync().catch(() => {});
} catch {
  // Ignore splash screen errors in unsupported environments
}

if (typeof globalThis !== "undefined") {
  const expoModules = (globalThis as any).ExpoModules;
  if (expoModules?.ExpoSplashScreen) {
    if (typeof expoModules.ExpoSplashScreen.internalMaybeHideAsync !== "function") {
      expoModules.ExpoSplashScreen.internalMaybeHideAsync = async () => false;
    }
    if (typeof expoModules.ExpoSplashScreen.internalPreventAutoHideAsync !== "function") {
      expoModules.ExpoSplashScreen.internalPreventAutoHideAsync = async () => false;
    }
  }
}

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

    SplashScreen.hideAsync().catch(() => {});

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
