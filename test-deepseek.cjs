const { OpenAI } = require("openai");
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: 'sk-6768557a5d5c47baa3f579d750c615a9',
});
async function test() {
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: "Hello" }],
      model: "deepseek-chat",
    });
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error);
  }
}
test();
