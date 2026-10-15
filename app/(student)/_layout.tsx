import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label, Badge } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { Colors } from "@/constants/colors";

function NativeStudentTabs() {
  const { currentUser, getUnreadCount } = useApp();
  const unread = currentUser ? getUnreadCount(currentUser.id) : 0;
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="subjects">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>Subjects</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tests">
        <Icon sf={{ default: "pencil.and.list.clipboard", selected: "pencil.and.list.clipboard" }} />
        <Label>Tests</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <Icon sf={{ default: "bell", selected: "bell.fill" }} />
        <Label>Alerts</Label>
        {unread > 0 && <Badge>{String(unread)}</Badge>}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicStudentTabs() {
  const { currentUser, getUnreadCount } = useApp();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const unread = currentUser ? getUnreadCount(currentUser.id) : 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : isDark ? "#000" : "#fff",
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: Colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#000" : "#fff" }]} />
          ) : null,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} /> }} />
      <Tabs.Screen name="subjects" options={{ title: "Subjects", tabBarIcon: ({ color }) => <Ionicons name="book" size={24} color={color} /> }} />
      <Tabs.Screen name="tests" options={{ title: "Tests", tabBarIcon: ({ color }) => <Ionicons name="pencil" size={24} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts", tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: ({ color }) => <Ionicons name="notifications" size={24} color={color} /> }} />
    </Tabs>
  );
}

export default function StudentLayout() {
  if (isLiquidGlassAvailable()) return <NativeStudentTabs />;
  return <ClassicStudentTabs />;
}
