import axios from "axios";

const TELEGRAM_TOKEN = "8258912807:AAEEca7uBAH_XJvsLKVvQJJ2Hu7CdHTWY8E";
const CHAT_ID = "567185513";
export const API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

async function sendMessage(chatId, text) {
  console.log("send text to tg api:", text);
  try {
    await axios.post(`${API_URL}/sendMessage`, {
      chat_id: chatId,
      text: text,
      // text: "test",
      parse_mode: "html",
    });
  } catch (err) {
    console.error(`Ошибка при отправке в чат ${chatId}:`, err.response.data);
  }
}

const broadcastMessage = async (text, knownUsers) => {
  console.log("broadcast...", knownUsers);
  for (const userId of knownUsers) {
    await sendMessage(userId, text);
  }
};

export { sendMessage, broadcastMessage };
