import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import {
  FoodEntry,
  DailyGoals,
  NutritionInfo,
  DEFAULT_GOALS,
  FoodEntryStatus,
  NutritionSource,
} from '../types';
import { analyzeFood } from '../services/nutritionService';

interface CaloriesContextType {
  // Current date
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;

  // Food entries
  entries: FoodEntry[];
  addEntry: (description: string) => Promise<void>;
  updateEntry: (id: string, updates: Partial<FoodEntry>) => void;
  deleteEntry: (id: string) => void;

  // Goals
  goals: DailyGoals;
  setGoals: (goals: DailyGoals) => void;

  // Computed values
  dailyTotals: NutritionInfo;
  remainingCalories: number;

  // Loading state
  isLoading: boolean;
}

const CaloriesContext = createContext<CaloriesContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ENTRIES: 'calories_entries',
  GOALS: 'calories_goals',
};

const getDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

interface CaloriesProviderProps {
  children: ReactNode;
}

export const CaloriesProvider: React.FC<CaloriesProviderProps> = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allEntries, setAllEntries] = useState<FoodEntry[]>([]);
  const [goals, setGoalsState] = useState<DailyGoals>(DEFAULT_GOALS);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const [entriesJson, goalsJson] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.ENTRIES),
          AsyncStorage.getItem(STORAGE_KEYS.GOALS),
        ]);

        if (entriesJson) {
          const parsed = JSON.parse(entriesJson);
          // Convert timestamp strings back to Date objects
          const entries = parsed.map((e: FoodEntry) => ({
            ...e,
            timestamp: new Date(e.timestamp),
          }));
          setAllEntries(entries);
        }

        if (goalsJson) {
          setGoalsState(JSON.parse(goalsJson));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Save entries to storage
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(allEntries));
    }
  }, [allEntries, isLoading]);

  // Save goals to storage
  const setGoals = useCallback(async (newGoals: DailyGoals) => {
    setGoalsState(newGoals);
    await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(newGoals));
  }, []);

  // Get entries for selected date
  const entries = allEntries.filter(
    (entry) => entry.dateKey === getDateKey(selectedDate)
  );

  // Calculate daily totals
  const dailyTotals: NutritionInfo = entries.reduce(
    (acc, entry) => {
      if (entry.nutrition && entry.status === 'complete') {
        return {
          calories: acc.calories + entry.nutrition.calories,
          protein: acc.protein + entry.nutrition.protein,
          carbs: acc.carbs + entry.nutrition.carbs,
          fat: acc.fat + entry.nutrition.fat,
        };
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const remainingCalories = goals.calories - dailyTotals.calories;

  // Add new entry
  const addEntry = useCallback(async (description: string) => {
    const dateKey = getDateKey(selectedDate);
    const entryId = uuidv4();

    const newEntry: FoodEntry = {
      id: entryId,
      description: description.trim(),
      nutrition: null,
      status: 'thinking',
      sources: [],
      aiThoughtProcess: '',
      timestamp: new Date(),
      dateKey,
    };

    setAllEntries((prev) => [newEntry, ...prev]);

    // Process with AI
    try {
      const result = await analyzeFood(description);
      setAllEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                nutrition: result.nutrition,
                sources: result.sources,
                aiThoughtProcess: result.thoughtProcess,
                status: 'complete' as FoodEntryStatus,
              }
            : entry
        )
      );
    } catch (error) {
      console.error('Error analyzing food:', error);
      setAllEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                status: 'error' as FoodEntryStatus,
                aiThoughtProcess: 'Sorry, I had trouble analyzing this food. Please try again or edit manually.',
              }
            : entry
        )
      );
    }
  }, [selectedDate]);

  // Update entry
  const updateEntry = useCallback((id: string, updates: Partial<FoodEntry>) => {
    setAllEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    );
  }, []);

  // Delete entry
  const deleteEntry = useCallback((id: string) => {
    setAllEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const value: CaloriesContextType = {
    selectedDate,
    setSelectedDate,
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    goals,
    setGoals,
    dailyTotals,
    remainingCalories,
    isLoading,
  };

  return (
    <CaloriesContext.Provider value={value}>
      {children}
    </CaloriesContext.Provider>
  );
};

export const useCalories = (): CaloriesContextType => {
  const context = useContext(CaloriesContext);
  if (!context) {
    throw new Error('useCalories must be used within a CaloriesProvider');
  }
  return context;
};
