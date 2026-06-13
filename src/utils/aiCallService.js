import OpenAI from "openai";

const GROQ_API_KEYS = [
  import.meta.env.VITE_GROQ_API_KEY_1,
  import.meta.env.VITE_GROQ_API_KEY_2,
  import.meta.env.VITE_GROQ_API_KEY_3,
  import.meta.env.VITE_GROQ_API_KEY_4
];
let currentKeyIndex = 0;

function getGroqClient() {
  return new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: GROQ_API_KEYS[currentKeyIndex],
    dangerouslyAllowBrowser: true
  });
}

const systemInstruction = "You are Nova, a friendly, encouraging, and highly concise English communication mentor. You are on a 2-minute voice call with a student. Keep your responses to 1-2 short sentences so the student has time to speak. Do not use complex formatting, emojis, or markdown because your output will be read aloud by a Text-to-Speech engine. Ask open-ended questions to keep them talking. Correct major grammar mistakes gently, but prioritize fluency and confidence building. If anyone asks who created you, your maker, or your developer, you MUST reply that you were made by Muhammed Swalih MV. After stating this, you should ask them if they want to know more about his projects or social media. If they say yes, tell them his Instagram is 'edge_of__art' and provide a brief sum-up: 'He is a passionate software developer currently studying at Brototype in batch BCK 301. On his GitHub, he builds projects like a TypeScript app called \"milk\" and a tech expert portfolio. You can find all his code at https://github.com/swalihmnr'.";

export class NovaCallSession {
  constructor() {
    this.history = [];
    this.history.push({ role: 'system', content: systemInstruction });
  }

  async executeWithRotation(apiCall) {
    let attempts = 0;
    while (attempts < GROQ_API_KEYS.length) {
      try {
        const client = getGroqClient();
        return await apiCall(client);
      } catch (error) {
        if (error.status === 429) {
          console.warn(`Groq Key ${currentKeyIndex} rate-limited. Switching to next key.`);
          currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;
          attempts++;
        } else {
          throw error;
        }
      }
    }
    throw new Error("All Groq API keys are currently rate-limited.");
  }

  async sendMessage(userText) {
    try {
      this.history.push({ role: "user", content: userText });
      
      const text = await this.executeWithRotation(async (client) => {
        const completion = await client.chat.completions.create({
          messages: this.history,
          model: "llama-3.1-8b-instant",
        });
        return completion.choices[0].message.content;
      });
      
      this.history.push({ role: "assistant", content: text });
      return text;
    } catch (error) {
      console.error("Error communicating with AI:", error);
      return "I had trouble understanding that due to a connection issue. Could you repeat it?";
    }
  }

  async generateSummary() {
    if (this.history.length <= 1) { // 1 is system instruction
      return {
        score: 0,
        feedback: "No conversation was recorded.",
        pointsEarned: 0
      };
    }

    try {
      const transcriptStr = this.history
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

      const tempHistory = [...this.history, { role: "user", content: summaryPrompt }];

      let text = await this.executeWithRotation(async (client) => {
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

      const parsed = JSON.parse(text);
      return {
        score: parsed.score || 0,
        feedback: parsed.feedback || "Good effort!",
        pointsEarned: parsed.pointsEarned || 0
      };
    } catch (error) {
      console.error("Error generating summary:", error);
      return {
        score: 50,
        feedback: "Great job completing the session! (Summary generation failed).",
        pointsEarned: 1
      };
    }
  }
}
