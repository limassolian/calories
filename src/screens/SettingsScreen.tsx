import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCalories } from '../context/CaloriesContext';
import { DailyGoals } from '../types';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

interface GoalInputProps {
  label: string;
  value: number;
  unit: string;
  icon: string;
  color: string;
  onChange: (value: number) => void;
}

const GoalInput: React.FC<GoalInputProps> = ({
  label,
  value,
  unit,
  icon,
  color,
  onChange,
}) => {
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleBlur = () => {
    const numValue = parseInt(inputValue, 10) || 0;
    onChange(numValue);
    setInputValue(String(numValue));
  };

  return (
    <View style={styles.goalInputContainer}>
      <View style={styles.goalInputLeft}>
        <View style={[styles.goalIconContainer, { backgroundColor: color + '20' }]}>
          <Text style={styles.goalIcon}>{icon}</Text>
        </View>
        <View>
          <Text style={styles.goalLabel}>{label}</Text>
          <Text style={styles.goalUnit}>Daily target in {unit}</Text>
        </View>
      </View>
      <TextInput
        style={[styles.goalInput, { borderColor: color }]}
        value={inputValue}
        onChangeText={setInputValue}
        onBlur={handleBlur}
        keyboardType="numeric"
        selectTextOnFocus
      />
    </View>
  );
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { goals, setGoals } = useCalories();
  const [localGoals, setLocalGoals] = useState<DailyGoals>(goals);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalGoals(goals);
  }, [goals]);

  const updateGoal = (key: keyof DailyGoals, value: number) => {
    setLocalGoals((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await setGoals(localGoals);
    setHasChanges(false);
    Alert.alert('Success', 'Your goals have been updated!');
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Goals',
      'This will reset your goals to default values. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultGoals: DailyGoals = {
              calories: 2000,
              protein: 120,
              carbs: 250,
              fat: 65,
            };
            setLocalGoals(defaultGoals);
            setGoals(defaultGoals);
            setHasChanges(false);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Goals</Text>
            <Text style={styles.sectionSubtitle}>
              Set your personalized nutrition targets
            </Text>

            <View style={styles.goalsCard}>
              <GoalInput
                label="Calories"
                value={localGoals.calories}
                unit="calories"
                icon="🔥"
                color={colors.calories}
                onChange={(v) => updateGoal('calories', v)}
              />

              <View style={styles.divider} />

              <GoalInput
                label="Protein"
                value={localGoals.protein}
                unit="grams"
                icon="🥩"
                color={colors.protein}
                onChange={(v) => updateGoal('protein', v)}
              />

              <View style={styles.divider} />

              <GoalInput
                label="Carbohydrates"
                value={localGoals.carbs}
                unit="grams"
                icon="🍞"
                color={colors.carbs}
                onChange={(v) => updateGoal('carbs', v)}
              />

              <View style={styles.divider} />

              <GoalInput
                label="Fat"
                value={localGoals.fat}
                unit="grams"
                icon="🧈"
                color={colors.fat}
                onChange={(v) => updateGoal('fat', v)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.aboutCard}>
              <Text style={styles.appName}>Calories App</Text>
              <Text style={styles.appVersion}>Version 1.0.0</Text>
              <Text style={styles.appDescription}>
                Track your calories naturally, like writing in a notebook.
                Powered by AI to analyze your food and provide accurate
                nutrition information.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
          >
            <Text style={styles.resetButtonText}>Reset to Default Goals</Text>
          </TouchableOpacity>
        </ScrollView>

        {hasChanges && (
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    
  },
  backIcon: {
    fontSize: typography.sizes.xl,
    color: colors.text,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.text,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  goalsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    
  },
  goalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  goalInputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  goalIcon: {
    fontSize: typography.sizes.xl,
  },
  goalLabel: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  goalUnit: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  goalInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
    width: 90,
    textAlign: 'center',
    borderWidth: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  aboutCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    
  },
  appName: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  appVersion: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  appDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.xxxl,
  },
  resetButtonText: {
    fontSize: typography.sizes.md,
    color: colors.error,
    fontWeight: '500',
  },
  saveButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    
  },
  saveButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.card,
  },
});

export default SettingsScreen;
