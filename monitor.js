// monitor.js
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config();
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// ----------------------
// 설정
// ----------------------
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const loginUrl = 'https://sexbam42.top';
const username = process.env.SITE_USERNAME;
const password = process.env.SITE_PASSWORD;

const targetUrls = [
  'https://sexbam42.top/index.php?mid=sschkiss&category=2827265&document_srl=293483816', //오션
  'https://sexbam42.top/index.php?mid=sschkiss&category=2827254&document_srl=368834929',  //나는솔로
  'https://sexbam42.top/index.php?mid=sschkiss&category=159596652&document_srl=130133201',  //교감
  'https://sexbam42.top/index.php?mid=sschkiss&category=12782286&document_srl=365408541',  //시네마
  'https://sexbam42.top/index.php?mid=sschkiss&category=12782286&document_srl=353563931',  //봉봉
  'https://sexbam42.top/index.php?mid=sschkiss&category=2827259&document_srl=384663498',  //미라지
  'https://sexbam42.top/index.php?mid=sschkiss&category=115731753&document_srl=235444641',  //종이집
  'https://sexbam42.top/index.php?mid=sschkiss&category=12782286&document_srl=345076829', //라이크
  'https://sexbam26.top/index.php?mid=sschkiss&category=153551549&document_srl=285322507', //어피치
  'https://sexbam26.top/index.php?mid=sschkiss&category=153551549&document_srl=159598777' //스쿨
];

const keywords = ['코코넛','제이니','홍시','은수','솔지','홍유경','도쿄','아바나','봉쥬르','해린','프림','한다람'];

// 중복 체크 파일
const ALERT_FILE = path.resolve('./alerted.json');
let alertedKeywords = {};

// 파일에서 읽기
if (fs.existsSync(ALERT_FILE)) {
  alertedKeywords = JSON.parse(fs.readFileSync(ALERT_FILE, 'utf-8'));
}

// ----------------------
// 텔레그램 전송 함수
// ----------------------
async function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
    });
    console.log('Telegram 메시지 전송 완료:', await res.text());
  } catch (err) {
    console.log('Telegram 전송 오류:', err);
  }
}

// ----------------------
// 실행 함수
// ----------------------
async function runMonitor() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 로그인
    await page.goto(loginUrl, { waitUntil: 'networkidle2' });
    await page.type('input[name="username"]', username);
    await page.type('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000); // 로그인 후 잠시 대기

    console.log('로그인 완료');

    // 각 타겟 페이지 확인
    for (const url of targetUrls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        const title = await page.title();
        console.log('페이지 제목:', title);

        // 키워드 체크
        for (const kw of keywords) {
          if (title.includes(kw) && !alertedKeywords[url]) {
            await sendTelegramMessage(`🔔 ${kw} 감지!\n제목: ${title}\n링크: ${url}`);
            alertedKeywords[url] = title;
          }
        }
      } catch (err) {
        console.log(`페이지 요청 실패: ${url}`, err.message);
      }
    }

    // 파일에 저장
    fs.writeFileSync(ALERT_FILE, JSON.stringify(alertedKeywords, null, 2));
  } catch (err) {
    console.log('로그인/스크립트 오류:', err);
  } finally {
    await browser.close();
    console.log('작업 완료');
  }
}

runMonitor();
