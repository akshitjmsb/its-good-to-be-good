/**
 * Fallback content for development mode or API failures
 */

export interface AnalyticsContent {
    sql: { title: string; prompt: string; solution: string };
    dax: { title: string; prompt: string; solution: string };
    snowflake: { title: string; prompt: string; solution: string };
    dbt: { title: string; prompt: string; solution: string };
    dataManagement: { title: string; explanation: string };
    dataQuality: { title: string; dataType: string; issues: string[]; transformations: string[] };
}

export interface PhysicsContent {
    title: string;
    explanation: string;
}

export interface FrenchWord {
    word: string;
    cue: string;
    meaning: string;
}

export interface FrenchContent {
    sound: string;
    words: FrenchWord[];
}

export interface Exercise {
    name: string;
    muscleGroup?: string;
    muscleGroups?: string;
    sets: string;
    reps: string;
    rest: string;
    instructions: string;
    tips: string;
}

export interface ExerciseDay {
    exercises?: Exercise[];
    activities?: string[];
    notes: string;
}

export interface ExercisePlanContent {
    push: ExerciseDay;
    pull: ExerciseDay;
    legs: ExerciseDay;
    upper: ExerciseDay;
    rest: ExerciseDay;
}

export interface WeeklyExerciseContent {
    sunday: { type: string; activities: string[]; notes: string };
    monday: { type: string; exercises: Exercise[]; notes: string };
    tuesday: { type: string; activities: string[]; notes: string };
    wednesday: { type: string; exercises: Exercise[]; notes: string };
    thursday: { type: string; activities: string[]; notes: string };
    friday: { type: string; exercises: Exercise[]; notes: string };
    saturday: { type: string; exercises: Exercise[]; notes: string };
}

export interface GuitarPoolItem {
    title: string;
    artist: string;
}

export function getFallbackClassicRockPool(): GuitarPoolItem[] {
    return [
        { title: "Stairway to Heaven", artist: "Led Zeppelin" },
        { title: "Hotel California", artist: "Eagles" },
        { title: "Sweet Child O' Mine", artist: "Guns N' Roses" },
        { title: "Back in Black", artist: "AC/DC" },
        { title: "Smoke on the Water", artist: "Deep Purple" },
        { title: "Wish You Were Here", artist: "Pink Floyd" },
        { title: "Comfortably Numb", artist: "Pink Floyd" },
        { title: "Sultans of Swing", artist: "Dire Straits" },
        { title: "Free Bird", artist: "Lynyrd Skynyrd" },
        { title: "Layla", artist: "Derek and the Dominos" },
        { title: "Another Brick in the Wall, Pt. 2", artist: "Pink Floyd" },
        { title: "Black Dog", artist: "Led Zeppelin" },
        { title: "Paranoid", artist: "Black Sabbath" },
        { title: "Crazy Train", artist: "Ozzy Osbourne" },
        { title: "Whole Lotta Love", artist: "Led Zeppelin" },
        { title: "Bohemian Rhapsody", artist: "Queen" },
        { title: "Dream On", artist: "Aerosmith" },
        { title: "More Than a Feeling", artist: "Boston" },
        { title: "Born to Be Wild", artist: "Steppenwolf" },
        { title: "Life in the Fast Lane", artist: "Eagles" },
        { title: "Carry on Wayward Son", artist: "Kansas" },
        { title: "All Right Now", artist: "Free" },
        { title: "You Really Got Me", artist: "The Kinks" },
        { title: "Sunshine of Your Love", artist: "Cream" },
        { title: "Purple Haze", artist: "Jimi Hendrix" },
        { title: "Little Wing", artist: "Jimi Hendrix" },
        { title: "Johnny B. Goode", artist: "Chuck Berry" },
        { title: "Tush", artist: "ZZ Top" },
        { title: "La Grange", artist: "ZZ Top" },
        { title: "Roundabout", artist: "Yes" },
        { title: "Baba O'Riley", artist: "The Who" },
        { title: "Won't Get Fooled Again", artist: "The Who" },
        { title: "Rebel Rebel", artist: "David Bowie" },
        { title: "The Boys Are Back in Town", artist: "Thin Lizzy" },
        { title: "Runnin' with the Devil", artist: "Van Halen" },
        { title: "Panama", artist: "Van Halen" },
        { title: "The Trooper", artist: "Iron Maiden" },
        { title: "Breaking the Law", artist: "Judas Priest" },
        { title: "Highway to Hell", artist: "AC/DC" },
        { title: "Rock You Like a Hurricane", artist: "Scorpions" }
    ];
}

export function getFallbackAnalytics(): AnalyticsContent {
    return {
        sql: {
            title: "Sample SQL Challenge",
            prompt: "Write a query to find the top 10 customers by total purchase amount.",
            solution: "SELECT customer_id, SUM(amount) as total_purchase FROM orders GROUP BY customer_id ORDER BY total_purchase DESC LIMIT 10;"
        },
        dax: {
            title: "Sample DAX Challenge",
            prompt: "Create a measure to calculate year-over-year growth.",
            solution: "YoY Growth = DIVIDE([Current Year Sales] - [Previous Year Sales], [Previous Year Sales])"
        },
        snowflake: {
            title: "Sample Snowflake Challenge",
            prompt: "How do you handle time travel in Snowflake?",
            solution: "Use AT or BEFORE clauses with timestamps to query historical data."
        },
        dbt: {
            title: "Sample dbt Challenge",
            prompt: "Create a model that transforms raw data into a clean fact table.",
            solution: "Use incremental models with proper tests and documentation."
        },
        dataManagement: {
            title: "Data Governance",
            explanation: "Data governance ensures data quality, security, and compliance across the organization."
        },
        dataQuality: {
            title: "String Data Quality Issues",
            dataType: "String (VARCHAR)",
            issues: ["Null values", "Empty strings", "Inconsistent formatting", "Special characters"],
            transformations: ["COALESCE to handle nulls", "TRIM to remove whitespace", "UPPER/LOWER for consistency", "REGEXP_REPLACE for special chars"]
        }
    };
}

export function getFallbackPhysics(): PhysicsContent {
    return {
        title: "How Airplane Wings Work",
        explanation: "Airplane wings create lift by creating a pressure difference. Air moves faster over the top of the wing, creating lower pressure, while slower air underneath creates higher pressure, pushing the wing upward."
    };
}

export function getFallbackFrench(): FrenchContent {
    return {
        sound: "on",
        words: [
            { word: "bon", cue: "like 'bone'", meaning: "good" },
            { word: "mon", cue: "like 'moan'", meaning: "my" },
            { word: "ton", cue: "like 'tone'", meaning: "your" },
            { word: "son", cue: "like 'sown'", meaning: "his/her" },
            { word: "non", cue: "like 'known'", meaning: "no" },
            { word: "don", cue: "like 'dawn'", meaning: "gift" },
            { word: "pont", cue: "like 'pawn'", meaning: "bridge" },
            { word: "front", cue: "like 'frawn'", meaning: "front" },
            { word: "mont", cue: "like 'mawn'", meaning: "mountain" },
            { word: "compte", cue: "like 'kawn'", meaning: "account" }
        ]
    };
}

export function getFallbackExercisePlan(): ExercisePlanContent {
    return {
        push: {
            exercises: [
                {
                    name: "Bench Press",
                    muscleGroup: "Chest, Shoulders, Triceps",
                    sets: "4",
                    reps: "8-10",
                    rest: "90s",
                    instructions: "Lie on bench, grip bar slightly wider than shoulders, lower to chest, press up explosively",
                    tips: "Keep core tight, maintain neutral spine"
                },
                {
                    name: "Overhead Press",
                    muscleGroup: "Shoulders, Triceps",
                    sets: "3",
                    reps: "8-12",
                    rest: "60s",
                    instructions: "Stand with feet hip-width, press weight overhead, lower to shoulders",
                    tips: "Engage core, avoid arching back"
                },
                {
                    name: "Dips",
                    muscleGroup: "Chest, Triceps",
                    sets: "3",
                    reps: "8-15",
                    rest: "60s",
                    instructions: "Support body on bars, lower until shoulders below elbows, press up",
                    tips: "Lean slightly forward for chest emphasis"
                }
            ],
            notes: "Focus on compound movements for maximum muscle activation"
        },
        pull: {
            exercises: [
                {
                    name: "Pull-ups",
                    muscleGroup: "Lats, Biceps, Rear Delts",
                    sets: "4",
                    reps: "5-10",
                    rest: "90s",
                    instructions: "Hang from bar, pull body up until chin over bar, lower with control",
                    tips: "Use full range of motion, engage lats"
                },
                {
                    name: "Bent-over Rows",
                    muscleGroup: "Lats, Rhomboids, Biceps",
                    sets: "3",
                    reps: "8-12",
                    rest: "60s",
                    instructions: "Hinge at hips, row weight to lower chest, squeeze shoulder blades",
                    tips: "Keep back straight, core engaged"
                },
                {
                    name: "Face Pulls",
                    muscleGroup: "Rear Delts, Rhomboids",
                    sets: "3",
                    reps: "12-15",
                    rest: "45s",
                    instructions: "Pull cable to face, separate hands at face level",
                    tips: "Focus on external rotation"
                }
            ],
            notes: "Emphasize pulling movements to balance pushing exercises"
        },
        legs: {
            exercises: [
                {
                    name: "Squats",
                    muscleGroup: "Quads, Glutes, Hamstrings",
                    sets: "4",
                    reps: "8-12",
                    rest: "90s",
                    instructions: "Stand with feet shoulder-width, lower until thighs parallel, drive up through heels",
                    tips: "Keep chest up, knees tracking over toes"
                },
                {
                    name: "Romanian Deadlifts",
                    muscleGroup: "Hamstrings, Glutes",
                    sets: "3",
                    reps: "8-10",
                    rest: "90s",
                    instructions: "Hinge at hips, lower weight along legs, feel stretch in hamstrings",
                    tips: "Keep back straight, slight knee bend"
                },
                {
                    name: "Walking Lunges",
                    muscleGroup: "Quads, Glutes, Hamstrings",
                    sets: "3",
                    reps: "10 each leg",
                    rest: "60s",
                    instructions: "Step forward into lunge, push back to standing, alternate legs",
                    tips: "Keep torso upright, control the movement"
                }
            ],
            notes: "Focus on proper form and full range of motion"
        },
        upper: {
            exercises: [
                {
                    name: "Incline Bench Press",
                    muscleGroup: "Upper Chest, Shoulders",
                    sets: "4",
                    reps: "8-10",
                    rest: "90s",
                    instructions: "Set bench to 30-45 degree incline, press weight to upper chest",
                    tips: "Focus on upper chest activation"
                },
                {
                    name: "Pull-ups",
                    muscleGroup: "Lats, Biceps",
                    sets: "4",
                    reps: "6-10",
                    rest: "90s",
                    instructions: "Hang from bar, pull body up until chin over bar",
                    tips: "Use full range of motion"
                },
                {
                    name: "Dumbbell Shoulder Press",
                    muscleGroup: "Shoulders, Triceps",
                    sets: "3",
                    reps: "8-12",
                    rest: "60s",
                    instructions: "Press dumbbells overhead, lower to shoulder level",
                    tips: "Keep core tight"
                },
                {
                    name: "Barbell Rows",
                    muscleGroup: "Lats, Rhomboids, Biceps",
                    sets: "3",
                    reps: "8-12",
                    rest: "60s",
                    instructions: "Hinge at hips, row bar to lower chest",
                    tips: "Squeeze shoulder blades together"
                }
            ],
            notes: "Full upper body workout combining push and pull movements"
        },
        rest: {
            activities: [
                "Light stretching or yoga",
                "Walking or light cardio",
                "Foam rolling",
                "Meditation or relaxation"
            ],
            notes: "Active recovery helps with muscle repair and reduces soreness"
        }
    };
}

export function getFallbackFoodPlan(date: Date): string {
    const dayOfWeek = date.getDay();
    const isNoMeatDay = dayOfWeek === 2 || dayOfWeek === 4;

    if (isNoMeatDay) {
        return `Breakfast: Oatmeal with berries, nuts, and cinnamon
Lunch: Quinoa salad with avocado, leafy greens, and olive oil
Dinner: Grilled salmon with steamed vegetables
Snack: Dark chocolate and mixed nuts`;
    } else {
        return `Breakfast: Scrambled eggs with spinach and avocado
Lunch: Grilled chicken with mixed greens and olive oil dressing
Dinner: Lean beef stir-fry with vegetables
Snack: Berries with Greek yogurt`;
    }
}

export function getFallbackWeeklyExercise(): WeeklyExerciseContent {
    const restDay = {
        activities: [
            "Light stretching or yoga",
            "Walking or light cardio",
            "Foam rolling",
            "Meditation or relaxation"
        ],
        notes: "Active recovery helps with muscle repair and reduces soreness"
    };

    return {
        sunday: { type: "rest", ...restDay },
        monday: {
            type: "push",
            exercises: [
                {
                    name: "Bench Press",
                    muscleGroups: "Chest, Shoulders, Triceps",
                    sets: "4",
                    reps: "8-10",
                    rest: "90s",
                    instructions: "Lie on bench, grip bar slightly wider than shoulders, lower to chest, press up explosively",
                    tips: "Keep core tight, maintain neutral spine"
                },
                {
                    name: "Overhead Press",
                    muscleGroups: "Shoulders, Triceps",
                    sets: "3",
                    reps: "8-12",
                    rest: "60s",
                    instructions: "Stand with feet hip-width, press weight overhead, lower to shoulders",
                    tips: "Engage core, avoid arching back"
                },
                {
                    name: "Dips",
                    muscleGroups: "Chest, Triceps",
                    sets: "3",
                    reps: "8-15",
                    rest: "60s",
                    instructions: "Support body on bars, lower until shoulders below elbows, press up",
                    tips: "Lean slightly forward for chest emphasis"
                }
            ],
            notes: "Focus on compound movements for maximum muscle activation"
        },
        tuesday: { type: "rest", ...restDay },
        wednesday: {
            type: "pull",
            exercises: [
                {
                    name: "Pull-ups",
                    muscleGroups: "Lats, Biceps, Rear Delts",
                    sets: "4",
                    reps: "5-10",
                    rest: "90s",
                    instructions: "Hang from bar, pull body up until chin over bar, lower with control",
                    tips: "Use full range of motion, engage lats"
                },
                {
                    name: "Bent-over Rows",
                    muscleGroups: "Lats, Rhomboids, Biceps",
                    sets: "3",
                    reps: "8-12",
                    rest: "60s",
                    instructions: "Hinge at hips, row weight to lower chest, squeeze shoulder blades",
                    tips: "Keep back straight, core engaged"
                },
                {
                    name: "Face Pulls",
                    muscleGroups: "Rear Delts, Rhomboids",
                    sets: "3",
                    reps: "12-15",
                    rest: "45s",
                    instructions: "Pull cable to face, separate hands at face level",
                    tips: "Focus on external rotation"
                }
            ],
            notes: "Emphasize pulling movements to balance pushing exercises"
        },
        thursday: { type: "rest", ...restDay },
        friday: {
            type: "legs",
            exercises: [
                {
                    name: "Squats",
                    muscleGroups: "Quads, Glutes, Hamstrings",
                    sets: "4",
                    reps: "8-12",
                    rest: "90s",
                    instructions: "Stand with feet shoulder-width, lower until thighs parallel, drive up through heels",
                    tips: "Keep chest up, knees tracking over toes"
                },
                {
                    name: "Romanian Deadlifts",
                    muscleGroups: "Hamstrings, Glutes",
                    sets: "3",
                    reps: "8-10",
                    rest: "90s",
                    instructions: "Hinge at hips, lower weight along legs, feel stretch in hamstrings",
                    tips: "Keep back straight, slight knee bend"
                },
                {
                    name: "Walking Lunges",
                    muscleGroups: "Quads, Glutes, Hamstrings",
                    sets: "3",
                    reps: "10 each leg",
                    rest: "60s",
                    instructions: "Step forward into lunge, push back to standing, alternate legs",
                    tips: "Keep torso upright, control the movement"
                }
            ],
            notes: "Focus on proper form and full range of motion"
        },
        saturday: {
            type: "upper",
            exercises: [
                {
                    name: "Incline Bench Press",
                    muscleGroups: "Upper Chest, Shoulders",
                    sets: "4",
                    reps: "8-10",
                    rest: "90s",
                    instructions: "Set bench to 30-45 degree incline, press weight to upper chest",
                    tips: "Focus on upper chest activation"
                },
                {
                    name: "Pull-ups",
                    muscleGroups: "Lats, Biceps",
                    sets: "4",
                    reps: "6-10",
                    rest: "90s",
                    instructions: "Hang from bar, pull body up until chin over bar",
                    tips: "Use full range of motion"
                },
                {
                    name: "Dumbbell Shoulder Press",
                    muscleGroups: "Shoulders, Triceps",
                    sets: "3",
                    reps: "8-12",
                    rest: "60s",
                    instructions: "Press dumbbells overhead, lower to shoulder level",
                    tips: "Keep core tight"
                },
                {
                    name: "Barbell Rows",
                    muscleGroups: "Lats, Rhomboids, Biceps",
                    sets: "3",
                    reps: "8-12",
                    rest: "60s",
                    instructions: "Hinge at hips, row bar to lower chest",
                    tips: "Squeeze shoulder blades together"
                }
            ],
            notes: "Full upper body workout combining push and pull movements"
        }
    };
}
