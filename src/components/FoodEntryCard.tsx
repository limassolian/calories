import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { FoodEntry } from '../types';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

interface FoodEntryCardProps {
  entry: FoodEntry;
  onPress: () => void;
}

const SourceIcon: React.FC<{ icon?: string }> = ({ icon }) => {
  const getIconContent = () => {
    switch (icon) {
      case 'usda':
        return 'U';
      case 'nutritionix':
        return 'N';
      case 'restaurant':
        return 'R';
      case 'brand':
        return 'B';
      case 'ai':
        return 'AI';
      default:
        return '?';
    }
  };

  const getIconColor = () => {
    switch (icon) {
      case 'usda':
        return '#2E7D32';
      case 'nutritionix':
        return '#FF6B00';
      case 'restaurant':
        return '#E91E63';
      case 'brand':
        return '#9C27B0';
      case 'ai':
        return '#2196F3';
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={[styles.sourceIcon, { backgroundColor: getIconColor() + '20' }]}>
      <Text style={[styles.sourceIconText, { color: getIconColor() }]}>
        {getIconContent()}
      </Text>
    </View>
  );
};

export const FoodEntryCard: React.FC<FoodEntryCardProps> = ({ entry, onPress }) => {
  const { description, nutrition, status, sources } = entry;

  const renderStatus = () => {
    if (status === 'thinking') {
      return (
        <View style={styles.thinkingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.thinkingText}>Thinking</Text>
        </View>
      );
    }

    if (status === 'error') {
      return (
        <Text style={styles.errorText}>Error</Text>
      );
    }

    if (nutrition) {
      return (
        <View style={styles.nutritionContainer}>
          <View style={styles.caloriesContainer}>
            <Text style={styles.caloriesIcon}>🔥</Text>
            <Text style={styles.caloriesValue}>{nutrition.calories}</Text>
            <Text style={styles.caloriesUnit}>cal</Text>
          </View>
          {sources.length > 0 && (
            <View style={styles.sourcesRow}>
              {sources.slice(0, 3).map((source, index) => (
                <SourceIcon key={index} icon={source.icon} />
              ))}
              {sources.length > 3 && (
                <Text style={styles.moreSourcesText}>+{sources.length - 3}</Text>
              )}
            </View>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
        {renderStatus()}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  description: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: '500',
    color: colors.text,
    marginRight: spacing.md,
    lineHeight: 22,
  },
  nutritionContainer: {
    alignItems: 'flex-end',
  },
  caloriesContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  caloriesIcon: {
    fontSize: typography.sizes.sm,
    marginRight: spacing.xs,
  },
  caloriesValue: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
  },
  caloriesUnit: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  sourcesRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  sourceIcon: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  sourceIconText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
  },
  moreSourcesText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thinkingText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    fontWeight: '500',
  },
});

export default FoodEntryCard;
