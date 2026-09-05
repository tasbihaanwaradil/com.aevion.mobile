import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack>
        {/* Authentication Screens */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* Dashboard */}
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      </Stack>

      <StatusBar style="auto" />
    </>
  );
}
