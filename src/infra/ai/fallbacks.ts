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
