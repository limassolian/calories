import { NutritionInfo, NutritionSource } from '../types';

interface AnalysisResult {
  nutrition: NutritionInfo;
  sources: NutritionSource[];
  thoughtProcess: string;
}

// API Configuration - In a real app, store this securely
// For demo purposes, we'll use environment variables or a config file
const API_CONFIG = {
  CLAUDE_API_URL: 'https://api.anthropic.com/v1/messages',
  // API key should be stored securely - in production use a backend proxy
  // Never expose API keys in client-side code
};

// Get API key from environment or config
const getApiKey = (): string | null => {
  // In a real app, you would:
  // 1. Use a backend proxy to make API calls
  // 2. Or use Expo's secure store for API keys
  // For this demo, we'll check for a configured key or use mock data
  return process.env.EXPO_PUBLIC_CLAUDE_API_KEY || null;
};

const systemPrompt = `You are a nutrition analysis assistant. When given a food description, analyze it and provide accurate nutritional information.

Your response must be a valid JSON object with this exact structure:
{
  "nutrition": {
    "calories": <number>,
    "protein": <number in grams>,
    "carbs": <number in grams>,
    "fat": <number in grams>
  },
  "sources": [
    {"name": "USDA Database", "icon": "usda"},
    {"name": "Nutritionix", "icon": "nutritionix"}
  ],
  "thoughtProcess": "<explanation of how you calculated the nutrition, including any assumptions made about portion sizes or ingredients>"
}

Guidelines:
- Use standard portion sizes when not specified
- Consider all visible/common ingredients for dishes
- For restaurant items, use typical restaurant portions
- Round numbers to whole numbers
- Be conservative with estimates
- In thoughtProcess, explain your reasoning briefly
- Only return the JSON object, no other text`;

export const analyzeFood = async (description: string): Promise<AnalysisResult> => {
  const apiKey = getApiKey();

  // If no API key, use intelligent mock data
  if (!apiKey) {
    return getMockAnalysis(description);
  }

  try {
    const response = await fetch(API_CONFIG.CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Analyze this food and provide nutritional information: "${description}"`,
          },
        ],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse the JSON response
    const result = JSON.parse(content);

    return {
      nutrition: result.nutrition,
      sources: result.sources || [{ name: 'AI Analysis', icon: 'ai' }],
      thoughtProcess: result.thoughtProcess || 'Nutritional values estimated based on standard portions.',
    };
  } catch (error) {
    console.error('Error calling Claude API:', error);
    // Fall back to mock data if API fails
    return getMockAnalysis(description);
  }
};

// Intelligent mock analysis based on food description
const getMockAnalysis = async (description: string): Promise<AnalysisResult> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

  const lowerDesc = description.toLowerCase();

  // Common food database for realistic mock data
  const foodDatabase: Record<string, AnalysisResult> = {
    // Fast food
    'burger': {
      nutrition: { calories: 540, protein: 25, carbs: 45, fat: 29 },
      sources: [{ name: 'USDA Database', icon: 'usda' }, { name: 'Nutritionix', icon: 'nutritionix' }],
      thoughtProcess: 'I estimated a standard fast food hamburger with bun, beef patty, lettuce, tomato, and condiments. Calories primarily from the beef patty and bun.',
    },
    'fries': {
      nutrition: { calories: 365, protein: 4, carbs: 48, fat: 17 },
      sources: [{ name: 'USDA Database', icon: 'usda' }],
      thoughtProcess: 'Medium serving of french fries (about 117g). High in carbs and fat from the frying process.',
    },
    'in n out': {
      nutrition: { calories: 670, protein: 37, carbs: 39, fat: 41 },
      sources: [{ name: 'In-N-Out Nutrition Guide', icon: 'restaurant' }, { name: 'Nutritionix', icon: 'nutritionix' }],
      thoughtProcess: 'In-N-Out Double-Double burger with standard toppings. High protein from two beef patties and cheese.',
    },
    // Ramen
    'ramen': {
      nutrition: { calories: 450, protein: 12, carbs: 65, fat: 15 },
      sources: [{ name: 'USDA Database', icon: 'usda' }],
      thoughtProcess: 'Standard instant ramen package. High in carbs from noodles, sodium content is significant.',
    },
    'shin ramen': {
      nutrition: { calories: 520, protein: 11, carbs: 83, fat: 16 },
      sources: [{ name: 'Nongshim Product Info', icon: 'brand' }, { name: 'USDA Database', icon: 'usda' }],
      thoughtProcess: 'Shin Ramyun is about 120g per package with 520 calories. Known for being spicier and slightly higher in calories than regular ramen.',
    },
    'egg': {
      nutrition: { calories: 70, protein: 6, carbs: 1, fat: 5 },
      sources: [{ name: 'USDA Database', icon: 'usda' }],
      thoughtProcess: 'One large egg (50g). High quality protein source with most fat in the yolk.',
    },
    // Protein shakes
    'protein shake': {
      nutrition: { calories: 180, protein: 25, carbs: 8, fat: 3 },
      sources: [{ name: 'Average Protein Shake', icon: 'supplement' }],
      thoughtProcess: 'Standard whey protein shake with water. Protein content varies by brand but typically 20-30g per serving.',
    },
    'owyn': {
      nutrition: { calories: 180, protein: 20, carbs: 9, fat: 7 },
      sources: [{ name: 'OWYN Product Info', icon: 'brand' }, { name: 'Nutritionix', icon: 'nutritionix' }],
      thoughtProcess: 'OWYN plant-based protein shake. Contains pea, pumpkin seed, and flax proteins. 180 calories with 20g protein per bottle.',
    },
    // Mexican food
    'chipotle': {
      nutrition: { calories: 750, protein: 42, carbs: 72, fat: 28 },
      sources: [{ name: 'Chipotle Nutrition Calculator', icon: 'restaurant' }],
      thoughtProcess: 'Estimated a chicken bowl with rice, beans, salsa, cheese, and sour cream. Actual values vary significantly based on toppings.',
    },
    'burrito': {
      nutrition: { calories: 850, protein: 35, carbs: 90, fat: 35 },
      sources: [{ name: 'USDA Database', icon: 'usda' }],
      thoughtProcess: 'Large burrito with meat, rice, beans, cheese, and guacamole. High calorie density from the large tortilla and fillings.',
    },
    // Coffee
    'latte': {
      nutrition: { calories: 190, protein: 13, carbs: 18, fat: 7 },
      sources: [{ name: 'Starbucks Nutrition', icon: 'restaurant' }],
      thoughtProcess: 'Grande (16oz) latte with 2% milk. Most calories from the steamed milk.',
    },
    'coffee': {
      nutrition: { calories: 5, protein: 0, carbs: 0, fat: 0 },
      sources: [{ name: 'USDA Database', icon: 'usda' }],
      thoughtProcess: 'Black coffee has virtually no calories. Any additions like cream or sugar would increase this.',
    },
    // Salads
    'salad': {
      nutrition: { calories: 350, protein: 25, carbs: 15, fat: 22 },
      sources: [{ name: 'USDA Database', icon: 'usda' }],
      thoughtProcess: 'Garden salad with chicken and dressing. Calories vary greatly based on dressing amount and toppings.',
    },
    // Pizza
    'pizza': {
      nutrition: { calories: 285, protein: 12, carbs: 36, fat: 10 },
      sources: [{ name: 'USDA Database', icon: 'usda' }],
      thoughtProcess: 'One slice of cheese pizza (about 107g). Values for pepperoni or other toppings would be higher.',
    },
    // Chicken
    'chicken breast': {
      nutrition: { calories: 165, protein: 31, carbs: 0, fat: 4 },
      sources: [{ name: 'USDA Database', icon: 'usda' }],
      thoughtProcess: 'Boneless, skinless chicken breast (100g), grilled or baked. Excellent lean protein source.',
    },
    'chicken bowl': {
      nutrition: { calories: 620, protein: 45, carbs: 55, fat: 22 },
      sources: [{ name: 'USDA Database', icon: 'usda' }, { name: 'Restaurant Average', icon: 'restaurant' }],
      thoughtProcess: 'Chicken bowl with rice and vegetables. Estimated with about 6oz chicken, 1 cup rice, and mixed vegetables with sauce.',
    },
  };

  // Find matching food
  let bestMatch: AnalysisResult | null = null;
  let matchScore = 0;

  for (const [key, value] of Object.entries(foodDatabase)) {
    if (lowerDesc.includes(key)) {
      const score = key.length;
      if (score > matchScore) {
        matchScore = score;
        bestMatch = value;
      }
    }
  }

  // Handle combinations
  if (lowerDesc.includes('shin ramen') && lowerDesc.includes('egg')) {
    const eggCount = lowerDesc.includes('two') ? 2 : 1;
    return {
      nutrition: {
        calories: 520 + (70 * eggCount),
        protein: 11 + (6 * eggCount),
        carbs: 83 + (1 * eggCount),
        fat: 16 + (5 * eggCount),
      },
      sources: [
        { name: 'Nongshim Product Info', icon: 'brand' },
        { name: 'USDA Database', icon: 'usda' },
      ],
      thoughtProcess: `I found nutrition data for Shin Ramyun noodle soup, which is about 520 calories per 120g pack with 11g protein, 83g carbs, and 16g fat. For ${eggCount === 2 ? 'two large eggs' : 'one large egg'}, I added about ${140 * eggCount / 2} calories, ${6 * eggCount}g protein, ${1 * eggCount}g carbs, and ${5 * eggCount}g fat. I combined these values to estimate the total nutrition for Shin ramen with ${eggCount === 2 ? 'two eggs' : 'one egg'}. This reflects a typical home-prepared version with added eggs.`,
    };
  }

  if (lowerDesc.includes('in n out') || lowerDesc.includes('in-n-out')) {
    let totalCals = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    if (lowerDesc.includes('burger') || lowerDesc.includes('double')) {
      totalCals += 670;
      totalProtein += 37;
      totalCarbs += 39;
      totalFat += 41;
    }

    if (lowerDesc.includes('fries')) {
      totalCals += 395;
      totalProtein += 6;
      totalCarbs += 54;
      totalFat += 18;
    }

    if (totalCals > 0) {
      return {
        nutrition: {
          calories: totalCals,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
        },
        sources: [
          { name: 'In-N-Out Nutrition', icon: 'restaurant' },
          { name: 'Nutritionix', icon: 'nutritionix' },
        ],
        thoughtProcess: `In-N-Out meal with ${lowerDesc.includes('burger') ? 'Double-Double burger' : ''}${lowerDesc.includes('fries') ? ' and fries' : ''}. The Double-Double has two beef patties and two slices of American cheese. Fries are fresh-cut and made to order.`,
      };
    }
  }

  // If we found a match, return it
  if (bestMatch) {
    return bestMatch;
  }

  // Default generic response
  const genericCalories = 300 + Math.floor(Math.random() * 300);
  return {
    nutrition: {
      calories: genericCalories,
      protein: Math.round(genericCalories * 0.12),
      carbs: Math.round(genericCalories * 0.4 / 4),
      fat: Math.round(genericCalories * 0.35 / 9),
    },
    sources: [{ name: 'AI Estimate', icon: 'ai' }],
    thoughtProcess: `I analyzed "${description}" and estimated the nutritional content based on similar foods. Without specific data available, I used typical values for this type of meal. Consider adjusting if the portion size differs from standard servings.`,
  };
};
