import { useTheme } from '@/context/ThemeProvider';

import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = React.PropsWithChildren<{
  style?: ViewStyle;
  forceResolved?: 'light' | 'dark';
}>;

export default function Screen({ children, style, forceResolved }: Props) {
  const { resolved, colors } = useTheme();
  const r = forceResolved ?? resolved;

  const barStyle = r === 'dark' ? 'light' : 'dark';
  const bg = r === 'dark' ? '#0b0b0c' : '#ffffff';



  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar style={barStyle} backgroundColor={bg} />
      <View style={[{ flex: 1, backgroundColor: forceResolved ? bg : colors.background }, style]}>{children}</View>
    </SafeAreaView>
  );
}
