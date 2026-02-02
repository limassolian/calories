import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NutritionInfo, DailyGoals } from '../types';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

interface GoalsDashboardProps {
  totals: NutritionInfo;
  goals: DailyGoals;
}

interface ProgressBarProps {
  current: number;
  goal: number;
  color: string;
  label: string;
  icon: string;
  unit?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  goal,
  color,
  label,
  icon,
  unit = '',
}) => {
  const progress = Math.min((current / goal) * 100, 100) / 100;
  const isOver = current > goal;

  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressLabelRow}>
        <View style={styles.progressLabelLeft}>
          <Text style={styles.progressIcon}>{icon}</Text>
          <Text style={styles.progressLabel}>{label}</Text>
        </View>
        <Text style={[styles.progressValue, isOver ? styles.progressValueOver : null]}>
          {current}
          <Text style={styles.progressGoal}> / {goal}{unit}</Text>
        </Text>
      </View>
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            {
              flex: progress,
              backgroundColor: isOver ? colors.error : color,
            },
          ]}
        />
        <View style={{ flex: 1 - progress }} />
      </View>
    </View>
  );
};

const QuickStat: React.FC<{
  icon: string;
  value: number;
  label: string;
  color: string;
}> = ({ icon, value, label, color }) => (
  <View style={styles.quickStat}>
    <Text style={[styles.quickStatIcon, { color }]}>{icon}</Text>
    <Text style={[styles.quickStatValue, { color }]}>{value}</Text>
    <Text style={styles.quickStatLabel}>{label}</Text>
  </View>
);

export const GoalsDashboard: React.FC<GoalsDashboardProps> = ({ totals, goals }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Goals</Text>

      <View style={styles.progressBarsContainer}>
        <ProgressBar
          current={totals.calories}
          goal={goals.calories}
          color={colors.calories}
          label="Calories"
          icon="🔥"
        />
        <ProgressBar
          current={totals.carbs}
          goal={goals.carbs}
          color={colors.carbs}
          label="Carbs"
          icon="🍞"
          unit="g"
        />
        <ProgressBar
          current={totals.protein}
          goal={goals.protein}
          color={colors.protein}
          label="Protein"
          icon="🥩"
          unit="g"
        />
        <ProgressBar
          current={totals.fat}
          goal={goals.fat}
          color={colors.fat}
          label="Fat"
          icon="🧈"
          unit="g"
        />
      </View>

      <View style={styles.quickStatsContainer}>
        <QuickStat
          icon="🔥"
          value={totals.calories}
          label="C"
          color={colors.calories}
        />
        <Text style={styles.quickStatDivider}>•</Text>
        <QuickStat
          icon=""
          value={totals.carbs}
          label="C"
          color={colors.carbs}
        />
        <Text style={styles.quickStatDivider}>•</Text>
        <QuickStat
          icon=""
          value={totals.protein}
          label="P"
          color={colors.protein}
        />
        <Text style={styles.quickStatDivider}>•</Text>
        <QuickStat
          icon=""
          value={totals.fat}
          label="F"
          color={colors.fat}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    margin: spacing.lg,
    
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  progressBarsContainer: {
    marginBottom: spacing.lg,
  },
  progressBarContainer: {
    marginBottom: spacing.md,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressIcon: {
    fontSize: typography.sizes.md,
    marginRight: spacing.sm,
  },
  progressLabel: {
    fontSize: typography.sizes.md,
    fontWeight: '500',
    color: colors.text,
  },
  progressValue: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  progressValueOver: {
    color: colors.error,
  },
  progressGoal: {
    fontWeight: '400',
    color: colors.textSecondary,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
  },
  progressBarFill: {
    height: 8,
    borderRadius: borderRadius.full,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickStatIcon: {
    fontSize: typography.sizes.sm,
    marginRight: spacing.xs,
  },
  quickStatValue: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
  quickStatLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  quickStatDivider: {
    fontSize: typography.sizes.md,
    color: colors.textTertiary,
    marginHorizontal: spacing.md,
  },
});

export default GoalsDashboard;
