import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FoodEntry, NutritionInfo } from '../types';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

interface NutritionDetailsModalProps {
  entry: FoodEntry | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<FoodEntry>) => void;
  onDelete: (id: string) => void;
}

const MacroRow: React.FC<{
  label: string;
  value: number;
  unit: string;
  color: string;
  icon: string;
}> = ({ label, value, unit, color, icon }) => (
  <View style={styles.macroRow}>
    <View style={styles.macroLabelContainer}>
      <Text style={styles.macroIcon}>{icon}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
    <Text style={[styles.macroValue, { color }]}>
      {value}
      <Text style={styles.macroUnit}>{unit}</Text>
    </Text>
  </View>
);

const SourceBadge: React.FC<{ name: string; icon?: string }> = ({ name, icon }) => {
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
    <View style={[styles.sourceBadge, { backgroundColor: getIconColor() + '15' }]}>
      <View style={[styles.sourceDot, { backgroundColor: getIconColor() }]} />
      <Text style={[styles.sourceName, { color: getIconColor() }]}>{name}</Text>
    </View>
  );
};

export const NutritionDetailsModal: React.FC<NutritionDetailsModalProps> = ({
  entry,
  visible,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNutrition, setEditedNutrition] = useState<NutritionInfo | null>(null);

  if (!entry) return null;

  const { description, nutrition, sources, aiThoughtProcess, status } = entry;

  const handleStartEdit = () => {
    setEditedNutrition(nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editedNutrition) {
      onUpdate(entry.id, { nutrition: editedNutrition, status: 'complete' });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedNutrition(null);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(entry.id);
    onClose();
  };

  const updateNutritionField = (field: keyof NutritionInfo, value: string) => {
    if (editedNutrition) {
      setEditedNutrition({
        ...editedNutrition,
        [field]: parseInt(value, 10) || 0,
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Nutrition Details</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={handleDelete}
              >
                <Text style={styles.menuIcon}>🗑️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.foodDescription}>{description}</Text>

            {status === 'thinking' ? (
              <View style={styles.thinkingContainer}>
                <Text style={styles.thinkingText}>Analyzing nutrition...</Text>
              </View>
            ) : nutrition && !isEditing ? (
              <>
                <View style={styles.caloriesCard}>
                  <Text style={styles.caloriesIcon}>🔥</Text>
                  <Text style={styles.caloriesValue}>{nutrition.calories}</Text>
                  <Text style={styles.caloriesLabel}>total calories</Text>
                </View>

                <View style={styles.macrosContainer}>
                  <MacroRow
                    label="Protein"
                    value={nutrition.protein}
                    unit="g"
                    color={colors.protein}
                    icon="🥩"
                  />
                  <MacroRow
                    label="Carbs"
                    value={nutrition.carbs}
                    unit="g"
                    color={colors.carbs}
                    icon="🍞"
                  />
                  <MacroRow
                    label="Fat"
                    value={nutrition.fat}
                    unit="g"
                    color={colors.fat}
                    icon="🧈"
                  />
                </View>
              </>
            ) : isEditing && editedNutrition ? (
              <View style={styles.editContainer}>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Calories</Text>
                  <TextInput
                    style={styles.editInput}
                    value={String(editedNutrition.calories)}
                    onChangeText={(v) => updateNutritionField('calories', v)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Protein (g)</Text>
                  <TextInput
                    style={styles.editInput}
                    value={String(editedNutrition.protein)}
                    onChangeText={(v) => updateNutritionField('protein', v)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Carbs (g)</Text>
                  <TextInput
                    style={styles.editInput}
                    value={String(editedNutrition.carbs)}
                    onChangeText={(v) => updateNutritionField('carbs', v)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Fat (g)</Text>
                  <TextInput
                    style={styles.editInput}
                    value={String(editedNutrition.fat)}
                    onChangeText={(v) => updateNutritionField('fat', v)}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.editButtonsContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelEdit}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveEdit}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {sources.length > 0 && !isEditing && (
              <View style={styles.sourcesSection}>
                <Text style={styles.sectionLabel}>
                  Found {sources.length} source{sources.length > 1 ? 's' : ''}
                </Text>
                <View style={styles.sourcesRow}>
                  {sources.map((source, index) => (
                    <SourceBadge
                      key={index}
                      name={source.name}
                      icon={source.icon}
                    />
                  ))}
                </View>
              </View>
            )}

            {aiThoughtProcess && !isEditing && (
              <View style={styles.thoughtProcessSection}>
                <Text style={styles.sectionLabel}>AI's thought process</Text>
                <View style={styles.thoughtProcessCard}>
                  <Text style={styles.thoughtProcessIcon}>🤔</Text>
                  <Text style={styles.thoughtProcessText}>{aiThoughtProcess}</Text>
                </View>
              </View>
            )}

            {!isEditing && (
              <TouchableOpacity
                style={styles.editLink}
                onPress={handleStartEdit}
              >
                <Text style={styles.editLinkIcon}>✏️</Text>
                <Text style={styles.editLinkText}>Something off? Click to edit</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  menuIcon: {
    fontSize: typography.sizes.lg,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.lg,
  },
  foodDescription: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: 28,
  },
  thinkingContainer: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  thinkingText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  caloriesCard: {
    backgroundColor: colors.caloriesLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  caloriesIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.calories,
  },
  caloriesLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  macrosContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  macroLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroIcon: {
    fontSize: typography.sizes.lg,
    marginRight: spacing.sm,
  },
  macroLabel: {
    fontSize: typography.sizes.md,
    color: colors.text,
    fontWeight: '500',
  },
  macroValue: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
  },
  macroUnit: {
    fontSize: typography.sizes.sm,
    fontWeight: '400',
  },
  sourcesSection: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  sourcesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  sourceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  sourceName: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  thoughtProcessSection: {
    marginBottom: spacing.lg,
  },
  thoughtProcessCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
  },
  thoughtProcessIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  thoughtProcessText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text,
    lineHeight: 20,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },
  editLinkIcon: {
    fontSize: typography.sizes.md,
    marginRight: spacing.sm,
  },
  editLinkText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  editContainer: {
    marginBottom: spacing.lg,
  },
  editRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editLabel: {
    fontSize: typography.sizes.md,
    color: colors.text,
    fontWeight: '500',
  },
  editInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.text,
    width: 100,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: colors.border,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginRight: spacing.md,
  },
  cancelButtonText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  saveButtonText: {
    fontSize: typography.sizes.md,
    color: colors.card,
    fontWeight: '600',
  },
});

export default NutritionDetailsModal;
