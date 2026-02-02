export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionSource {
  name: string;
  icon?: string;
  url?: string;
}

export type FoodEntryStatus = 'thinking' | 'complete' | 'error';

export interface FoodEntry {
  id: string;
  description: string;
  nutrition: NutritionInfo | null;
  status: FoodEntryStatus;
  sources: NutritionSource[];
  aiThoughtProcess: string;
  timestamp: Date;
  dateKey: string; // Format: YYYY-MM-DD
}

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyLog {
  dateKey: string;
  entries: FoodEntry[];
  totals: NutritionInfo;
}

export interface UserSettings {
  dailyGoals: DailyGoals;
}

export const DEFAULT_GOALS: DailyGoals = {
  calories: 2000,
  protein: 120,
  carbs: 250,
  fat: 65,
};
