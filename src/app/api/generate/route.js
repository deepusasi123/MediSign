import { NextResponse } from 'next/server';
import { pipeline } from '@xenova/transformers';

// Singleton for the model to avoid reloading on every request in dev
let generator = null;

async function getGenerator() {
    if (!generator) {
        console.log("Initializing Flan-T5 model...");
        generator = await pipeline('text2text-generation', 'Xenova/flan-t5-small');
    }
    return generator;
}

export async function POST(request) {
    try {
        const { words } = await request.json();

        if (!words || !Array.isArray(words) || words.length === 0) {
            return NextResponse.json({ error: "No words provided" }, { status: 400 });
        }

        const prompt = `Convert the keywords into a simple patient sentence.
RULES:
1. Start with "I" or "My".
2. Do not use the words "first person".
3. Make it humane and natural language
// 3. Keep it short.
4. Don't over repeat same sentence for same words.
5. Don't use the same worlds  multiple times in a sentence.
Keywords: eye, pain
Sentence: I am having pain in my eyes.
Keywords: eyes, pain
Sentence: My eyes are hurting.
Keywords: eye, irritation
Sentence: My eyes feel irritated.
Keywords: ear, pain
Sentence: I am having ear pain.
Keywords: ear, pain
Sentence: I have an ear ache.
Keywords: ear
Sentence: I feel discomfort in my ear.
Keywords: sore_throat
Sentence: I have a sore throat.
Keywords: sore_throat, pain
Sentence: My throat is hurting.
Keywords: sore_throat, pain
Sentence: I feel pain while swallowing.
Keywords: cough
Sentence: I am having a cough.
Keywords: cough
Sentence: I am coughing continuously.
Keywords: dizzy
Sentence: I am feeling dizzy.
Keywords: dizzy
Sentence: I feel light headed.
Keywords: dizzy
Sentence: I feel unsteady and dizzy.
Keywords: fever
Sentence: I have a fever.
Keywords: fever
Sentence: My body temperature is high.
Keywords: fever
Sentence: I have fever and chills.
Keywords: blood_pressure
Sentence: My blood pressure is high.
Keywords: blood_pressure
Sentence: I am having blood pressure issues.
Keywords: eye, pain, headache
Sentence: I have pain in my eyes and head.
Keywords: dizzy, blood_pressure
Sentence: I feel dizzy and my blood pressure is not normal.
Keywords: ${words.join(', ')}
Sentence:`;

        console.log("Generating for input:", prompt);

        // Get model instance
        const generate = await getGenerator();

        // Generate
        const output = await generate(prompt, {
            max_new_tokens: 60,
            temperature: 0.7, // Lower temperature for more consistent medical descriptions
            repetition_penalty: 1.2,
        });

        const sentence = output[0].generated_text;
        console.log("Generated:", sentence);

        return NextResponse.json({ sentence });

    } catch (error) {
        console.error("Generation error:", error);
        return NextResponse.json({ error: "Failed to generate sentence" }, { status: 500 });
    }
}
