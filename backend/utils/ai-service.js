// backend/utils/ai-service.js
const OpenAI = require("openai");
const db = require("../db");

const client = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

// 读取最近 N 条对话
function getHistory(user_id, limit = 12) {
  const sql = `
    SELECT sender, text 
    FROM chat_messages
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [user_id, limit], (err, results) => {
      if (err) return reject(err);
      resolve(results.reverse()); // 时间顺序从旧到新
    });
  });
}

module.exports = {
  async reply(user_id, userText) {
    try {
      const historyRows = await getHistory(user_id);

      const messages = [];

      // 更强一点的 system 提示词
      messages.push({
        role: "system",
        content:
          "你是演出门票小程序的智能客服“小蜜”。" +
          "你必须严格结合【整个对话上下文】来回答，记住用户之前说过的偏好和问题。" +
          "不要重复问用户已经回答过的问题，比如不要反复问“您喜欢什么风格”。" +
          "如果上下文已经有用户的偏好或问题，直接在此基础上继续回答和推荐。" +
          "回答要尽量简短、自然、口语化，一般 1～3 段话以内，避免啰嗦。" +
          "如果用户问和演出无关的音乐、日常聊天，也可以正常聊天、推荐内容。"
      });

      // 把历史对话塞进去
      historyRows.forEach(row => {
        const role = row.sender === "user" ? "user" : "assistant";
        const content =
          typeof row.text === "string" ? row.text : JSON.stringify(row.text || "");
        messages.push({ role, content });
      });

      // 本轮用户输入（防止 undefined）
      const safeUserText = userText ? String(userText) : "";
      messages.push({ role: "user", content: safeUserText });

      const response = await client.chat.completions.create({
        model: "qwen-max",
        messages,
        temperature: 0.7, // 稍微活泼一点，但不会太野
        top_p: 0.8,
      });

      return response.choices[0].message.content;
    } catch (err) {
      console.error("AI 错误：", err);
      return "抱歉，我刚刚有点卡壳了，可以再说一遍你的问题吗？";
    }
  }
};
