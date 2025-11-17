// const https = require("https");
import puppeteer from "puppeteer";
import { broadcastMessage } from "./handlers/telegramHandler.js";
import {
  checkIncomingMessages,
  getKnownUsers,
} from "./handlers/usersHandler.js";

const FREED_SEAT_CLASSNAME = "zone zone241";

const checkIfPageHasFreedSeats = (content) => {
  return content.includes(FREED_SEAT_CLASSNAME);
};

const TIMEOUT = 15 * 60 * 1000; // 15 минут
const TIMEOUT_TEST = 1000 * 60 * 2;
const TIMEOUT_24HRS = 1000 * 60 * 60 * 24;

let lastStatus = null; // Хранение предыдущего состояния
let knownUsers = getKnownUsers();

// * https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3972# - красная шапочка много мест
// * https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3895 - красная шапочка 2 места

const urlsToWatchOnceADay = [
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3972#",
];

const urlsToParse = [
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3878",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3880",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3978",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3879",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3893",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3995",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3725",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3892",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3993",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3994",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3867",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3968",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3969",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3891",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3975",
  "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3976",

  // "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=3895",
  // "https://tce.by/shows.html?base=RkZDMTE2MUQtMTNFNy00NUIyLTg0QzYtMURDMjRBNTc1ODA0&data=4055",
];

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const smartTimeout = async (page, url) => {
  const start = Date.now();
  const maxTimeout = 60000;
  const checkInterval = 5000;

  return new Promise(async (resolve, reject) => {
    const loop = async () => {
      if (Date.now() - start >= maxTimeout) {
        return reject(
          `[page#${url}] Timeout: page not loaded within ${maxTimeout / 1000}s`
        );
      }

      await sleep(checkInterval);

      const isAlreadyLoaded = await page.evaluate(() => {
        return Array.from(document.body.children).some(
          (el) =>
            el.localName === "table" &&
            el.id === "legend" &&
            el.textContent.length > 0
        );
      });

      if (isAlreadyLoaded) {
        console.log(`[page#${url}] resolved!`);

        return resolve();
      } else {
        console.log(`[page#${url}] still loading..`);
        // Повторяем цикл
        await loop();
      }
    };

    await loop();
  });
};

//, 1666834266

const parsePageContent = async (page, url) => {
  await page.goto(url);

  await smartTimeout(page, url).catch((reason) =>
    console.log(`[page#${url}] Rejected:`, reason)
  );

  const content = await page.content();

  const { title, date } = await page.evaluate(() => {
    const title =
      Array.from(document.body.children).find(
        (element) => element.localName === "h1"
      )?.textContent || "unknown";

    const dateAndTimeHtml = Array.from(document.body.children).find(
      (element) => element.localName === "h2"
    ).children;

    const date = Array.from(dateAndTimeHtml)
      .map((el) => el.textContent)
      .join(" ");

    return { title, date };
  });

  const hasFreedSeats = checkIfPageHasFreedSeats(content);

  const screenshotBase64 = hasFreedSeats
    ? await page.screenshot({
        encoding: "base64",
      })
    : null;

  const numberOfFreedSeats = (content.match(/zone zone241/g) || []).length;

  return {
    content,
    screenshotBase64,
    numberOfFreedSeats,
    hasFreedSeats,
    title,
    date,
  };
};

const loopThroughPages = async (urls) => {
  const browser = await puppeteer.launch({args: ['--no-sandbox']});
  const page = await browser.newPage();

  await page.setRequestInterception(true);

  page.on("request", (request) => {
    request.continue();
  });

  page.on("response", (response) => {
    // * response from php server with tickets data
    if (response.url().includes("action=ticket&kind=json")) {
      const status = response.status();

      if (status === 429) {
        console.error("ERR! php server returned 429 Too Many Requests!");
      } else if (status !== 200) {
        console.error(
          `ERR! php server responded w unexpected status: ${status}`
        );
      }
    }
  });

  const pagesWithFreedSeats = [];

  for (const [index, url] of urls.entries()) {
    const {
      content,
      screenshotBase64,
      numberOfFreedSeats,
      hasFreedSeats,
      title,
      date,
    } = await parsePageContent(page, url);

    if (hasFreedSeats) {
      if (numberOfFreedSeats > 1) {
        pagesWithFreedSeats.push({
          url,
          numberOfFreedSeats,
          screenshotBase64,
          title,
          date,
        });

        console.log(
          `[page#${url}] Found page with ${numberOfFreedSeats} free seats. Pushing to result object.`
        );
      } else {
        console.log(`[page#${url}] Found page with one free seat. Skipped`);
      }
    } else {
      console.log(`[page#${url}] Page parsed but no free seats were found.`);
    }
  }

  browser.close();

  return pagesWithFreedSeats;
};

const escapeHtml = (s = "") => {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

const getNoun = (number, one, two, five) => {
  let n = Math.abs(number);
  n %= 100;
  if (n >= 5 && n <= 20) {
    return five;
  }
  n %= 10;
  if (n === 1) {
    return one;
  }
  if (n >= 2 && n <= 4) {
    return two;
  }
  return five;
};

(async () => {
  console.log("Bot is running!");

  try {
    const runIteration = async (urls, isOnceADay = false) => {
      const pagesWithSeats = await loopThroughPages(urls);

      // console.dir(pagesWithSeats.length);

      if (pagesWithSeats.length > 0) {
        const messageHtml = isOnceADay
          ? `Найдено спектаклей со свободными местами: <b>${pagesWithSeats.length}</b>\n\n`
          : `Ежедневная проверка мест на красную шапочку\n` +
            pagesWithSeats
              .map(
                (page, index) =>
                  `${index + 1}. <b>${escapeHtml(page.title)}</b> ${
                    page.date
                  } - <a href="${page.url}">${
                    page.numberOfFreedSeats
                  } ${getNoun(
                    page.numberOfFreedSeats,
                    "место",
                    "места",
                    "мест"
                  )}</a>`
              )
              .join("\n\n");

        broadcastMessage(messageHtml, knownUsers);
      } else {
        console.log(
          `Свободных мест не найдено. Проверено представлений: ${urlsToParse.length}`
        );
      }
    };

    runIteration(urlsToParse);
    setInterval(() => {
      console.log("new interval call", new Date().toISOString());
      runIteration(urlsToParse);
    }, TIMEOUT);

    runIteration(urlsToWatchOnceADay);
    setInterval(() => runIteration(urlsToWatchOnceADay, true), TIMEOUT_24HRS);

    //checkIncomingMessages(knownUsers);
    //setInterval(() => checkIncomingMessages(knownUsers), 1000 * 60 * 60);
  } catch (error) {
    console.error("ERROR:", error);
  }
})();
