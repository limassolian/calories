import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

interface FoodInputProps {
  onSubmit: (text: string) => void;
  remainingCalories: number;
  onVoicePress?: () => void;
  isVoiceActive?: boolean;
}

export const FoodInput: React.FC<FoodInputProps> = ({
  onSubmit,
  remainingCalories,
  onVoicePress,
  isVoiceActive = false,
}) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
      Keyboard.dismiss();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.remainingCaloriesContainer}>
        <Text style={styles.remainingIcon}>🔥</Text>
        <Text style={styles.remainingValue}>{Math.max(0, remainingCalories)}</Text>
        <Text style={styles.remainingLabel}> left</Text>
      </View>

      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="What did you eat?"
          placeholderTextColor={colors.inputPlaceholder}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={false}
        />

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.voiceButton, isVoiceActive && styles.voiceButtonActive]}
            onPress={onVoicePress}
            activeOpacity={0.7}
          >
            {isVoiceActive ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={styles.voiceIcon}>🎙️</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addButton, !text.trim() && styles.addButtonDisabled]}
            onPress={handleSubmit}
            disabled={!text.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.keyboardButton}
            onPress={() => Keyboard.dismiss()}
            activeOpacity={0.7}
          >
            <Text style={styles.keyboardIcon}>⌨️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  remainingCaloriesContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
    paddingLeft: spacing.sm,
  },
  remainingIcon: {
    fontSize: typography.sizes.xl,
    marginRight: spacing.xs,
  },
  remainingValue: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  remainingLabel: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  voiceButtonActive: {
    backgroundColor: colors.primary,
  },
  voiceIcon: {
    fontSize: typography.sizes.lg,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  addButtonDisabled: {
    backgroundColor: colors.primaryLight,
    opacity: 0.5,
  },
  addIcon: {
    fontSize: typography.sizes.xl,
    color: colors.card,
    fontWeight: typography.weights.bold,
  },
  keyboardButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardIcon: {
    fontSize: typography.sizes.lg,
  },
});

export default FoodInput;
