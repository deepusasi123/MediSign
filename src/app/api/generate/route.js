import { NextResponse } from 'next/server';

// Natural patient phrases - multiple variations for each symptom/combination
// These sound like real people talking casually to their doctor
const naturalPhrases = {
    // Single symptoms
    'eyes': [
        "Hey doc, my eyes have been acting up lately.",
        "So, my eyes have been giving me trouble.",
        "Doc, something's going on with my eyes.",
        "I came in because my eyes don't feel right.",
    ],
    'ear': [
        "My ear's been bothering me for a few days now.",
        "Hey, so something's up with my ear.",
        "Doc, my ear feels weird, thought I should get it checked.",
        "There's something wrong with my ear, it just doesn't feel right.",
    ],
    'sore throat': [
        "I've got this scratchy throat that won't quit.",
        "My throat's been killing me, hard to even swallow.",
        "So my throat's been really sore, figured I'd come in.",
        "Got a bad sore throat, it's been a few days now.",
    ],
    'cough': [
        "Can't shake this cough, it's been going on for a while.",
        "I've been coughing like crazy, it's exhausting.",
        "This cough just won't go away, you know?",
        "I keep coughing and coughing, it's really annoying.",
    ],
    'dizzy': [
        "I've been feeling kinda woozy lately, like off balance.",
        "Getting these dizzy spells, it's a bit scary honestly.",
        "I feel lightheaded a lot, especially when I stand up.",
        "Been having some vertigo or something, room keeps spinning.",
    ],
    'fever': [
        "I think I've been running a fever, feeling super warm.",
        "Been feeling feverish, kinda hot and cold, you know?",
        "Pretty sure I have a fever, been feeling awful.",
        "I've had a temp for a couple days now.",
    ],
    'blood pressure': [
        "Wanted to get my blood pressure checked, been worried about it.",
        "Not sure if my blood pressure is okay, just wanted to check.",
        "Been concerned about my blood pressure lately.",
        "Think something might be off with my blood pressure.",
    ],
    // 'pain' is intentionally NOT a standalone symptom
    // It must be paired with body parts like 'eyes' or 'ear'

    // Two-symptom combinations
    'eyes,pain': [
        "My eyes are really hurting, like a sharp pain behind them.",
        "Got this pain in my eyes, it's been pretty bad.",
        "There's this ache in my eyes that won't let up.",
    ],
    'pain,eyes': [
        "My eyes are really hurting, like a sharp pain behind them.",
        "Got this pain in my eyes, it's been pretty bad.",
    ],
    'ear,pain': [
        "My ear is killing me, like serious pain in there.",
        "Got an earache that's pretty intense, doc.",
        "The pain in my ear is really bad, can barely sleep.",
    ],
    'pain,ear': [
        "My ear is killing me, like serious pain in there.",
        "Got an earache that's pretty intense, doc.",
    ],
    'sore throat,pain': [
        "My throat hurts so bad, even drinking water is painful.",
        "Got a really painful sore throat, it's hard to swallow anything.",
    ],
    'pain,sore throat': [
        "My throat hurts so bad, even drinking water is painful.",
        "Got a really painful sore throat, it's hard to swallow anything.",
    ],
    'sore throat,fever': [
        "Sore throat and I'm pretty sure I have a fever too.",
        "My throat's killing me and I've been feeling feverish.",
        "Got a fever and this awful sore throat.",
    ],
    'fever,sore throat': [
        "Sore throat and I'm pretty sure I have a fever too.",
        "My throat's killing me and I've been feeling feverish.",
    ],
    'cough,pain': [
        "This cough is hurting my chest every time, it's rough.",
        "Coughing so much it's actually painful now.",
    ],
    'pain,cough': [
        "This cough is hurting my chest every time, it's rough.",
        "Coughing so much it's actually painful now.",
    ],
    'cough,fever': [
        "Got a bad cough and running a fever, feel pretty rough.",
        "Been coughing a lot and I'm feverish too.",
        "Fever and this cough that won't quit.",
    ],
    'fever,cough': [
        "Got a bad cough and running a fever, feel pretty rough.",
        "Been coughing a lot and I'm feverish too.",
    ],
    'cough,sore throat': [
        "My throat's sore and I can't stop coughing.",
        "Got this cough and my throat is wrecked.",
    ],
    'sore throat,cough': [
        "My throat's sore and I can't stop coughing.",
        "Got this cough and my throat is wrecked.",
    ],
    'dizzy,pain': [
        "Feeling dizzy and got a bad headache with it.",
        "I'm lightheaded and there's this pain too.",
    ],
    'pain,dizzy': [
        "Feeling dizzy and got a bad headache with it.",
        "I'm lightheaded and there's this pain too.",
    ],
    'dizzy,blood pressure': [
        "Getting dizzy spells, thinking it might be my blood pressure.",
        "Feeling woozy, worried it could be a BP thing.",
    ],
    'blood pressure,dizzy': [
        "Getting dizzy spells, thinking it might be my blood pressure.",
        "Feeling woozy, worried it could be a BP thing.",
    ],
    'fever,pain': [
        "Running a fever and my whole body aches.",
        "Got a fever and just hurting all over.",
        "Feeling feverish with lots of body aches.",
    ],
    'pain,fever': [
        "Running a fever and my whole body aches.",
        "Got a fever and just hurting all over.",
    ],
    'eyes,fever': [
        "My eyes are bothering me and I think I have a fever.",
        "Eyes are hurting and I'm feeling feverish too.",
    ],
    'fever,eyes': [
        "My eyes are bothering me and I think I have a fever.",
        "Eyes are hurting and I'm feeling feverish too.",
    ],
    'ear,fever': [
        "Ear's hurting and I've got a fever going on.",
        "Got an earache and running a fever.",
    ],
    'fever,ear': [
        "Ear's hurting and I've got a fever going on.",
        "Got an earache and running a fever.",
    ],

    // Three-symptom combinations
    'pain,fever,cough': [
        "I'm not doing great, body aches, fever, and can't stop coughing.",
        "Got the whole package - fever, cough, and everything hurts.",
    ],
    'fever,pain,cough': [
        "I'm not doing great, body aches, fever, and can't stop coughing.",
        "Got the whole package - fever, cough, and everything hurts.",
    ],
    'cough,pain,fever': [
        "I'm not doing great, body aches, fever, and can't stop coughing.",
    ],
    'dizzy,fever,pain': [
        "Feeling dizzy, got a fever, and everything hurts.",
        "I'm lightheaded, feverish, and in pain - not a good combo.",
    ],
    'fever,dizzy,pain': [
        "Feeling dizzy, got a fever, and everything hurts.",
        "I'm lightheaded, feverish, and in pain - not a good combo.",
    ],
    'pain,dizzy,fever': [
        "Feeling dizzy, got a fever, and everything hurts.",
    ],
    'cough,sore throat,fever': [
        "My throat's sore, can't stop coughing, and I'm running a fever.",
        "Got the works - sore throat, cough, and fever.",
    ],
    'sore throat,cough,fever': [
        "My throat's sore, can't stop coughing, and I'm running a fever.",
    ],
    'fever,cough,sore throat': [
        "My throat's sore, can't stop coughing, and I'm running a fever.",
    ],
};

// Get a random phrase from an array
function getRandomPhrase(phrases) {
    return phrases[Math.floor(Math.random() * phrases.length)];
}

// Build a sentence from individual symptoms when no template exists
function buildNaturalSentence(words) {
    const symptomDescriptions = {
        'eyes': "my eyes are bothering me",
        'ear': "my ear's been acting up",
        'sore throat': "got a sore throat",
        'cough': "can't shake this cough",
        'dizzy': "feeling kinda dizzy",
        'fever': "running a fever",
        'blood pressure': "worried about my blood pressure",
        // 'pain' is NOT included here - it must be paired with body parts
    };

    const connectors = [" and ", " and "];

    const parts = words
        .map(w => symptomDescriptions[w])
        .filter(Boolean);

    if (parts.length === 0) {
        // Replace underscores with spaces for natural reading
        const readableWords = words.map(w => w.replace(/_/g, ' '));
        return `I have ${readableWords.join(' and ')}.`;
    }

    // Capitalize first letter of the first part
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    if (parts.length === 1) {
        return capitalize(parts[0]) + ".";
    }

    const lastPart = parts.pop();
    const connector = getRandomPhrase(connectors);
    return capitalize(parts.join(", ") + connector + lastPart) + ".";
}

export async function POST(request) {
    try {
        const { words } = await request.json();

        if (!words || !Array.isArray(words) || words.length === 0) {
            return NextResponse.json({ error: "No words provided" }, { status: 400 });
        }

        // Clean and sort words for consistent key lookup
        const cleanWords = words.map(w => w.toLowerCase().trim());
        const key = cleanWords.join(',');

        console.log("Looking for phrases for:", key);

        let sentence;

        // First try exact match
        if (naturalPhrases[key]) {
            sentence = getRandomPhrase(naturalPhrases[key]);
            console.log("Found exact match template");
        }
        // Try reverse order for two words
        else if (cleanWords.length === 2) {
            const reverseKey = cleanWords.reverse().join(',');
            if (naturalPhrases[reverseKey]) {
                sentence = getRandomPhrase(naturalPhrases[reverseKey]);
                console.log("Found reverse match template");
            }
        }

        // If still no match, build a natural sentence
        if (!sentence) {
            sentence = buildNaturalSentence(cleanWords);
            console.log("Built dynamic sentence");
        }

        console.log("Output:", sentence);

        return NextResponse.json({ sentence });

    } catch (error) {
        console.error("Generation error:", error);
        return NextResponse.json({ error: "Failed to generate sentence" }, { status: 500 });
    }
}
