const functions = require("firebase-functions");
const { OpenAI } = require("openai");

// Array of API keys for rotation. Add more Groq keys here for higher limits.
const GROQ_API_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4
];

let currentKeyIndex = 0;

function getGroqClient() {
  const apiKey = GROQ_API_KEYS[currentKeyIndex];
  return new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: apiKey,
  });
}

async function executeWithRotation(apiCall) {
  let attempts = 0;
  const maxAttempts = GROQ_API_KEYS.length;

  while (attempts < maxAttempts) {
    try {
      const client = getGroqClient();
      return await apiCall(client);
    } catch (error) {
      if (error.status === 429) {
        console.warn(`Key ${currentKeyIndex} rate-limited. Switching to next key.`);
        currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;
        attempts++;
      } else {
        throw error;
      }
    }
  }
  
  throw new Error("All API keys have been rate-limited. Please try again later.");
}

exports.novaChat = functions.https.onCall(async (data, context) => {
  try {
    const { history } = data;
    
    if (!history || !Array.isArray(history)) {
      throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a history array.');
    }

    const text = await executeWithRotation(async (client) => {
      const completion = await client.chat.completions.create({
        messages: history,
        model: "llama-3.1-8b-instant",
      });
      return completion.choices[0].message.content;
    });

    return { response: text };
  } catch (error) {
    console.error("Error in novaChat:", error);
    throw new functions.https.HttpsError('internal', error.message || 'An error occurred during chat.');
  }
});

exports.novaSummary = functions.https.onCall(async (data, context) => {
  try {
    const { history } = data;
    
    if (!history || !Array.isArray(history)) {
      throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a history array.');
    }

    const transcriptStr = history
      .filter(m => m.role !== 'system')
      .map(m => m.role + ': ' + m.content)
      .join('\n');
      
    const summaryPrompt = `The 2-minute conversation is over. Here is the transcript:
    ${transcriptStr}
    
    Provide a brief summary of the student's performance. Focus on fluency, vocabulary, and grammar. 
    Return ONLY a JSON string with the following structure (no markdown, just raw JSON):
    {
      "score": (a number out of 100 representing overall communication quality),
      "feedback": "(a 2-3 sentence constructive feedback message)",
      "pointsEarned": (1 if the student actively participated and tried, 0 if they were silent or didn't try)
    }`;

    const tempHistory = [...history, { role: "user", content: summaryPrompt }];

    let text = await executeWithRotation(async (client) => {
      const completion = await client.chat.completions.create({
        messages: tempHistory,
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" }
      });
      return completion.choices[0].message.content;
    });

    text = text.trim();
    if (text.startsWith("```json")) {
        text = text.substring(7, text.length - 3).trim();
    } else if (text.startsWith("```")) {
        text = text.substring(3, text.length - 3).trim();
    }

    return { response: text };
  } catch (error) {
    console.error("Error in novaSummary:", error);
    throw new functions.https.HttpsError('internal', error.message || 'An error occurred during summary generation.');
  }
});
