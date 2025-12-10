import puppeteer from "puppeteer";
import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

// ----------------------
// 환경 변수
// ----------------------
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const LOGIN_PAGE_URL = process.env.LOGIN_PAGE_URL;
const LOGIN_ID_SELECTOR = process.env.LOGIN_ID_SELECTOR;
const LOGIN_PW_SELECTOR = process.env.LOGIN_PW_SELECTOR;
const LOGIN_BUTTON_SELECTOR = process.env.LOGIN_BUTTON_SELECTOR;

const SITE_USERNAME = process.env.SITE_USERNAME;
const SITE_PASSWORD = process.env.SITE_PASSWORD;

const TARGET_URLS = process.env.TARGET_URLS ? process.env.TARGET_URLS.split(",") : [];
const KEYWORDS = process.env.KEYWORDS ? process.env.KEYWORDS.split(",") : [];



// ----------------------
// alerted.json 처리
// ----------------------
const ALERT_FILE = "./alerted.json";
let alerted = {};

// 파일 읽기 (+ 실패 시 초기화)
try {
  if (fs.existsSync(ALERT_FILE)) {
    const data = fs.readFileSync(ALERT_FILE, "utf-8");
    alerted = data ? JSON.parse(data) : {};
  } else {
    alerted = {};
    fs.writeFileSync(ALERT_FILE, "{}");
  }
} catch (err) {
  console.log("alerted.json 오류 → 초기화:", err);
  alerted = {};
  fs.writeFileSync(ALERT_FILE, "{}");
}

// ----------------------
// 텔레그램 전송
// ----------------------
async function sendTelegram(msg) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: msg
    })
  });
}

// ----------------------
// 메인
// ----------------------
async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  try {
    // 1) 로그인 페이지 이동
    await page.goto(LOGIN_PAGE_URL, { waitUntil: "networkidle2" });

    // 2) ID/PW 입력
    await page.type(LOGIN_ID_SELECTOR, SITE_USERNAME);
    await page.type(LOGIN_PW_SELECTOR, SITE_PASSWORD);

    // 3) 로그인 버튼 클릭
    await page.click(LOGIN_BUTTON_SELECTOR);
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    console.log("로그인 성공");

    // 4) 감시 대상 페이지 반복
    for (const url of TARGET_URLS) {
      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

        const title = await page.title();
        console.log("페이지:", url, "제목:", title);

        for (const kw of KEYWORDS) {
          if (title.includes(kw) && alerted[url] !== title) {
            await sendTelegram(`🔔 키워드 감지: ${kw}\n제목: ${title}\nURL: ${url}`);

            alerted[url] = title;
            fs.writeFileSync(ALERT_FILE, JSON.stringify(alerted, null, 2));
          }
        }
      } catch (e) {
        console.log(`페이지 실패: ${url}`, e.message);
      }
    }
  } catch (e) {
    console.log("스크립트 오류:", e);
  }

  await browser.close();
  console.log("작업 완료");
}

run();


