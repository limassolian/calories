import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

interface HeaderProps {
  title: string;
  remainingCalories: number;
  onSettingsPress: () => void;
  onTitlePress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  remainingCalories,
  onSettingsPress,
  onTitlePress,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={onTitlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>{title}</Text>
      </TouchableOpacity>

      <View style={styles.rightSection}>
        <View style={styles.caloriesContainer}>
          <Text style={styles.caloriesIcon}>🔥</Text>
          <Text style={styles.caloriesValue}>{remainingCalories}</Text>
        </View>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={onSettingsPress}
          activeOpacity={0.7}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.xl,
  },
  dateButton: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caloriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    ...shadows.sm,
  },
  caloriesIcon: {
    fontSize: typography.sizes.md,
    marginRight: spacing.xs,
  },
  caloriesValue: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  settingsButton: {
    backgroundColor: colors.card,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  settingsIcon: {
    fontSize: typography.sizes.lg,
  },
});

export default Header;
