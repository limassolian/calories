import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// ============ CONFIGURATION ============
// API key loaded from .env file (EXPO_PUBLIC_CLAUDE_API_KEY)
const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '';
// ========================================

// Types
interface FoodEntry {
  id: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUri?: string;
  aiAnalysis?: string;
  isAnalyzing?: boolean;
}

interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
  analysis: string;
}

const DEFAULT_GOALS: Goals = {
  calories: 2000,
  protein: 120,
  carbs: 250,
  fat: 65,
};

// AI Service for nutrition analysis
const analyzeWithAI = async (
  description: string,
  imageBase64?: string
): Promise<NutritionResult> => {
  // If no API key, use fallback estimation
  if (!CLAUDE_API_KEY) {
    return fallbackEstimation(description);
  }

  try {
    const messages: any[] = [];

    const systemPrompt = `You are a nutrition expert AI. Analyze the food described or shown and provide accurate nutritional estimates.

IMPORTANT: Respond ONLY with a valid JSON object in this exact format, no other text:
{
  "calories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>,
  "description": "<brief description of the food>",
  "analysis": "<1-2 sentence explanation of your estimate>"
}

Guidelines:
- Use standard portion sizes if not specified
- For restaurant food, use typical restaurant portions
- Be conservative with estimates
- Round to whole numbers`;

    let userContent: any[] = [];

    if (imageBase64) {
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: imageBase64,
        },
      });
      userContent.push({
        type: "text",
        text: description
          ? `Analyze this food image. Additional context: "${description}". Provide nutritional information.`
          : "Analyze this food image and provide nutritional information.",
      });
    } else {
      userContent.push({
        type: "text",
        text: `Analyze this food and provide nutritional information: "${description}"`,
      });
    }

    messages.push({ role: "user", content: userContent });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        calories: result.calories || 300,
        protein: result.protein || 15,
        carbs: result.carbs || 35,
        fat: result.fat || 12,
        description: result.description || description,
        analysis: result.analysis || 'AI analysis completed.',
      };
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('AI analysis error:', error);
    return fallbackEstimation(description);
  }
};

// Fallback when API is unavailable
const fallbackEstimation = (description: string): NutritionResult => {
  const lower = description.toLowerCase();

  const foodDatabase: Record<string, Omit<NutritionResult, 'description' | 'analysis'>> = {
    'burger': { calories: 540, protein: 25, carbs: 45, fat: 29 },
    'ramen': { calories: 450, protein: 12, carbs: 65, fat: 15 },
    'noodle': { calories: 450, protein: 12, carbs: 65, fat: 15 },
    'salad': { calories: 250, protein: 15, carbs: 20, fat: 12 },
    'pizza': { calories: 285, protein: 12, carbs: 36, fat: 10 },
    'chicken': { calories: 335, protein: 38, carbs: 0, fat: 8 },
    'rice': { calories: 206, protein: 4, carbs: 45, fat: 0 },
    'egg': { calories: 155, protein: 13, carbs: 1, fat: 11 },
    'sandwich': { calories: 350, protein: 18, carbs: 40, fat: 12 },
    'coffee': { calories: 120, protein: 6, carbs: 12, fat: 5 },
    'latte': { calories: 120, protein: 6, carbs: 12, fat: 5 },
    'smoothie': { calories: 280, protein: 8, carbs: 52, fat: 4 },
    'steak': { calories: 450, protein: 42, carbs: 0, fat: 30 },
    'fish': { calories: 200, protein: 25, carbs: 0, fat: 10 },
    'pasta': { calories: 400, protein: 12, carbs: 70, fat: 8 },
    'sushi': { calories: 300, protein: 15, carbs: 40, fat: 8 },
    'tacos': { calories: 380, protein: 18, carbs: 35, fat: 18 },
    'burrito': { calories: 550, protein: 22, carbs: 60, fat: 22 },
  };

  for (const [food, nutrition] of Object.entries(foodDatabase)) {
    if (lower.includes(food)) {
      return {
        ...nutrition,
        description,
        analysis: `Estimated based on typical ${food} nutritional values.`,
      };
    }
  }

  return {
    calories: 300,
    protein: 15,
    carbs: 35,
    fat: 12,
    description,
    analysis: 'Using default estimate. Add Claude API key for accurate AI analysis.',
  };
};

// Convert image to base64
const imageToBase64 = async (uri: string): Promise<string> => {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
};

export default function App() {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const addEntry = useCallback(async () => {
    if (!inputText.trim() && !selectedImage) return;

    setIsAnalyzing(true);

    try {
      let imageBase64: string | undefined;

      if (selectedImage) {
        imageBase64 = await imageToBase64(selectedImage);
      }

      const description = inputText.trim() || 'Food from photo';
      const result = await analyzeWithAI(description, imageBase64);

      const newEntry: FoodEntry = {
        id: Date.now().toString(),
        description: result.description,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        imageUri: selectedImage || undefined,
        aiAnalysis: result.analysis,
      };

      setEntries(prev => [newEntry, ...prev]);
      setInputText('');
      setSelectedImage(null);
      Keyboard.dismiss();
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze food. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [inputText, selectedImage]);

  const deleteEntry = useCallback((id: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setEntries(prev => prev.filter(e => e.id !== id)),
        },
      ]
    );
  }, []);

  const clearSelectedImage = () => {
    setSelectedImage(null);
  };

  const renderProgressBar = (label: string, current: number, goal: number, color: string) => {
    const progress = Math.min(current / goal, 1);
    const isOver = current > goal;

    return (
      <View style={styles.progressItem} key={label}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={[styles.progressValue, isOver ? styles.progressValueOver : null]}>
            {Math.round(current)} / {goal}
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

  const renderEntry = (item: FoodEntry) => (
    <TouchableOpacity
      key={item.id}
      style={styles.entryCard}
      onPress={() => {
        setSelectedEntry(item);
        setShowImageModal(true);
      }}
      onLongPress={() => deleteEntry(item.id)}
    >
      <View style={styles.entryRow}>
        {item.imageUri && (
          <Image source={{ uri: item.imageUri }} style={styles.entryThumbnail} />
        )}
        <View style={styles.entryDetails}>
          <View style={styles.entryContent}>
            <Text style={styles.entryDescription} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.entryCalories}>{item.calories} cal</Text>
          </View>
          <Text style={styles.entryMacros}>
            P: {item.protein}g  C: {item.carbs}g  F: {item.fat}g
          </Text>
          {item.aiAnalysis && (
            <Text style={styles.entryAnalysis} numberOfLines={1}>
              🤖 {item.aiAnalysis}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const hasApiKey = Boolean(CLAUDE_API_KEY);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Today</Text>
            {!hasApiKey && (
              <TouchableOpacity onPress={() => setShowApiKeyModal(true)}>
                <Text style={styles.apiKeyHint}>⚠️ Add API key for AI</Text>
              </TouchableOpacity>
            )}
          </View>
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

          {/* AI Info Card */}
          <View style={styles.aiInfoCard}>
            <Text style={styles.aiInfoTitle}>🤖 AI-Powered Analysis</Text>
            <Text style={styles.aiInfoText}>
              {hasApiKey
                ? "Claude AI analyzes your food photos and descriptions for accurate nutrition data."
                : "Add your Claude API key to enable AI-powered food recognition and calorie estimation."}
            </Text>
          </View>

          {/* Entries */}
          {entries.length > 0 && (
            <View style={styles.entriesSection}>
              <Text style={styles.sectionTitle}>Today's Log</Text>
              {entries.map(item => renderEntry(item))}
              <Text style={styles.hintText}>Tap for details • Long press to delete</Text>
            </View>
          )}

          {entries.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptySubtitle}>
                Take a photo or describe what you ate
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Selected Image Preview */}
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImageButton} onPress={clearSelectedImage}>
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputSection}>
          {isAnalyzing && (
            <View style={styles.analyzingBanner}>
              <ActivityIndicator size="small" color="#FF8C42" />
              <Text style={styles.analyzingText}>🤖 AI is analyzing your food...</Text>
            </View>
          )}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.iconButton} onPress={takePhoto} disabled={isAnalyzing}>
              <Text style={styles.iconButtonText}>📷</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={pickImage} disabled={isAnalyzing}>
              <Text style={styles.iconButtonText}>🖼️</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="What did you eat?"
              placeholderTextColor="#999"
              onSubmitEditing={addEntry}
              returnKeyType="done"
              editable={!isAnalyzing}
            />
            <TouchableOpacity
              style={[
                styles.addButton,
                ((!inputText.trim() && !selectedImage) || isAnalyzing) ? styles.addButtonDisabled : null
              ]}
              onPress={addEntry}
              disabled={(!inputText.trim() && !selectedImage) || isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.addButtonText}>+</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Entry Detail Modal */}
        <Modal
          visible={showImageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowImageModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowImageModal(false)}
          >
            <View style={styles.modalContent}>
              {selectedEntry?.imageUri && (
                <Image
                  source={{ uri: selectedEntry.imageUri }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}
              {selectedEntry && (
                <View style={styles.modalInfo}>
                  <Text style={styles.modalTitle}>{selectedEntry.description}</Text>
                  <Text style={styles.modalCalories}>{selectedEntry.calories} calories</Text>
                  <Text style={styles.modalMacros}>
                    Protein: {selectedEntry.protein}g • Carbs: {selectedEntry.carbs}g • Fat: {selectedEntry.fat}g
                  </Text>
                  {selectedEntry.aiAnalysis && (
                    <View style={styles.modalAnalysisBox}>
                      <Text style={styles.modalAnalysisTitle}>🤖 AI Analysis</Text>
                      <Text style={styles.modalAnalysisText}>{selectedEntry.aiAnalysis}</Text>
                    </View>
                  )}
                </View>
              )}
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowImageModal(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* API Key Info Modal */}
        <Modal
          visible={showApiKeyModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowApiKeyModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowApiKeyModal(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🔑 Add Claude API Key</Text>
              <Text style={styles.apiKeyInstructions}>
                To enable AI-powered food recognition:{'\n\n'}
                1. Get an API key from console.anthropic.com{'\n\n'}
                2. Create a file called .env in your project:{'\n\n'}
                EXPO_PUBLIC_CLAUDE_API_KEY=your_key_here{'\n\n'}
                3. Restart the app
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowApiKeyModal(false)}
              >
                <Text style={styles.modalCloseText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
  apiKeyHint: {
    fontSize: 12,
    color: '#FF8C42',
    marginTop: 2,
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
    marginBottom: 16,
  },
  goalsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  aiInfoCard: {
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  aiInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  aiInfoText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
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
  hintText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  entryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  entryRow: {
    flexDirection: 'row',
  },
  entryThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  entryDetails: {
    flex: 1,
  },
  entryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
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
  entryAnalysis: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
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
    textAlign: 'center',
  },
  imagePreviewContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  imagePreview: {
    width: 120,
    height: 90,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 25,
    backgroundColor: '#FF4757',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  inputSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FDF6E9',
  },
  analyzingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  analyzingText: {
    fontSize: 13,
    color: '#FF8C42',
    marginLeft: 8,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  iconButtonText: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
    marginRight: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxWidth: 400,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalInfo: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  modalCalories: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF8C42',
    marginBottom: 4,
  },
  modalMacros: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  modalAnalysisBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
  },
  modalAnalysisTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  modalAnalysisText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  modalCloseButton: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  apiKeyInstructions: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginVertical: 16,
  },
});
