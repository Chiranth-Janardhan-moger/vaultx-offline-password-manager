import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { analyzePasswordHealth, type HealthEntry } from '@/lib/password-health';
import { getServiceColor, getServiceIcon } from '@/lib/service-icons';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PasswordHealthScreen() {
  const router = useRouter();
  const { unlocked, vault, activeWorkspace } = useSession();
  const { colors, resolved } = useTheme();

  React.useEffect(() => {
    if (!unlocked) {
      router.replace('/login');
    }
  }, [unlocked, router]);

  const report = React.useMemo(
    () => analyzePasswordHealth(vault?.passwords, activeWorkspace || 'Personal'),
    [vault?.passwords, activeWorkspace]
  );

  const renderAccountRow = (entry: HealthEntry, subtitle: string, accentColor: string) => {
    const iconName = getServiceIcon(entry.item.service);
    const serviceColor = getServiceColor(entry.item.service, resolved === 'dark');
    return (
      <TouchableOpacity
        key={`${entry.globalIndex}-${subtitle}`}
        style={[
          styles.rowCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            borderWidth: colors.cardBorderWidth,
          },
        ]}
        onPress={() => router.push(`/edit/${entry.globalIndex}` as any)}
        activeOpacity={0.75}
      >
        <View style={[styles.badge, { backgroundColor: serviceColor + '18' }]}>
          <Ionicons name={iconName as any} size={18} color={serviceColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
            {entry.item.service}
          </Text>
          <Text style={[styles.rowSub, { color: colors.mutedText }]} numberOfLines={1}>
            {entry.item.username || 'No username'}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: accentColor + '18' }]}>
          <Text style={[styles.statusPillText, { color: accentColor }]}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedText} />
      </TouchableOpacity>
    );
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Password Health</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Summary Grid */}
          <View style={styles.summaryRow}>
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  borderWidth: colors.cardBorderWidth,
                },
              ]}
            >
              <Text style={[styles.summaryNum, { color: report.weakItems.length > 0 ? '#ef4444' : '#30D158' }]}>
                {report.weakItems.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>Weak</Text>
            </View>
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  borderWidth: colors.cardBorderWidth,
                },
              ]}
            >
              <Text style={[styles.summaryNum, { color: report.reusedAccountCount > 0 ? '#f59e0b' : '#30D158' }]}>
                {report.reusedAccountCount}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>Reused</Text>
            </View>
          </View>

          {report.totalChecked === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="shield-checkmark-outline" size={44} color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Passwords to Audit</Text>
              <Text style={[styles.emptySub, { color: colors.mutedText }]}>
                Add accounts to analyze password strength and reuse offline.
              </Text>
            </View>
          ) : (
            <>
              {report.weakItems.length > 0 && (
                <>
                  <Text style={[styles.sectionHeader, { color: colors.mutedText }]}>WEAK PASSWORDS</Text>
                  <View style={styles.listGap}>
                    {report.weakItems.map((entry) => renderAccountRow(entry, 'Weak', '#ef4444'))}
                  </View>
                </>
              )}

              {report.reusedGroups.length > 0 && (
                <>
                  <Text style={[styles.sectionHeader, { color: colors.mutedText }]}>REUSED PASSWORDS</Text>
                  <View style={styles.listGap}>
                    {report.reusedGroups.flatMap((group) =>
                      group.entries.map((entry) =>
                        renderAccountRow(entry, `Used ${group.entries.length}x`, '#f59e0b')
                      )
                    )}
                  </View>
                </>
              )}

              {report.weakItems.length === 0 &&
                report.reusedGroups.length === 0 && (
                  <View style={styles.emptyBox}>
                    <Ionicons name="checkmark-circle-outline" size={48} color="#30D158" />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>All Clear</Text>
                    <Text style={[styles.emptySub, { color: colors.mutedText }]}>
                      All {report.totalChecked} accounts use strong, unique passwords.
                    </Text>
                  </View>
                )}
            </>
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 0 },
    }),
  },
  summaryNum: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  listGap: {
    gap: 8,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    gap: 12,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
