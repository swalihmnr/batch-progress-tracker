import OpenAI from "openai";
import { BEGINNER_MOTIVATIONS } from './motivationLibrary';

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

const examSystemInstruction = "You are an official English Placement Examiner administering a 2-minute oral exam to a student. Your job is to assess their grammar, vocabulary, and fluency. Ask 3 progressively difficult questions one at a time. For example: first ask them to introduce themselves, then ask an opinion question, then a complex hypothetical. Do NOT correct them during the exam, just assess their answer and move to the next question. Keep your prompts extremely short (1-2 sentences) so the student has time to speak. Do not use complex formatting, emojis, or markdown.";

export class NovaCallSession {
  constructor({ isExamMode = false, isInterviewMode = false, interviewStack = '', interviewTopic = '' } = {}) {
    this.history = [];
    this.isExamMode = isExamMode;
    this.isInterviewMode = isInterviewMode;
    
    let content = systemInstruction;
    if (isExamMode) {
      content = examSystemInstruction;
    } else if (isInterviewMode && interviewStack) {
      let topicStr = interviewTopic ? ` specifically focusing on ${interviewTopic}` : '';
      let targetQuestions = interviewTopic || interviewStack;
      content = `You are a strict, professional Senior Technical Recruiter. You are conducting an oral technical screening interview for a candidate specializing in the ${interviewStack} stack${topicStr}. Ask practical, scenario-based technical questions about ${targetQuestions} one at a time (e.g. 'How would you design...', 'Walk me through how you would debug...'). Do NOT correct them during the interview, just assess their answer and move to the next question. Keep your prompts extremely short (1-2 sentences). Your output will be read aloud by a Text-to-Speech engine. Evaluate their English communication skills AND their technical clarity. If the user asks to stop, end the interview, or says goodbye, you MUST end your response with exactly '[END_CALL]'.`;
    }
    
    this.history.push({ role: 'system', content });
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
    if (!GROQ_API_KEYS[0]) {
      console.warn("Groq API key is missing. Using fallback mock response.");
      
      const offlineResponses = [
        "That's interesting! Tell me more about it.",
        "I see. How did that make you feel?",
        "Could you elaborate on that?",
        "That sounds like a great experience. What did you learn from it?",
        "Awesome! Keep practicing your English. What else is on your mind?",
        "I understand. What do you plan to do next?",
        "Fascinating! How did you get started with that?",
        "Very good! Your pronunciation is getting better. Keep going!"
      ];
      
      if (this.history.length <= 1) {
        const msg = "I'm currently running in offline mode. Please add a Groq API key to hear my real voice. Until then, let's practice! Tell me about your day.";
        this.history.push({ role: "user", content: userText });
        this.history.push({ role: "assistant", content: msg });
        return msg;
      }
      
      const randomResponse = offlineResponses[Math.floor(Math.random() * offlineResponses.length)];
      this.history.push({ role: "user", content: userText });
      this.history.push({ role: "assistant", content: randomResponse });
      return randomResponse;
    }

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
    if (!GROQ_API_KEYS[0]) {
      return {
        score: 75,
        feedback: "Offline mode: Good effort! Add an API key for real feedback.",
        pointsEarned: 1,
        level: "intermediate",
        roadmap: [
          "Practice speaking for 5 minutes daily in offline mode.",
          "Add a Groq API key to unlock full personalized roadmaps.",
          "Review basic grammar rules regarding verb tenses."
        ]
      };
    }

    if (this.history.length <= 1) { // 1 is system instruction
      return {
        score: 0,
        feedback: "No conversation was recorded.",
        pointsEarned: 0,
        level: "beginner",
        roadmap: [
          "Start your first conversation with Nova.",
          "Try to speak for at least 30 seconds.",
          "Focus on introducing yourself clearly."
        ]
      };
    }

    try {
      const transcriptStr = this.history
        .filter(m => m.role !== 'system')
        .map(m => m.role + ': ' + m.content)
        .join('\n');
        
      const summaryPrompt = `The conversation is over. Here is the transcript:
      ${transcriptStr}
      
      You are an incredibly strict and rigorous English communication examiner. Evaluate the student's performance based STRICTLY on the transcript.
      Pay extreme attention to:
      1. Grammar: Penalize heavily for subject-verb agreement errors, incorrect verb tenses, missing articles, or broken sentence structures.
      2. Fluency: Deduct points for fragmented sentences, one-word answers, or failing to answer the questions meaningfully.
      3. Vocabulary: Penalize repetitive, overly basic phrasing, or improper word usage.
      
      Categorize the student into one of these levels based on their performance: "beginner", "intermediate", "advanced", or "pro".
      
      Provide a highly critical, constructive summary.
      Return ONLY a JSON string with the following structure (no markdown, just raw JSON):
      {
        "score": (a strict number out of 100. Be harsh. Deduct 5-10 points for every grammatical mistake or unnatural phrasing. A perfect 100 is almost impossible.),
        "feedback": "(A detailed 3-4 sentence constructive feedback message highlighting specific grammatical errors made during the conversation and exact instructions on how to fix them.)",
        "pointsEarned": (1 if the student actively participated and spoke English, 0 if they were mostly silent, off-topic, or did not attempt to speak properly),
        "level": "(one of: 'beginner', 'intermediate', 'advanced', 'pro')",
        "roadmap": [
          "(Actionable milestone 1 tailored to fix a specific weakness shown in the transcript)",
          "(Actionable milestone 2 tailored to fix a specific weakness shown in the transcript)",
          "(Actionable milestone 3 tailored to fix a specific weakness shown in the transcript)"
        ],
        "correctAnswers": [
          { "question": "(Write out a technical question that was asked during the session)", "answer": "(Provide the correct, ideal technical answer to that question)" }
        ]
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
        pointsEarned: parsed.pointsEarned || 0,
        level: parsed.level || "beginner",
        roadmap: Array.isArray(parsed.roadmap) && parsed.roadmap.length > 0 ? parsed.roadmap : [
          "Practice basic vocabulary.",
          "Focus on clear pronunciation.",
          "Try to speak in full sentences."
        ],
        correctAnswers: Array.isArray(parsed.correctAnswers) ? parsed.correctAnswers : []
      };
    } catch (error) {
      console.error("Error generating summary:", error);
      return {
        score: 50,
        feedback: "Great job completing the session! (Summary generation failed).",
        pointsEarned: 1,
        level: "intermediate",
        roadmap: ["Keep practicing!"]
      };
    }
  }
}

const textExamSystemInstruction = "You are an official English Placement Examiner conducting a TEXT-BASED English exam. You must evaluate the user's reading comprehension, grammar, and vocabulary. The user will start by telling you their self-assessed level (e.g. Beginner, Intermediate, Advanced, Pro). You must ask exactly 5 questions tailored to verify if they truly meet that level. Question 1: grammar. Question 2: vocabulary. Question 3: reading comprehension. Question 4: error correction. Question 5: idioms/nuance. You MUST prefix each official question with [Q1], [Q2], [Q3], [Q4], and [Q5] respectively. Wait for the user to answer each question before asking the next. CRITICAL RULES FOR QUESTIONS 1-5: If the user gives a completely incorrect answer, a nonsense answer, says 'no', or says 'I don't know', you MUST accept it as their final answer and IMMEDIATELY move on to the next question. Do NOT ask them to try again. Do NOT give them a second chance. Do NOT correct them. You MUST ask ALL 5 questions no matter how bad their answers are. NEVER skip a question and NEVER end the exam early. Do NOT mock or insult them during the questions. Maintain a strictly professional and neutral tone until the exam is over. Keep your prompts clear and concise. \n\nAFTER QUESTION 5 IS ANSWERED: Evaluate their performance. You MUST NOT send [EXAM_COMPLETE] immediately. Instead, ask EVERY user ONE final question: 'Before I give you your result, do you want to hear it in English or Malayalam?'. Wait for their response. AFTER THEY REPLY to this language question, provide a final message based on their level: \nIf they claimed to be a 'Beginner': NEVER troll them. Provide a highly motivating, warm, and encouraging message (use emojis like 🌟💪🚀) in the language they chose. \nIf they claimed to be a 'Pro' or 'Advanced' but answered terribly: drop the professional act and mock them mercilessly with extreme sarcasm and emojis right then and there, IN THE LANGUAGE THEY CHOSE. (IMPORTANT: If they choose Malayalam, you MUST use this exact Legendary troll: 'ULTIMATE COSMIC RESULT: ബ്രോ... ഈ Result ഇനി ഭൂമിയിലെ ഒരു സാധാരണ Result അല്ല. NASA പഠിക്കുന്നു. ISRO നിരീക്ഷിക്കുന്നു. Oxford ആശയക്കുഴപ്പത്തിലാണ്. കാരണം ഒരേ സമയം ഇത്രയും confidence-ഉം ഇത്രയും wrong answers-ഉം ഒരുമിച്ച് കാണുന്നത് വളരെ അപൂർവമാണ്. 🏆 Intergalactic Emperor of Confidence 🏆 🤣👑🚀🔥😭'). \nFinish your final message, and then on a new line, append exactly '[EXAM_COMPLETE]'.";

export class TextExamSession {
  constructor() {
    this.history = [];
    this.history.push({ role: 'system', content: textExamSystemInstruction });
  }

  async executeWithRotation(apiCall) {
    let attempts = 0;
    while (attempts < GROQ_API_KEYS.length) {
      try {
        if (!GROQ_API_KEYS[currentKeyIndex]) throw new Error("Key is empty");
        const client = getGroqClient();
        return await apiCall(client);
      } catch (error) {
        console.warn(`Groq API key ${currentKeyIndex + 1} failed. Switching to next key...`);
        currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;
        attempts++;
      }
    }
    throw new Error("All Groq API keys failed or rate-limited.");
  }

  async sendMessage(messageText) {
    if (!GROQ_API_KEYS[0]) return "API key missing. Unable to conduct exam.";
    
    this.history.push({ role: 'user', content: messageText });
    try {
      const responseText = await this.executeWithRotation(async (client) => {
        const completion = await client.chat.completions.create({
          messages: this.history,
          model: "llama-3.1-8b-instant",
        });
        return completion.choices[0].message.content;
      });

      this.history.push({ role: 'assistant', content: responseText });
      return responseText;
    } catch (error) {
      console.error("Error communicating with AI:", error);
      return "I'm sorry, I'm having trouble connecting right now.";
    }
  }

  async generateSummary() {
    if (!GROQ_API_KEYS[0]) {
      return { score: 0, feedback: "Offline", pointsEarned: 0, level: "beginner", roadmap: ["Add API Key"] };
    }

    try {
      const transcriptStr = this.history
        .filter(m => m.role !== 'system')
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const summaryPrompt = `The text-based exam is over. Here is the transcript:
      ${transcriptStr}
      
      You are an incredibly strict English communication examiner. Evaluate the student's TEXT-BASED performance based strictly on the transcript.
      Pay extreme attention to:
      1. Grammar: Penalize heavily for any syntax or spelling errors in their typed responses.
      2. Reading Comprehension: Did they correctly answer the questions you asked?
      3. Vocabulary: Did they use appropriate words?
      
      Categorize the student into one of these levels based on their performance: "beginner", "intermediate", "advanced", or "pro".
      
      CRITICAL GRADING RULE: If the student answers "I don't know", provides complete nonsense, or fails every single question, their score MUST be exactly 0. Do NOT give pity points. Each question is worth 20 points. Only award points for actual, correct English answers.

      SAVAGE MOCKERY RULE: If the student claimed to be at the 'Pro' or 'Advanced' level in the transcript but they perform poorly (e.g., getting a low score, basic grammar mistakes, or answering "I don't know"), your feedback MUST savagely mock them for their overconfidence at peak levels of sarcasm using emojis (e.g., 🤡😂📉💀). Do not hold back.
      MOTIVATION RULE: If the student honestly claimed to be at the 'Beginner' level, your feedback MUST be extremely warm, encouraging, and motivating, using positive emojis (e.g., 🌟💪🚀) to make them feel great about starting their journey.
      
      Return ONLY a JSON string with the following structure:
      {
        "score": (a strict number out of 100),
        "feedback": "(Detailed 3-4 sentence constructive feedback highlighting specific textual errors. CRITICAL: If the student claimed 'Beginner', this MUST be highly motivating and warm, zero trolling.)",
        "malayalamFeedback": "(CRITICAL RULE: If the student claimed 'Beginner', NEVER troll them. Instead, you MUST output EXACTLY the word 'MOTIVATE_BEGINNER' here and nothing else. ONLY if they claimed 'Pro' or 'Advanced' but scored low, you MUST use one of these EXACT static trolls based on score. Legendary (0%): 'ULTIMATE COSMIC RESULT: ബ്രോ... ഈ Result ഇനി ഭൂമിയിലെ ഒരു സാധാരണ Result അല്ല...'. Savage (1-20%): 'ബ്രോ, നിന്റെ performance കണ്ടപ്പോൾ... ഞങ്ങൾ answer key തുറന്നു...'. Funny (21-40%): 'Question Paper Status Update: Before Exam...'. Mild (41-60%): 'ബ്രോ... ആദ്യം ഒരു കൈയടി കൊടുക്കാം...'. )",
        "pointsEarned": (1 if they participated),
        "level": "(one of: 'beginner', 'intermediate', 'advanced', 'pro')",
        "stages": {
          "__comment": "CRITICAL: All content inside 'stages' MUST ALWAYS BE IN ENGLISH, regardless of malayalamFeedback. Do NOT translate this.",
          "beginner": {
            "name": "(Custom title for their beginner phase, e.g. 'Foundations of Syntax')",
            "description": "(Custom English description tailored to what they need to learn at this stage based on their mistakes)",
            "milestones": [
              {"text": "(Actionable milestone 1 in English)", "resource": "(REAL YouTube or Documentation URL for studying this topic)"},
              {"text": "(Actionable milestone 2 in English)", "resource": "(REAL YouTube or Documentation URL)"}
            ]
          },
          "intermediate": {
            "name": "(Custom title for intermediate phase)",
            "description": "(Custom English description)",
            "milestones": [
              {"text": "(Actionable milestone 1 in English)", "resource": "(REAL YouTube or Documentation URL)"}
            ]
          },
          "advanced": {
            "name": "(Custom title for advanced phase)",
            "description": "(Custom English description)",
            "milestones": [
              {"text": "(Actionable milestone 1 in English)", "resource": "(REAL YouTube or Documentation URL)"}
            ]
          },
          "pro": {
            "name": "(Custom title for pro phase)",
            "description": "(Custom English description)",
            "milestones": [
              {"text": "(Actionable milestone 1 in English)", "resource": "(REAL YouTube or Documentation URL)"}
            ]
          }
        }
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
      if (text.startsWith("```json")) text = text.substring(7, text.length - 3).trim();
      else if (text.startsWith("```")) text = text.substring(3, text.length - 3).trim();

      const parsed = JSON.parse(text);
      
      let finalMalayalamFeedback = parsed.malayalamFeedback || null;
      if (finalMalayalamFeedback === 'MOTIVATE_BEGINNER') {
          const randomIndex = Math.floor(Math.random() * BEGINNER_MOTIVATIONS.length);
          finalMalayalamFeedback = BEGINNER_MOTIVATIONS[randomIndex];
      }

      return {
        score: parsed.score || 0,
        feedback: parsed.feedback || "Good effort!",
        malayalamFeedback: finalMalayalamFeedback,
        pointsEarned: parsed.pointsEarned || 0,
        level: parsed.level || "beginner",
        stages: parsed.stages || null
      };
    } catch (error) {
      console.error("Error generating text summary:", error);
      return { score: 50, feedback: "Summary failed.", pointsEarned: 1, level: "intermediate", stages: null };
    }
  }
}
