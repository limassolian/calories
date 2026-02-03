import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============ CONFIGURATION ============
const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '';
// ========================================

// Types
interface Ingredient {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
}

interface FoodEntry {
  id: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUri?: string;
  imageBase64?: string;
  aiAnalysis?: string;
  ingredients: Ingredient[];
  servings: number;
  timestamp: number;
}

interface UserProfile {
  name: string;
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
  useMetric: boolean;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  onboardingComplete: boolean;
}

interface NutritionResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
  analysis: string;
  ingredients: Ingredient[];
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  weight: 70,
  height: 170,
  age: 30,
  gender: 'male',
  activityLevel: 'moderate',
  goal: 'maintain',
  useMetric: true,
  calorieGoal: 2000,
  proteinGoal: 120,
  carbsGoal: 250,
  fatGoal: 65,
  onboardingComplete: false,
};

// Calculate recommended calories based on user info
const calculateRecommendedCalories = (profile: UserProfile): number => {
  const { weight, height, age, gender, activityLevel, goal } = profile;

  // BMR using Mifflin-St Jeor
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // Activity multiplier
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  let tdee = bmr * multipliers[activityLevel];

  // Adjust for goal
  if (goal === 'lose') tdee -= 500;
  if (goal === 'gain') tdee += 300;

  return Math.round(tdee);
};

// Calculate macros based on calories
const calculateMacros = (calories: number, goal: string) => {
  let proteinRatio = 0.25;
  let fatRatio = 0.25;
  let carbsRatio = 0.5;

  if (goal === 'lose') {
    proteinRatio = 0.30;
    fatRatio = 0.25;
    carbsRatio = 0.45;
  } else if (goal === 'gain') {
    proteinRatio = 0.25;
    fatRatio = 0.20;
    carbsRatio = 0.55;
  }

  return {
    protein: Math.round((calories * proteinRatio) / 4),
    fat: Math.round((calories * fatRatio) / 9),
    carbs: Math.round((calories * carbsRatio) / 4),
  };
};

// Get media type from URI
const getMediaType = (uri: string): string => {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.gif')) return 'image/gif';
  if (lower.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
};

// AI Service for nutrition analysis
const analyzeWithAI = async (
  description: string,
  imageBase64?: string,
  imageUri?: string
): Promise<NutritionResult> => {
  if (!CLAUDE_API_KEY) {
    return fallbackEstimation(description);
  }

  try {
    const messages: any[] = [];
    const systemPrompt = `You are a nutrition expert AI. Analyze the food described or shown and provide accurate nutritional estimates with ingredient breakdown.

IMPORTANT: Respond ONLY with a valid JSON object in this exact format, no other text:
{
  "calories": <total number>,
  "protein": <total grams>,
  "carbs": <total grams>,
  "fat": <total grams>,
  "description": "<brief description of the food>",
  "analysis": "<1-2 sentence explanation of your estimate>",
  "ingredients": [
    {
      "name": "<ingredient name>",
      "calories": <number>,
      "protein": <grams>,
      "carbs": <grams>,
      "fat": <grams>,
      "serving": "<serving description, e.g. '1 cup', '2 slices'>"
    }
  ]
}

Guidelines:
- Use standard portion sizes if not specified
- For restaurant food, use typical restaurant portions
- Be conservative with estimates
- Round to whole numbers
- Break down into individual ingredients when possible
- Include 2-6 main ingredients`;

    let userContent: any[] = [];

    if (imageBase64) {
      const mediaType = imageUri ? getMediaType(imageUri) : 'image/jpeg';
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
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
        ingredients: result.ingredients || [],
      };
    }

    throw new Error('Invalid response format');
  } catch (error: any) {
    return {
      ...fallbackEstimation(description),
      analysis: `AI error: ${error.message}. Using estimate.`,
    };
  }
};

const fallbackEstimation = (description: string): NutritionResult => {
  const lower = description.toLowerCase();
  const foodDatabase: Record<string, Omit<NutritionResult, 'description' | 'analysis'>> = {
    'burger': { calories: 540, protein: 25, carbs: 45, fat: 29, ingredients: [
      { name: 'Beef Patty', calories: 250, protein: 20, carbs: 0, fat: 18, serving: '1 patty' },
      { name: 'Burger Bun', calories: 150, protein: 4, carbs: 28, fat: 2, serving: '1 bun' },
      { name: 'Cheese', calories: 90, protein: 5, carbs: 1, fat: 7, serving: '1 slice' },
      { name: 'Toppings', calories: 50, protein: 1, carbs: 10, fat: 2, serving: '1 serving' },
    ]},
    'salad': { calories: 250, protein: 15, carbs: 20, fat: 12, ingredients: [
      { name: 'Mixed Greens', calories: 20, protein: 2, carbs: 4, fat: 0, serving: '2 cups' },
      { name: 'Chicken Breast', calories: 120, protein: 24, carbs: 0, fat: 3, serving: '3 oz' },
      { name: 'Dressing', calories: 80, protein: 0, carbs: 4, fat: 7, serving: '2 tbsp' },
    ]},
    'pizza': { calories: 285, protein: 12, carbs: 36, fat: 10, ingredients: [
      { name: 'Pizza Dough', calories: 150, protein: 4, carbs: 28, fat: 2, serving: '1 slice base' },
      { name: 'Tomato Sauce', calories: 25, protein: 1, carbs: 5, fat: 0, serving: '2 tbsp' },
      { name: 'Mozzarella', calories: 85, protein: 6, carbs: 1, fat: 6, serving: '1 oz' },
    ]},
    'chicken': { calories: 335, protein: 38, carbs: 0, fat: 8, ingredients: [
      { name: 'Chicken Breast', calories: 335, protein: 38, carbs: 0, fat: 8, serving: '6 oz' },
    ]},
    'rice': { calories: 206, protein: 4, carbs: 45, fat: 0, ingredients: [
      { name: 'White Rice', calories: 206, protein: 4, carbs: 45, fat: 0, serving: '1 cup cooked' },
    ]},
    'pasta': { calories: 400, protein: 12, carbs: 70, fat: 8, ingredients: [
      { name: 'Pasta', calories: 220, protein: 8, carbs: 43, fat: 1, serving: '2 oz dry' },
      { name: 'Marinara Sauce', calories: 70, protein: 2, carbs: 10, fat: 2, serving: '1/2 cup' },
      { name: 'Parmesan', calories: 110, protein: 10, carbs: 1, fat: 7, serving: '1 oz' },
    ]},
  };

  for (const [food, nutrition] of Object.entries(foodDatabase)) {
    if (lower.includes(food)) {
      return { ...nutrition, description, analysis: `Estimated based on typical ${food}.` };
    }
  }

  return {
    calories: 300, protein: 15, carbs: 35, fat: 12, description, analysis: 'Estimated.',
    ingredients: [{ name: description, calories: 300, protein: 15, carbs: 35, fat: 12, serving: '1 serving' }]
  };
};

// ============ ONBOARDING COMPONENT ============
interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for icons
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [step]);

  const animateToNextStep = (nextStep: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const nextStep = () => {
    if (step < 5) {
      animateToNextStep(step + 1);
    } else {
      // Calculate goals
      const calories = calculateRecommendedCalories(profile);
      const macros = calculateMacros(calories, profile.goal);
      const finalProfile = {
        ...profile,
        calorieGoal: calories,
        proteinGoal: macros.protein,
        carbsGoal: macros.carbs,
        fatGoal: macros.fat,
        onboardingComplete: true,
      };
      onComplete(finalProfile);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      animateToNextStep(step - 1);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={onboardingStyles.stepContent}>
            <Animated.Text style={[onboardingStyles.emoji, { transform: [{ scale: pulseAnim }] }]}>
              🥗
            </Animated.Text>
            <Text style={onboardingStyles.title}>Welcome to Calories</Text>
            <Text style={onboardingStyles.subtitle}>
              Your AI-powered nutrition companion that makes tracking effortless
            </Text>
            <View style={onboardingStyles.featureList}>
              <View style={onboardingStyles.featureItem}>
                <Text style={onboardingStyles.featureIcon}>📸</Text>
                <Text style={onboardingStyles.featureText}>Snap a photo to log meals</Text>
              </View>
              <View style={onboardingStyles.featureItem}>
                <Text style={onboardingStyles.featureIcon}>🤖</Text>
                <Text style={onboardingStyles.featureText}>AI analyzes your food instantly</Text>
              </View>
              <View style={onboardingStyles.featureItem}>
                <Text style={onboardingStyles.featureIcon}>📊</Text>
                <Text style={onboardingStyles.featureText}>Track progress toward your goals</Text>
              </View>
            </View>
          </View>
        );

      case 1:
        return (
          <View style={onboardingStyles.stepContent}>
            <Animated.Text style={[onboardingStyles.emoji, { transform: [{ scale: pulseAnim }] }]}>
              👋
            </Animated.Text>
            <Text style={onboardingStyles.title}>What's your name?</Text>
            <TextInput
              style={onboardingStyles.input}
              value={profile.name}
              onChangeText={(text) => setProfile({ ...profile, name: text })}
              placeholder="Enter your name"
              placeholderTextColor="#999"
              autoFocus
            />
          </View>
        );

      case 2:
        return (
          <View style={onboardingStyles.stepContent}>
            <Animated.Text style={[onboardingStyles.emoji, { transform: [{ scale: pulseAnim }] }]}>
              ⚖️
            </Animated.Text>
            <Text style={onboardingStyles.title}>Your measurements</Text>

            <View style={onboardingStyles.toggleRow}>
              <TouchableOpacity
                style={[onboardingStyles.toggleButton, profile.useMetric ? onboardingStyles.toggleActive : null]}
                onPress={() => setProfile({ ...profile, useMetric: true })}
              >
                <Text style={[onboardingStyles.toggleText, profile.useMetric ? onboardingStyles.toggleTextActive : null]}>
                  Metric (kg/cm)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[onboardingStyles.toggleButton, !profile.useMetric ? onboardingStyles.toggleActive : null]}
                onPress={() => setProfile({ ...profile, useMetric: false })}
              >
                <Text style={[onboardingStyles.toggleText, !profile.useMetric ? onboardingStyles.toggleTextActive : null]}>
                  Imperial (lb/ft)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={onboardingStyles.inputRow}>
              <View style={onboardingStyles.inputGroup}>
                <Text style={onboardingStyles.inputLabel}>Weight ({profile.useMetric ? 'kg' : 'lb'})</Text>
                <TextInput
                  style={onboardingStyles.inputSmall}
                  value={String(profile.weight)}
                  onChangeText={(text) => setProfile({ ...profile, weight: Number(text) || 0 })}
                  keyboardType="numeric"
                  placeholder={profile.useMetric ? "70" : "154"}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={onboardingStyles.inputGroup}>
                <Text style={onboardingStyles.inputLabel}>Height ({profile.useMetric ? 'cm' : 'in'})</Text>
                <TextInput
                  style={onboardingStyles.inputSmall}
                  value={String(profile.height)}
                  onChangeText={(text) => setProfile({ ...profile, height: Number(text) || 0 })}
                  keyboardType="numeric"
                  placeholder={profile.useMetric ? "170" : "67"}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={onboardingStyles.inputRow}>
              <View style={onboardingStyles.inputGroup}>
                <Text style={onboardingStyles.inputLabel}>Age</Text>
                <TextInput
                  style={onboardingStyles.inputSmall}
                  value={String(profile.age)}
                  onChangeText={(text) => setProfile({ ...profile, age: Number(text) || 0 })}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={onboardingStyles.inputGroup}>
                <Text style={onboardingStyles.inputLabel}>Gender</Text>
                <View style={onboardingStyles.genderRow}>
                  {(['male', 'female'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[onboardingStyles.genderButton, profile.gender === g ? onboardingStyles.genderActive : null]}
                      onPress={() => setProfile({ ...profile, gender: g })}
                    >
                      <Text style={onboardingStyles.genderEmoji}>{g === 'male' ? '👨' : '👩'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={onboardingStyles.stepContent}>
            <Animated.Text style={[onboardingStyles.emoji, { transform: [{ scale: pulseAnim }] }]}>
              🏃
            </Animated.Text>
            <Text style={onboardingStyles.title}>Activity level</Text>
            <Text style={onboardingStyles.subtitle}>How active are you on a typical day?</Text>

            {[
              { key: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise', emoji: '🛋️' },
              { key: 'light', label: 'Light', desc: 'Light exercise 1-3 days/week', emoji: '🚶' },
              { key: 'moderate', label: 'Moderate', desc: 'Moderate exercise 3-5 days/week', emoji: '🏃' },
              { key: 'active', label: 'Active', desc: 'Hard exercise 6-7 days/week', emoji: '💪' },
              { key: 'very_active', label: 'Very Active', desc: 'Athlete or physical job', emoji: '🏋️' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  onboardingStyles.optionCard,
                  profile.activityLevel === item.key ? onboardingStyles.optionCardActive : null
                ]}
                onPress={() => setProfile({ ...profile, activityLevel: item.key as any })}
              >
                <Text style={onboardingStyles.optionEmoji}>{item.emoji}</Text>
                <View style={onboardingStyles.optionText}>
                  <Text style={onboardingStyles.optionTitle}>{item.label}</Text>
                  <Text style={onboardingStyles.optionDesc}>{item.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 4:
        return (
          <View style={onboardingStyles.stepContent}>
            <Animated.Text style={[onboardingStyles.emoji, { transform: [{ scale: pulseAnim }] }]}>
              🎯
            </Animated.Text>
            <Text style={onboardingStyles.title}>What's your goal?</Text>

            {[
              { key: 'lose', label: 'Lose Weight', desc: 'Calorie deficit for fat loss', emoji: '📉', color: '#FF6B6B' },
              { key: 'maintain', label: 'Maintain Weight', desc: 'Keep your current weight', emoji: '⚖️', color: '#4ECDC4' },
              { key: 'gain', label: 'Build Muscle', desc: 'Calorie surplus for muscle gain', emoji: '📈', color: '#45B7D1' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  onboardingStyles.goalCard,
                  profile.goal === item.key ? { ...onboardingStyles.goalCardActive, borderColor: item.color } : null
                ]}
                onPress={() => setProfile({ ...profile, goal: item.key as any })}
              >
                <Text style={onboardingStyles.goalEmoji}>{item.emoji}</Text>
                <Text style={onboardingStyles.goalTitle}>{item.label}</Text>
                <Text style={onboardingStyles.goalDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 5:
        const previewCalories = calculateRecommendedCalories(profile);
        const previewMacros = calculateMacros(previewCalories, profile.goal);
        return (
          <View style={onboardingStyles.stepContent}>
            <Animated.Text style={[onboardingStyles.emoji, { transform: [{ scale: pulseAnim }] }]}>
              ✨
            </Animated.Text>
            <Text style={onboardingStyles.title}>Your personalized plan</Text>
            <Text style={onboardingStyles.subtitle}>Based on your profile, we recommend:</Text>

            <View style={onboardingStyles.summaryCard}>
              <View style={onboardingStyles.summaryRow}>
                <Text style={onboardingStyles.summaryLabel}>🔥 Daily Calories</Text>
                <Text style={onboardingStyles.summaryValue}>{previewCalories}</Text>
              </View>
              <View style={onboardingStyles.summaryDivider} />
              <View style={onboardingStyles.macrosRow}>
                <View style={onboardingStyles.macroItem}>
                  <Text style={onboardingStyles.macroValue}>{previewMacros.protein}g</Text>
                  <Text style={onboardingStyles.macroLabel}>Protein</Text>
                </View>
                <View style={onboardingStyles.macroItem}>
                  <Text style={onboardingStyles.macroValue}>{previewMacros.carbs}g</Text>
                  <Text style={onboardingStyles.macroLabel}>Carbs</Text>
                </View>
                <View style={onboardingStyles.macroItem}>
                  <Text style={onboardingStyles.macroValue}>{previewMacros.fat}g</Text>
                  <Text style={onboardingStyles.macroLabel}>Fat</Text>
                </View>
              </View>
            </View>

            <Text style={onboardingStyles.readyText}>Ready to start your journey? 🚀</Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={onboardingStyles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={onboardingStyles.keyboardView}
      >
        {/* Progress dots */}
        <View style={onboardingStyles.progressContainer}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={[
                onboardingStyles.progressDot,
                i === step ? onboardingStyles.progressDotActive : null,
                i < step ? onboardingStyles.progressDotComplete : null,
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={onboardingStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              onboardingStyles.animatedContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            {renderStep()}
          </Animated.View>
        </ScrollView>

        {/* Navigation buttons */}
        <View style={onboardingStyles.buttonContainer}>
          {step > 0 && (
            <TouchableOpacity style={onboardingStyles.backButton} onPress={prevStep}>
              <Text style={onboardingStyles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[onboardingStyles.nextButton, step === 0 ? { flex: 1 } : null]}
            onPress={nextStep}
          >
            <Text style={onboardingStyles.nextButtonText}>
              {step === 5 ? "Let's Go! 🎉" : step === 0 ? "Get Started" : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ============ SETTINGS COMPONENT ============
interface SettingsProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ profile, onSave, onClose }) => {
  const [editedProfile, setEditedProfile] = useState(profile);
  const [showCustomGoals, setShowCustomGoals] = useState(false);

  const handleSave = () => {
    let finalProfile = editedProfile;
    if (!showCustomGoals) {
      const calories = calculateRecommendedCalories(editedProfile);
      const macros = calculateMacros(calories, editedProfile.goal);
      finalProfile = {
        ...editedProfile,
        calorieGoal: calories,
        proteinGoal: macros.protein,
        carbsGoal: macros.carbs,
        fatGoal: macros.fat,
      };
    }
    onSave(finalProfile);
    onClose();
  };

  return (
    <SafeAreaView style={settingsStyles.container}>
      <StatusBar style="dark" />
      <View style={settingsStyles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={settingsStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={settingsStyles.title}>Settings</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={settingsStyles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={settingsStyles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <Text style={settingsStyles.sectionTitle}>Profile</Text>
        <View style={settingsStyles.card}>
          <View style={settingsStyles.inputRow}>
            <Text style={settingsStyles.label}>Name</Text>
            <TextInput
              style={settingsStyles.input}
              value={editedProfile.name}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, name: text })}
              placeholder="Your name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={settingsStyles.inputRow}>
            <Text style={settingsStyles.label}>Units</Text>
            <View style={settingsStyles.toggleRow}>
              <TouchableOpacity
                style={[settingsStyles.toggleBtn, editedProfile.useMetric ? settingsStyles.toggleActive : null]}
                onPress={() => setEditedProfile({ ...editedProfile, useMetric: true })}
              >
                <Text style={[settingsStyles.toggleText, editedProfile.useMetric ? settingsStyles.toggleTextActive : null]}>
                  Metric
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[settingsStyles.toggleBtn, !editedProfile.useMetric ? settingsStyles.toggleActive : null]}
                onPress={() => setEditedProfile({ ...editedProfile, useMetric: false })}
              >
                <Text style={[settingsStyles.toggleText, !editedProfile.useMetric ? settingsStyles.toggleTextActive : null]}>
                  Imperial
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={settingsStyles.inputRow}>
            <Text style={settingsStyles.label}>Weight ({editedProfile.useMetric ? 'kg' : 'lb'})</Text>
            <TextInput
              style={settingsStyles.inputSmall}
              value={String(editedProfile.weight)}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, weight: Number(text) || 0 })}
              keyboardType="numeric"
            />
          </View>

          <View style={settingsStyles.inputRow}>
            <Text style={settingsStyles.label}>Height ({editedProfile.useMetric ? 'cm' : 'in'})</Text>
            <TextInput
              style={settingsStyles.inputSmall}
              value={String(editedProfile.height)}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, height: Number(text) || 0 })}
              keyboardType="numeric"
            />
          </View>

          <View style={settingsStyles.inputRow}>
            <Text style={settingsStyles.label}>Age</Text>
            <TextInput
              style={settingsStyles.inputSmall}
              value={String(editedProfile.age)}
              onChangeText={(text) => setEditedProfile({ ...editedProfile, age: Number(text) || 0 })}
              keyboardType="numeric"
            />
          </View>

          <View style={settingsStyles.inputRow}>
            <Text style={settingsStyles.label}>Gender</Text>
            <View style={settingsStyles.toggleRow}>
              {(['male', 'female'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[settingsStyles.toggleBtn, editedProfile.gender === g ? settingsStyles.toggleActive : null]}
                  onPress={() => setEditedProfile({ ...editedProfile, gender: g })}
                >
                  <Text style={[settingsStyles.toggleText, editedProfile.gender === g ? settingsStyles.toggleTextActive : null]}>
                    {g === 'male' ? '👨 Male' : '👩 Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Activity & Goal Section */}
        <Text style={settingsStyles.sectionTitle}>Activity & Goal</Text>
        <View style={settingsStyles.card}>
          <Text style={settingsStyles.label}>Activity Level</Text>
          {[
            { key: 'sedentary', label: 'Sedentary' },
            { key: 'light', label: 'Light' },
            { key: 'moderate', label: 'Moderate' },
            { key: 'active', label: 'Active' },
            { key: 'very_active', label: 'Very Active' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[settingsStyles.optionRow, editedProfile.activityLevel === item.key ? settingsStyles.optionActive : null]}
              onPress={() => setEditedProfile({ ...editedProfile, activityLevel: item.key as any })}
            >
              <Text style={settingsStyles.optionText}>{item.label}</Text>
              {editedProfile.activityLevel === item.key && <Text>✓</Text>}
            </TouchableOpacity>
          ))}

          <View style={settingsStyles.divider} />

          <Text style={settingsStyles.label}>Goal</Text>
          {[
            { key: 'lose', label: 'Lose Weight' },
            { key: 'maintain', label: 'Maintain Weight' },
            { key: 'gain', label: 'Build Muscle' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[settingsStyles.optionRow, editedProfile.goal === item.key ? settingsStyles.optionActive : null]}
              onPress={() => setEditedProfile({ ...editedProfile, goal: item.key as any })}
            >
              <Text style={settingsStyles.optionText}>{item.label}</Text>
              {editedProfile.goal === item.key && <Text>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Goals Section */}
        <Text style={settingsStyles.sectionTitle}>Daily Goals</Text>
        <View style={settingsStyles.card}>
          <TouchableOpacity
            style={settingsStyles.customToggle}
            onPress={() => setShowCustomGoals(!showCustomGoals)}
          >
            <Text style={settingsStyles.label}>Custom goals</Text>
            <Text style={settingsStyles.toggleIndicator}>{showCustomGoals ? '✓' : '○'}</Text>
          </TouchableOpacity>

          {showCustomGoals ? (
            <>
              <View style={settingsStyles.inputRow}>
                <Text style={settingsStyles.label}>Calories</Text>
                <TextInput
                  style={settingsStyles.inputSmall}
                  value={String(editedProfile.calorieGoal)}
                  onChangeText={(text) => setEditedProfile({ ...editedProfile, calorieGoal: Number(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>
              <View style={settingsStyles.inputRow}>
                <Text style={settingsStyles.label}>Protein (g)</Text>
                <TextInput
                  style={settingsStyles.inputSmall}
                  value={String(editedProfile.proteinGoal)}
                  onChangeText={(text) => setEditedProfile({ ...editedProfile, proteinGoal: Number(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>
              <View style={settingsStyles.inputRow}>
                <Text style={settingsStyles.label}>Carbs (g)</Text>
                <TextInput
                  style={settingsStyles.inputSmall}
                  value={String(editedProfile.carbsGoal)}
                  onChangeText={(text) => setEditedProfile({ ...editedProfile, carbsGoal: Number(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>
              <View style={settingsStyles.inputRow}>
                <Text style={settingsStyles.label}>Fat (g)</Text>
                <TextInput
                  style={settingsStyles.inputSmall}
                  value={String(editedProfile.fatGoal)}
                  onChangeText={(text) => setEditedProfile({ ...editedProfile, fatGoal: Number(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>
            </>
          ) : (
            <Text style={settingsStyles.autoText}>
              Goals will be calculated automatically based on your profile
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============ ENTRY DETAIL COMPONENT ============
interface EntryDetailProps {
  entry: FoodEntry;
  onClose: () => void;
  onUpdate: (entry: FoodEntry) => void;
  onDelete: (id: string) => void;
  onFixIssue: (entry: FoodEntry) => Promise<FoodEntry>;
}

const EntryDetail: React.FC<EntryDetailProps> = ({ entry, onClose, onUpdate, onDelete, onFixIssue }) => {
  const [editedEntry, setEditedEntry] = useState<FoodEntry>(entry);
  const [isFixing, setIsFixing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const handleServingsChange = (delta: number) => {
    const newServings = Math.max(0.5, Math.min(10, editedEntry.servings + delta));
    const ratio = newServings / editedEntry.servings;
    setEditedEntry({
      ...editedEntry,
      servings: newServings,
      calories: Math.round(entry.calories * newServings),
      protein: Math.round(entry.protein * newServings),
      carbs: Math.round(entry.carbs * newServings),
      fat: Math.round(entry.fat * newServings),
    });
  };

  const handleFixIssue = async () => {
    setIsFixing(true);
    try {
      const fixedEntry = await onFixIssue(editedEntry);
      setEditedEntry(fixedEntry);
    } catch (error) {
      Alert.alert('Error', 'Failed to re-analyze. Please try again.');
    } finally {
      setIsFixing(false);
    }
  };

  const handleDone = () => {
    onUpdate(editedEntry);
    onClose();
  };

  const handleDelete = () => {
    onDelete(entry.id);
    onClose();
  };

  const totalCalories = Math.round(editedEntry.calories);
  const totalProtein = Math.round(editedEntry.protein);
  const totalCarbs = Math.round(editedEntry.carbs);
  const totalFat = Math.round(editedEntry.fat);

  return (
    <View style={detailStyles.container}>
      <StatusBar style="light" />

      {/* Image Header */}
      <View style={detailStyles.imageContainer}>
        {editedEntry.imageUri ? (
          <Image source={{ uri: editedEntry.imageUri }} style={detailStyles.image} />
        ) : (
          <View style={detailStyles.imagePlaceholder}>
            <Ionicons name="restaurant-outline" size={64} color="#CCC" />
          </View>
        )}
        <View style={detailStyles.imageOverlay} />

        {/* Back Button */}
        <TouchableOpacity style={detailStyles.backButton} onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity style={detailStyles.deleteButton} onPress={() => setShowDeleteConfirm(true)}>
          <Ionicons name="trash-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Content Card */}
      <Animated.View
        style={[
          detailStyles.contentCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Header Row */}
          <View style={detailStyles.headerRow}>
            <View style={detailStyles.timeTag}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={detailStyles.timeText}>{formatTime(editedEntry.timestamp)}</Text>
            </View>
          </View>

          {/* Title and Servings */}
          <View style={detailStyles.titleRow}>
            <Text style={detailStyles.title} numberOfLines={2}>{editedEntry.description}</Text>
            <View style={detailStyles.servingsControl}>
              <TouchableOpacity style={detailStyles.servingBtn} onPress={() => handleServingsChange(-0.5)}>
                <Ionicons name="remove" size={18} color="#FF8C42" />
              </TouchableOpacity>
              <Text style={detailStyles.servingsText}>{editedEntry.servings}</Text>
              <TouchableOpacity style={detailStyles.servingBtn} onPress={() => handleServingsChange(0.5)}>
                <Ionicons name="add" size={18} color="#FF8C42" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Calories Card */}
          <View style={detailStyles.caloriesCard}>
            <View style={detailStyles.caloriesRow}>
              <View style={detailStyles.caloriesIcon}>
                <Ionicons name="flame-outline" size={24} color="#FF8C42" />
              </View>
              <View>
                <Text style={detailStyles.caloriesLabel}>Calories</Text>
                <Text style={detailStyles.caloriesValue}>{totalCalories}</Text>
              </View>
            </View>
          </View>

          {/* Macros Row */}
          <View style={detailStyles.macrosRow}>
            <View style={detailStyles.macroCard}>
              <View style={[detailStyles.macroIcon, { backgroundColor: '#FFEBE5' }]}>
                <Ionicons name="fitness-outline" size={18} color="#FF6B6B" />
              </View>
              <Text style={detailStyles.macroLabel}>Protein</Text>
              <Text style={detailStyles.macroValue}>{totalProtein}g</Text>
            </View>
            <View style={detailStyles.macroCard}>
              <View style={[detailStyles.macroIcon, { backgroundColor: '#FFF5E5' }]}>
                <Ionicons name="leaf-outline" size={18} color="#FF9F43" />
              </View>
              <Text style={detailStyles.macroLabel}>Carbs</Text>
              <Text style={detailStyles.macroValue}>{totalCarbs}g</Text>
            </View>
            <View style={detailStyles.macroCard}>
              <View style={[detailStyles.macroIcon, { backgroundColor: '#E5F4FF' }]}>
                <Ionicons name="water-outline" size={18} color="#45B7D1" />
              </View>
              <Text style={detailStyles.macroLabel}>Fats</Text>
              <Text style={detailStyles.macroValue}>{totalFat}g</Text>
            </View>
          </View>

          {/* Ingredients Section */}
          <View style={detailStyles.ingredientsSection}>
            <View style={detailStyles.ingredientsHeader}>
              <Text style={detailStyles.ingredientsTitle}>Ingredients</Text>
            </View>

            {editedEntry.ingredients.map((ingredient, index) => (
              <View key={index} style={detailStyles.ingredientRow}>
                <View style={detailStyles.ingredientInfo}>
                  <Text style={detailStyles.ingredientName}>{ingredient.name}</Text>
                  <Text style={detailStyles.ingredientCal}>{Math.round(ingredient.calories * editedEntry.servings)} cal</Text>
                </View>
                <Text style={detailStyles.ingredientServing}>{ingredient.serving}</Text>
              </View>
            ))}

            {editedEntry.ingredients.length === 0 && (
              <Text style={detailStyles.noIngredients}>No ingredient breakdown available</Text>
            )}
          </View>

          {/* AI Analysis */}
          {editedEntry.aiAnalysis && (
            <View style={detailStyles.analysisSection}>
              <View style={detailStyles.analysisHeader}>
                <Ionicons name="sparkles" size={16} color="#FF8C42" />
                <Text style={detailStyles.analysisTitle}>AI Analysis</Text>
              </View>
              <Text style={detailStyles.analysisText}>{editedEntry.aiAnalysis}</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={detailStyles.bottomButtons}>
          <TouchableOpacity
            style={detailStyles.fixButton}
            onPress={handleFixIssue}
            disabled={isFixing}
          >
            {isFixing ? (
              <ActivityIndicator size="small" color="#FF8C42" />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={18} color="#FF8C42" />
                <Text style={detailStyles.fixButtonText}>Fix Issue</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={detailStyles.doneButton} onPress={handleDone}>
            <Text style={detailStyles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={detailStyles.modalOverlay}>
          <View style={detailStyles.modalContent}>
            <Ionicons name="trash-outline" size={48} color="#FF4757" style={{ marginBottom: 16 }} />
            <Text style={detailStyles.modalTitle}>Delete Entry?</Text>
            <Text style={detailStyles.modalText}>This action cannot be undone.</Text>
            <View style={detailStyles.modalButtons}>
              <TouchableOpacity style={detailStyles.modalCancel} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={detailStyles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={detailStyles.modalDelete} onPress={handleDelete}>
                <Text style={detailStyles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ============ ENTRY DETAIL STYLES ============
const detailStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  imageContainer: { height: 280, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  backButton: { position: 'absolute', top: 50, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  deleteButton: { position: 'absolute', top: 50, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  contentCard: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, paddingHorizontal: 20, paddingTop: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  timeTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  timeText: { fontSize: 13, color: '#666', marginLeft: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', flex: 1, marginRight: 16 },
  servingsControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5EB', borderRadius: 20, paddingHorizontal: 4 },
  servingBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  servingsText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', minWidth: 32, textAlign: 'center' },
  caloriesCard: { backgroundColor: '#FFF9F5', borderRadius: 16, padding: 16, marginBottom: 16 },
  caloriesRow: { flexDirection: 'row', alignItems: 'center' },
  caloriesIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  caloriesLabel: { fontSize: 14, color: '#666' },
  caloriesValue: { fontSize: 32, fontWeight: '700', color: '#1A1A1A' },
  macrosRow: { flexDirection: 'row', marginBottom: 24 },
  macroCard: { flex: 1, backgroundColor: '#F9F9F9', borderRadius: 12, padding: 12, marginHorizontal: 4, alignItems: 'center' },
  macroIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  macroLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  macroValue: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  ingredientsSection: { marginBottom: 20 },
  ingredientsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ingredientsTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 12, padding: 14, marginBottom: 8 },
  ingredientInfo: { flex: 1 },
  ingredientName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  ingredientCal: { fontSize: 13, color: '#666', marginTop: 2 },
  ingredientServing: { fontSize: 14, color: '#999' },
  noIngredients: { fontSize: 14, color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  analysisSection: { backgroundColor: '#FFF5EB', borderRadius: 12, padding: 14, marginBottom: 20 },
  analysisHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  analysisTitle: { fontSize: 14, fontWeight: '600', color: '#FF8C42', marginLeft: 6 },
  analysisText: { fontSize: 14, color: '#666', lineHeight: 20 },
  bottomButtons: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 20, paddingBottom: 34, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  fixButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#FF8C42', borderRadius: 12, paddingVertical: 14, marginRight: 10 },
  fixButtonText: { fontSize: 16, fontWeight: '600', color: '#FF8C42', marginLeft: 6 },
  doneButton: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, paddingVertical: 14 },
  doneButtonText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '80%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  modalText: { fontSize: 14, color: '#666', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', width: '100%' },
  modalCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#F0F0F0', borderRadius: 10, marginRight: 8 },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
  modalDelete: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#FF4757', borderRadius: 10 },
  modalDeleteText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});

// ============ CAMERA SCREEN COMPONENT ============
type ScanMode = 'photo' | 'barcode' | 'label';

interface CameraScreenProps {
  onClose: () => void;
  onCapture: (image: { uri: string; base64: string }, mode: ScanMode) => void;
  onPickImage: () => void;
}

const CameraScreen: React.FC<CameraScreenProps> = ({ onClose, onCapture, onPickImage }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState<ScanMode>('photo');
  const [flash, setFlash] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanMode === 'barcode' && !scannedBarcode) {
      setScannedBarcode(result.data);
      // Vibrate feedback
      Alert.alert(
        'Barcode Scanned',
        `Found: ${result.data}`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setScannedBarcode(null) },
          { text: 'Look Up', onPress: () => {
            onCapture({ uri: '', base64: result.data }, 'barcode');
          }}
        ]
      );
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.3,
        });
        if (photo && photo.base64) {
          onCapture({ uri: photo.uri, base64: photo.base64 }, scanMode);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  if (!permission) {
    return (
      <View style={cameraStyles.container}>
        <ActivityIndicator size="large" color="#FF8C42" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={cameraStyles.permissionContainer}>
        <StatusBar style="dark" />
        <Ionicons name="camera-outline" size={80} color="#CCC" style={{ marginBottom: 24 }} />
        <Text style={cameraStyles.permissionTitle}>Camera Access Required</Text>
        <Text style={cameraStyles.permissionText}>
          We need camera access to scan your food and barcodes
        </Text>
        <TouchableOpacity style={cameraStyles.permissionButton} onPress={requestPermission}>
          <Text style={cameraStyles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={cameraStyles.permissionCancel} onPress={onClose}>
          <Text style={cameraStyles.permissionCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={cameraStyles.container}>
      <StatusBar style="light" />

      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={cameraStyles.camera}
        facing="back"
        flash={flash ? 'on' : 'off'}
        barcodeScannerSettings={{
          barcodeTypes: scanMode === 'barcode' ? ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] : [],
        }}
        onBarcodeScanned={scanMode === 'barcode' ? handleBarcodeScanned : undefined}
      >
        {/* Top Controls */}
        <View style={cameraStyles.topControls}>
          <TouchableOpacity style={cameraStyles.topButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={cameraStyles.topButton} onPress={() => setFlash(!flash)}>
            <Ionicons name={flash ? 'flash' : 'flash-off'} size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Scan Frame for barcode/label mode */}
        {(scanMode === 'barcode' || scanMode === 'label') && (
          <View style={cameraStyles.scanFrameContainer}>
            <View style={cameraStyles.scanFrame}>
              <View style={[cameraStyles.corner, cameraStyles.cornerTL]} />
              <View style={[cameraStyles.corner, cameraStyles.cornerTR]} />
              <View style={[cameraStyles.corner, cameraStyles.cornerBL]} />
              <View style={[cameraStyles.corner, cameraStyles.cornerBR]} />
            </View>
            <Text style={cameraStyles.scanHint}>
              {scanMode === 'barcode' ? 'Align barcode within frame' : 'Align nutrition label within frame'}
            </Text>
          </View>
        )}

        {/* Bottom Controls */}
        <View style={cameraStyles.bottomControls}>
          {/* Mode Selector */}
          <View style={cameraStyles.modeSelector}>
            <TouchableOpacity
              style={[cameraStyles.modeButton, scanMode === 'photo' && cameraStyles.modeButtonActive]}
              onPress={() => { setScanMode('photo'); setScannedBarcode(null); }}
            >
              <Ionicons name="camera-outline" size={20} color={scanMode === 'photo' ? '#FF8C42' : '#FFF'} />
              <Text style={[cameraStyles.modeText, scanMode === 'photo' && cameraStyles.modeTextActive]}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cameraStyles.modeButton, scanMode === 'barcode' && cameraStyles.modeButtonActive]}
              onPress={() => { setScanMode('barcode'); setScannedBarcode(null); }}
            >
              <Ionicons name="barcode-outline" size={20} color={scanMode === 'barcode' ? '#FF8C42' : '#FFF'} />
              <Text style={[cameraStyles.modeText, scanMode === 'barcode' && cameraStyles.modeTextActive]}>Barcode</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cameraStyles.modeButton, scanMode === 'label' && cameraStyles.modeButtonActive]}
              onPress={() => { setScanMode('label'); setScannedBarcode(null); }}
            >
              <Ionicons name="document-text-outline" size={20} color={scanMode === 'label' ? '#FF8C42' : '#FFF'} />
              <Text style={[cameraStyles.modeText, scanMode === 'label' && cameraStyles.modeTextActive]}>Label</Text>
            </TouchableOpacity>
          </View>

          {/* Capture Controls */}
          <View style={cameraStyles.captureControls}>
            <TouchableOpacity style={cameraStyles.galleryButton} onPress={onPickImage}>
              <Ionicons name="images-outline" size={28} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={cameraStyles.captureButton} onPress={takePicture}>
              <View style={cameraStyles.captureButtonInner}>
                {scanMode === 'barcode' ? (
                  <Ionicons name="scan-outline" size={32} color="#FF8C42" />
                ) : (
                  <View style={cameraStyles.captureButtonCore} />
                )}
              </View>
            </TouchableOpacity>

            <View style={cameraStyles.placeholderButton} />
          </View>
        </View>
      </CameraView>
    </View>
  );
};

// ============ CAMERA SCREEN STYLES ============
const cameraStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  permissionContainer: { flex: 1, backgroundColor: '#FDF6E9', justifyContent: 'center', alignItems: 'center', padding: 40 },
  permissionTitle: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 12, textAlign: 'center' },
  permissionText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  permissionButton: { backgroundColor: '#FF8C42', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12, marginBottom: 16 },
  permissionButtonText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  permissionCancel: { paddingVertical: 12 },
  permissionCancelText: { fontSize: 16, color: '#666' },
  topControls: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 20 },
  topButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  scanFrameContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 280, height: 180, position: 'relative' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#FF8C42', borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanHint: { color: '#FFF', fontSize: 14, marginTop: 20, textAlign: 'center' },
  bottomControls: { paddingBottom: 40 },
  modeSelector: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30, paddingHorizontal: 20 },
  modeButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginHorizontal: 6 },
  modeButtonActive: { backgroundColor: 'rgba(255,140,66,0.2)' },
  modeText: { fontSize: 14, color: '#FFF', marginLeft: 6 },
  modeTextActive: { color: '#FF8C42', fontWeight: '600' },
  captureControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 40 },
  galleryButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  captureButtonInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FFF', borderWidth: 3, borderColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },
  captureButtonCore: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#FF8C42' },
  placeholderButton: { width: 56, height: 56 },
});

// ============ MAIN APP ============
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64: string } | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEntryDetail, setShowEntryDetail] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // Load profile from storage
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem('userProfile');
      if (stored) {
        setProfile(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (newProfile: UserProfile) => {
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(newProfile));
      setProfile(newProfile);
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  };

  const goals = {
    calories: profile.calorieGoal,
    protein: profile.proteinGoal,
    carbs: profile.carbsGoal,
    fat: profile.fatGoal,
  };

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
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.3,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setSelectedImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
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
      quality: 0.3,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setSelectedImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
    }
  };

  const addEntry = useCallback(async () => {
    if (!inputText.trim() && !selectedImage) return;
    setIsAnalyzing(true);
    try {
      const description = inputText.trim() || 'Food from photo';
      const result = await analyzeWithAI(description, selectedImage?.base64, selectedImage?.uri);
      const newEntry: FoodEntry = {
        id: Date.now().toString(),
        description: result.description,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        imageUri: selectedImage?.uri,
        imageBase64: selectedImage?.base64,
        aiAnalysis: result.analysis,
        ingredients: result.ingredients || [],
        servings: 1,
        timestamp: Date.now(),
      };
      setEntries(prev => [newEntry, ...prev]);
      setInputText('');
      setSelectedImage(null);
      Keyboard.dismiss();
    } catch (error: any) {
      Alert.alert('Error', `Failed to analyze: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [inputText, selectedImage]);

  const updateEntry = useCallback((updatedEntry: FoodEntry) => {
    setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
  }, []);

  const fixEntryIssue = useCallback(async (entry: FoodEntry): Promise<FoodEntry> => {
    const result = await analyzeWithAI(entry.description, entry.imageBase64, entry.imageUri);
    return {
      ...entry,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      aiAnalysis: result.analysis,
      ingredients: result.ingredients || [],
      servings: 1,
    };
  }, []);

  const deleteEntry = useCallback((id: string) => {
    Alert.alert('Delete Entry', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setEntries(prev => prev.filter(e => e.id !== id)) },
    ]);
  }, []);

  const handleCameraCapture = useCallback(async (image: { uri: string; base64: string }, mode: ScanMode) => {
    setShowCamera(false);

    if (mode === 'barcode') {
      // For barcode, the base64 field contains the barcode data
      setInputText(`Barcode: ${image.base64}`);
      // Trigger analysis with the barcode
      setIsAnalyzing(true);
      try {
        const result = await analyzeWithAI(`Food product with barcode: ${image.base64}. Please identify this product and provide nutritional information.`);
        const newEntry: FoodEntry = {
          id: Date.now().toString(),
          description: result.description,
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fat: result.fat,
          aiAnalysis: result.analysis,
          ingredients: result.ingredients || [],
          servings: 1,
          timestamp: Date.now(),
        };
        setEntries(prev => [newEntry, ...prev]);
        setInputText('');
      } catch (error: any) {
        Alert.alert('Error', `Failed to look up barcode: ${error.message}`);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      // For photo or label mode, set the image for processing
      setSelectedImage(image);
      if (mode === 'label') {
        setInputText('Nutrition label');
      }
    }
  }, []);

  const handleCameraPickImage = useCallback(async () => {
    setShowCamera(false);
    await pickImage();
  }, []);

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
          <View style={[styles.progressBarFill, { flex: progress, backgroundColor: isOver ? '#FF4757' : color }]} />
          <View style={{ flex: Math.max(0, 1 - progress) }} />
        </View>
      </View>
    );
  };

  const renderEntry = (item: FoodEntry) => (
    <TouchableOpacity
      key={item.id}
      style={styles.entryCard}
      onPress={() => { setSelectedEntry(item); setShowEntryDetail(true); }}
      onLongPress={() => deleteEntry(item.id)}
    >
      <View style={styles.entryRow}>
        {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.entryThumbnail} />}
        <View style={styles.entryDetails}>
          <View style={styles.entryContent}>
            <Text style={styles.entryDescription} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.entryCalories}>{item.calories} cal</Text>
          </View>
          <Text style={styles.entryMacros}>P: {item.protein}g  C: {item.carbs}g  F: {item.fat}g</Text>
          {item.aiAnalysis && <Text style={styles.entryAnalysis} numberOfLines={1}>🤖 {item.aiAnalysis}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#FF8C42" />
        </View>
      </SafeAreaProvider>
    );
  }

  // Show onboarding if not complete
  if (!profile.onboardingComplete) {
    return (
      <SafeAreaProvider>
        <Onboarding onComplete={saveProfile} />
      </SafeAreaProvider>
    );
  }

  // Show settings
  if (showSettings) {
    return (
      <SafeAreaProvider>
        <Settings profile={profile} onSave={saveProfile} onClose={() => setShowSettings(false)} />
      </SafeAreaProvider>
    );
  }

  // Show entry detail
  if (showEntryDetail && selectedEntry) {
    return (
      <SafeAreaProvider>
        <EntryDetail
          entry={selectedEntry}
          onClose={() => { setShowEntryDetail(false); setSelectedEntry(null); }}
          onUpdate={updateEntry}
          onDelete={(id) => { setEntries(prev => prev.filter(e => e.id !== id)); }}
          onFixIssue={fixEntryIssue}
        />
      </SafeAreaProvider>
    );
  }

  // Show camera screen
  if (showCamera) {
    return (
      <SafeAreaProvider>
        <CameraScreen
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraCapture}
          onPickImage={handleCameraPickImage}
        />
      </SafeAreaProvider>
    );
  }

  // Main app
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>Hey {profile.name || 'there'}! 👋</Text>
            <Text style={styles.headerTitle}>Today</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettings(true)}>
            <Ionicons name="settings-outline" size={22} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Calories remaining card */}
          <View style={styles.caloriesCard}>
            <Text style={styles.caloriesLabel}>Calories remaining</Text>
            <Text style={[styles.caloriesValue, remainingCalories < 0 ? styles.caloriesOver : null]}>
              {remainingCalories}
            </Text>
            <Text style={styles.caloriesSubtext}>
              {totals.calories} eaten • {goals.calories} goal
            </Text>
          </View>

          {/* Goals Card */}
          <View style={styles.goalsCard}>
            <Text style={styles.goalsTitle}>Macros</Text>
            {renderProgressBar('Protein', totals.protein, goals.protein, '#FF9F43')}
            {renderProgressBar('Carbs', totals.carbs, goals.carbs, '#45B7D1')}
            {renderProgressBar('Fat', totals.fat, goals.fat, '#26DE81')}
          </View>

          {/* Entries */}
          {entries.length > 0 && (
            <View style={styles.entriesSection}>
              <Text style={styles.sectionTitle}>Today's Log</Text>
              {entries.map(renderEntry)}
              <Text style={styles.hintText}>Tap for details • Long press to delete</Text>
            </View>
          )}

          {entries.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptySubtitle}>Take a photo or describe what you ate</Text>
            </View>
          )}
        </ScrollView>

        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputSection}>
          {isAnalyzing && (
            <View style={styles.analyzingBanner}>
              <ActivityIndicator size="small" color="#FF8C42" />
              <Text style={styles.analyzingText}>🤖 AI is analyzing...</Text>
            </View>
          )}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowCamera(true)} disabled={isAnalyzing}>
              <Ionicons name="scan-outline" size={22} color="#1A1A1A" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={pickImage} disabled={isAnalyzing}>
              <Ionicons name="image-outline" size={22} color="#1A1A1A" />
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
              style={[styles.addButton, ((!inputText.trim() && !selectedImage) || isAnalyzing) ? styles.addButtonDisabled : null]}
              onPress={addEntry}
              disabled={(!inputText.trim() && !selectedImage) || isAnalyzing}
            >
              {isAnalyzing ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.addButtonText}>+</Text>}
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ============ ONBOARDING STYLES ============
const onboardingStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6E9' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  animatedContainer: { flex: 1, justifyContent: 'center' },
  progressContainer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 20 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DDD', marginHorizontal: 4 },
  progressDotActive: { backgroundColor: '#FF8C42', width: 24 },
  progressDotComplete: { backgroundColor: '#FF8C42' },
  stepContent: { alignItems: 'center', paddingVertical: 20 },
  emoji: { fontSize: 80, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  featureList: { width: '100%', marginTop: 20 },
  featureItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12 },
  featureIcon: { fontSize: 24, marginRight: 16 },
  featureText: { fontSize: 16, color: '#1A1A1A', flex: 1 },
  input: { width: '100%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 18, color: '#1A1A1A', textAlign: 'center' },
  toggleRow: { flexDirection: 'row', marginBottom: 20 },
  toggleButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#FFF', marginHorizontal: 4, alignItems: 'center' },
  toggleActive: { backgroundColor: '#FF8C42' },
  toggleText: { fontSize: 14, color: '#666' },
  toggleTextActive: { color: '#FFF', fontWeight: '600' },
  inputRow: { flexDirection: 'row', width: '100%', marginBottom: 16 },
  inputGroup: { flex: 1, marginHorizontal: 4 },
  inputLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  inputSmall: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, fontSize: 16, color: '#1A1A1A', textAlign: 'center' },
  genderRow: { flexDirection: 'row' },
  genderButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#FFF', marginHorizontal: 2, alignItems: 'center' },
  genderActive: { backgroundColor: '#FF8C42' },
  genderEmoji: { fontSize: 24 },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 12, marginBottom: 10, width: '100%', borderWidth: 2, borderColor: 'transparent' },
  optionCardActive: { borderColor: '#FF8C42', backgroundColor: '#FFF5EB' },
  optionEmoji: { fontSize: 28, marginRight: 14 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  optionDesc: { fontSize: 13, color: '#666', marginTop: 2 },
  goalCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 12, alignItems: 'center', width: '100%', borderWidth: 2, borderColor: 'transparent' },
  goalCardActive: { borderWidth: 2 },
  goalEmoji: { fontSize: 40, marginBottom: 8 },
  goalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  goalDesc: { fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center' },
  summaryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, width: '100%', marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 16, color: '#666' },
  summaryValue: { fontSize: 32, fontWeight: '700', color: '#FF8C42' },
  summaryDivider: { height: 1, backgroundColor: '#EEE', marginVertical: 16 },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  macroLabel: { fontSize: 14, color: '#666', marginTop: 4 },
  readyText: { fontSize: 18, color: '#666', marginTop: 10 },
  buttonContainer: { flexDirection: 'row', padding: 20, gap: 12 },
  backButton: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, backgroundColor: '#EEE' },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  nextButton: { flex: 2, paddingVertical: 16, borderRadius: 12, backgroundColor: '#FF8C42', alignItems: 'center' },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});

// ============ SETTINGS STYLES ============
const settingsStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  cancelText: { fontSize: 16, color: '#666' },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  saveText: { fontSize: 16, fontWeight: '600', color: '#FF8C42' },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 8 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  label: { fontSize: 16, color: '#1A1A1A' },
  input: { flex: 1, fontSize: 16, color: '#1A1A1A', textAlign: 'right' },
  inputSmall: { width: 80, fontSize: 16, color: '#1A1A1A', textAlign: 'right', backgroundColor: '#F5F5F5', padding: 8, borderRadius: 8 },
  toggleRow: { flexDirection: 'row' },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F5F5F5', marginLeft: 8 },
  toggleActive: { backgroundColor: '#FF8C42' },
  toggleText: { fontSize: 14, color: '#666' },
  toggleTextActive: { color: '#FFF' },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 16 },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4 },
  optionActive: { backgroundColor: '#FFF5EB' },
  optionText: { fontSize: 16, color: '#1A1A1A' },
  customToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  toggleIndicator: { fontSize: 18, color: '#FF8C42' },
  autoText: { fontSize: 14, color: '#999', fontStyle: 'italic', marginTop: 8 },
});

// ============ MAIN STYLES ============
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6E9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerGreeting: { fontSize: 14, color: '#666' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#1A1A1A' },
  settingsButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 20 },
  caloriesCard: { backgroundColor: '#FF8C42', borderRadius: 20, padding: 24, marginBottom: 16, alignItems: 'center' },
  caloriesLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  caloriesValue: { fontSize: 56, fontWeight: '700', color: '#FFF' },
  caloriesOver: { color: '#FFE0D0' },
  caloriesSubtext: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  goalsCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  goalsTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  progressItem: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
  progressValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  progressValueOver: { color: '#FF4757' },
  progressBarBg: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, flexDirection: 'row' },
  progressBarFill: { height: 8, borderRadius: 4 },
  entriesSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  hintText: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 8 },
  entryCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 10 },
  entryRow: { flexDirection: 'row' },
  entryThumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  entryDetails: { flex: 1 },
  entryContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  entryDescription: { fontSize: 15, fontWeight: '500', color: '#1A1A1A', flex: 1, marginRight: 10 },
  entryCalories: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  entryMacros: { fontSize: 12, color: '#666' },
  entryAnalysis: { fontSize: 11, color: '#888', marginTop: 4, fontStyle: 'italic' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
  imagePreviewContainer: { paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center' },
  imagePreview: { width: 120, height: 90, borderRadius: 12 },
  removeImageButton: { position: 'absolute', top: 5, right: 25, backgroundColor: '#FF4757', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  removeImageText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  inputSection: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FDF6E9' },
  analyzingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF5EB', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 10 },
  analyzingText: { fontSize: 13, color: '#FF8C42', marginLeft: 8, fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  input: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#1A1A1A', marginRight: 8 },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF8C42', justifyContent: 'center', alignItems: 'center' },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { fontSize: 24, fontWeight: '600', color: '#FFF' },
});
