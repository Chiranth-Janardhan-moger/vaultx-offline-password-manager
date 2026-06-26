import { useTheme } from "@/context/ThemeProvider";
import { vaultExists } from "@/lib/vault";
import { useRouter } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

// Keep the splash screen visible while we check vault status
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();
  const [isReady, setIsReady] = React.useState(false);

  // Check if vault exists on mount and redirect accordingly
  React.useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        const exists = await vaultExists();
        if (exists) {
          router.replace('/login');
        } else {
          router.replace('/onboarding');
        }
      } catch (error) {
        console.error('Error checking vault:', error);
        router.replace('/onboarding');
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    };
    checkAndRedirect();
  }, [router]);

  // Show loading indicator while checking
  if (!isReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // This should never be reached as we redirect immediately
  return null;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
