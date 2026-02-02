import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Simple types
interface FoodEntry {
  id: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const DEFAULT_GOALS: Goals = {
  calories: 2000,
  protein: 120,
  carbs: 250,
  fat: 65,
};

// Simple food estimator (mock AI)
const estimateNutrition = (description: string): Omit<FoodEntry, 'id' | 'description'> => {
  const lower = description.toLowerCase();

  if (lower.includes('burger')) {
    return { calories: 540, protein: 25, carbs: 45, fat: 29 };
  }
  if (lower.includes('ramen') || lower.includes('noodle')) {
    return { calories: 450, protein: 12, carbs: 65, fat: 15 };
  }
  if (lower.includes('salad')) {
    return { calories: 250, protein: 15, carbs: 20, fat: 12 };
  }
  if (lower.includes('pizza')) {
    return { calories: 285, protein: 12, carbs: 36, fat: 10 };
  }
  if (lower.includes('chicken')) {
    return { calories: 335, protein: 38, carbs: 0, fat: 8 };
  }

  // Default estimate
  return { calories: 300, protein: 15, carbs: 35, fat: 12 };
};

export default function App() {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const goals = DEFAULT_GOALS;

  const totals = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + entry.protein,
      carbs: acc.carbs + entry.carbs,
      fat: acc.fat + entry.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const remainingCalories = goals.calories - totals.calories;

  const addEntry = useCallback(() => {
    if (!inputText.trim()) return;

    const nutrition = estimateNutrition(inputText);
    const newEntry: FoodEntry = {
      id: Date.now().toString(),
      description: inputText.trim(),
      ...nutrition,
    };

    setEntries(prev => [newEntry, ...prev]);
    setInputText('');
    Keyboard.dismiss();
  }, [inputText]);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const renderProgressBar = (label: string, current: number, goal: number, color: string) => {
    const progress = Math.min(current / goal, 1);
    const isOver = current > goal;

    return (
      <View style={styles.progressItem}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={[styles.progressValue, isOver ? styles.progressValueOver : null]}>
            {current} / {goal}
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                flex: progress,
                backgroundColor: isOver ? '#FF4757' : color,
              }
            ]}
          />
          <View style={{ flex: Math.max(0, 1 - progress) }} />
        </View>
      </View>
    );
  };

  const renderEntry = ({ item }: { item: FoodEntry }) => (
    <TouchableOpacity
      style={styles.entryCard}
      onLongPress={() => deleteEntry(item.id)}
    >
      <View style={styles.entryContent}>
        <Text style={styles.entryDescription}>{item.description}</Text>
        <Text style={styles.entryCalories}>{item.calories} cal</Text>
      </View>
      <Text style={styles.entryMacros}>
        P: {item.protein}g  C: {item.carbs}g  F: {item.fat}g
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today</Text>
          <View style={styles.caloriesBadge}>
            <Text style={styles.caloriesIcon}>🔥</Text>
            <Text style={styles.caloriesRemaining}>{remainingCalories}</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Goals Card */}
          <View style={styles.goalsCard}>
            <Text style={styles.goalsTitle}>Goals</Text>
            {renderProgressBar('Calories', totals.calories, goals.calories, '#FFB800')}
            {renderProgressBar('Protein', totals.protein, goals.protein, '#FF9F43')}
            {renderProgressBar('Carbs', totals.carbs, goals.carbs, '#FF4757')}
            {renderProgressBar('Fat', totals.fat, goals.fat, '#26DE81')}
          </View>

          {/* Entries */}
          {entries.length > 0 && (
            <View style={styles.entriesSection}>
              <Text style={styles.sectionTitle}>Today's Log</Text>
              {entries.map(item => (
                <View key={item.id}>
                  {renderEntry({ item })}
                </View>
              ))}
            </View>
          )}

          {entries.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptySubtitle}>Type what you ate below</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputSection}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="What did you eat?"
              placeholderTextColor="#999"
              onSubmitEditing={addEntry}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addButton, !inputText.trim() ? styles.addButtonDisabled : null]}
              onPress={addEntry}
              disabled={!inputText.trim()}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6E9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  caloriesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  caloriesIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  caloriesRemaining: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  goalsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  goalsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  progressItem: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  progressValueOver: {
    color: '#FF4757',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    flexDirection: 'row',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  entriesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  entryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  entryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  entryDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 10,
  },
  entryCalories: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  entryMacros: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
  },
  inputSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FDF6E9',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
    marginRight: 10,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFF',
  },
});
