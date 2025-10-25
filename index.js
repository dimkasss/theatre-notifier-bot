const https = require('https');
const axios = require('axios');
const fs = require('fs');

const URL = 'https://puppet-minsk.by/afisha';
const TIMEOUT = 10 * 60 * 1000; // 15 минут
const TIMEOUT_TEST = 5 * 1000;
const TELEGRAM_TOKEN = '8258912807:AAGbXy_Jhkx8MaUNVkV2Gd6qJ5fNM7wUGQ8';
const CHAT_ID = '567185513';

const LOOKING_FOR = 'Декабрь';

const API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

let lastStatus = null; // Хранение предыдущего состояния
let knownUsers = new Set();

// Загружаем chat_id пользователей из файла (если есть)
if (fs.existsSync('users.json')) {
  const data = JSON.parse(fs.readFileSync('users.json', 'utf-8'));
  knownUsers = new Set(data);
}

function saveUsers() {
  fs.writeFileSync('users.json', JSON.stringify([...knownUsers], null, 2));
}

const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

async function sendMessage(chatId, text) {
  try {
    await axios.post(`${API_URL}/sendMessage`, {
      chat_id: chatId,
      text: text,
    });
  } catch (err) {
    console.error(`Ошибка при отправке в чат ${chatId}:`, err.message);
  }
}

const broadcastMessage = async (text) => {
  for (const userId of knownUsers) {
    await sendMessage(userId, text);
  }
};

const checkPage = () => {
  https
    .get(URL, (res) => {
      let data = '';

      res.on('data', (chunk) => (data += chunk));
      res.on('end', async () => {
        const hasTextLookingFor = data.includes(LOOKING_FOR);
        const timestamp = getTimestamp();

        if (lastStatus !== hasTextLookingFor && hasTextLookingFor) {
          const msgSuccessFormatted = `[${timestamp}] Появились билеты на ${LOOKING_FOR}. ОГО!`;

          console.log(msgSuccessFormatted);
          await broadcastMessage(msgSuccessFormatted);
        } else {
          const msgNoSuccessFormatted = `[${timestamp}] Увы, билетов на ${LOOKING_FOR} нет`;

          console.log(msgNoSuccessFormatted);
          await broadcastMessage(msgNoSuccessFormatted);
        }

        lastStatus = hasTextLookingFor;
      });
    })
    .on('error', async (err) => {
      const timestamp = getTimestamp();
      const message = `[${timestamp}] Ошибка при запросе: ${err.message}`;
      console.error(message);
      await broadcastMessage(message);
    });
};

let lastUpdateId = 0;

const checkIncomingMessages = async () => {
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
          await sendMessage(chatId, 'баобаб');
        }
      }
    }
  } catch (err) {
    console.error('Ошибка при получении апдейтов:', err.message);
  }
};

const exec = () => {
  console.log('Start!');
  checkPage();
  setInterval(checkPage, TIMEOUT_TEST);

  checkIncomingMessages();
  setInterval(checkIncomingMessages, 60 * 1000);
};

exec();
