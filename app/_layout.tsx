import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import SuspendedScreen from "@/components/SuspendedScreen";

// FLAG TO CONTROL APP SUSPENSION. SET TO false TO RESTORE APP ACCESS.
const IS_APP_SUSPENDED = false;

if (Platform.OS !== "web") {
  try {
    SplashScreen.preventAutoHideAsync().catch(() => { });
  } catch (e) {
    // Ignore web/unlinked native module errors
  }
}

export const unstable_settings = {
  initialRouteName: "login",
};

export default function RootLayout() {
  if (IS_APP_SUSPENDED) {
    return (
      <>
        <StatusBar style="light" />
        <SuspendedScreen />
      </>
    );
  }

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
  const isInitialLaunch = useRef(true);

  useEffect(() => {
    if (isLoading) return;

    if (Platform.OS !== "web") {
      try {
        SplashScreen.hideAsync().catch(() => { });
      } catch (e) {
        // Ignore web/unlinked native module errors
      }
    }

    const firstSegment = segments[0];
    const isLoginRoute = firstSegment === "login";

    if (!user) {
      if (!isLoginRoute) {
        router.replace("/login");
      }
      return;
    }

    // On fresh app open, always reset navigation to primary home dashboard
    if (isInitialLaunch.current) {
      isInitialLaunch.current = false;
      const targetRoute = user.role === "delivery" ? "/delivery" : "/admin";
      router.replace(targetRoute);
      return;
    }

    if (user && isLoginRoute) {
      router.replace(user.role === "delivery" ? "/delivery" : "/admin");
    }
  }, [isLoading, segments, user]);

  return <Stack screenOptions={{ headerShown: false }} />;
}