import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Header,
  FoodInput,
  FoodEntryCard,
  NutritionDetailsModal,
  GoalsDashboard,
} from '../components';
import { useCalories } from '../context/CaloriesContext';
import { FoodEntry } from '../types';
import { colors, spacing, typography } from '../theme';

type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const formatDate = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    selectedDate,
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    goals,
    dailyTotals,
    remainingCalories,
    isLoading,
  } = useCalories();

  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleAddEntry = useCallback(
    async (text: string) => {
      await addEntry(text);
    },
    [addEntry]
  );

  const handleEntryPress = useCallback((entry: FoodEntry) => {
    setSelectedEntry(entry);
    setIsModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedEntry(null);
  }, []);

  const handleUpdateEntry = useCallback(
    (id: string, updates: Partial<FoodEntry>) => {
      updateEntry(id, updates);
    },
    [updateEntry]
  );

  const handleDeleteEntry = useCallback(
    (id: string) => {
      deleteEntry(id);
    },
    [deleteEntry]
  );

  const handleVoicePress = useCallback(() => {
    // Voice input disabled - expo-av deprecated
  }, []);

  const handleSettingsPress = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FoodEntry }) => (
      <FoodEntryCard entry={item} onPress={() => handleEntryPress(item)} />
    ),
    [handleEntryPress]
  );

  const renderHeader = useCallback(
    () => (
      <>
        <GoalsDashboard totals={dailyTotals} goals={goals} />
        {entries.length > 0 && (
          <Text style={styles.sectionTitle}>Today's Log</Text>
        )}
      </>
    ),
    [dailyTotals, goals, entries.length]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🍽️</Text>
        <Text style={styles.emptyTitle}>No entries yet</Text>
        <Text style={styles.emptySubtitle}>
          Start tracking by typing what you ate below
        </Text>
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: FoodEntry) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <Header
          title={formatDate(selectedDate)}
          remainingCalories={remainingCalories}
          onSettingsPress={handleSettingsPress}
        />

        <FlatList
          data={entries}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />

        <FoodInput
          onSubmit={handleAddEntry}
          remainingCalories={remainingCalories}
          onVoicePress={handleVoicePress}
          isVoiceActive={false}
        />

        <NutritionDetailsModal
          entry={selectedEntry}
          visible={isModalVisible}
          onClose={handleCloseModal}
          onUpdate={handleUpdateEntry}
          onDelete={handleDeleteEntry}
        />
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default HomeScreen;
