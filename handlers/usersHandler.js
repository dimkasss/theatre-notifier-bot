import fs from "fs";
import axios from 'axios';


// import users from "./users.json";
// with { type: "json" };
import { API_URL } from "./telegramHandler.js";

let lastUpdateId = 0;

const getKnownUsers = () => {
  /*if (fs.existsSync("/handlers/users.json")) {
    const users = JSON.parse(fs.readFileSync("/handlers/users.json", "utf-8"));
    return new Set(users);
  }
  console.log("nope");
  return new Set();
	*/
  // return users ? new Set(users) : new Set();
  return new Set([567185513, 1666834266])
};


const checkIncomingMessages = async (knownUsers) => {
  try {
    const res = await axios.get(
      `${API_URL}/getUpdates?offset=${lastUpdateId + 1}`
    );
    const updates = res.data.result;

    for (const update of updates) {
      lastUpdateId = update.update_id;

      if (update.message && update.message.chat) {
        const chatId = update.message.chat.id;

        // Добавляем нового пользователя
        if (!knownUsers.has(chatId)) {
          knownUsers.add(chatId);
          saveUsers();
          console.log(`Новый пользователь: ${chatId}`);
          await sendMessage(
            chatId,
            "konnichiwa! you're subscribed to notifier now."
          );
        }
      }
    }
  } catch (err) {
    console.error("Ошибка при получении апдейтов:", err.message);
  }
};

function saveUsers(knownUsers) {
  fs.writeFileSync("users.json", JSON.stringify([...knownUsers], null, 2));
}

export { getKnownUsers, saveUsers, checkIncomingMessages };
