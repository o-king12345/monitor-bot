// monitor.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

// ----------------------
// 설정
// ----------------------
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const loginUrl = 'https://sexbam42.top';
const username = process.env.SITE_USERNAME;
const password = process.env.SITE_PASSWORD;

const targetUrls = [
  'https://sexbam42.top/index.php?mid=sschkiss&category=2827265&document_srl=293483816',
  'https://sexbam42.top/index.php?mid=sschkiss&category=2827254&document_srl=368834929',
  'https://sexbam42.top/index.php?mid=sschkiss&category=159596652&document_srl=130133201',
  'https://sexbam42.top/index.php?mid=sschkiss&category=12782286&document_srl=365408541',
  'https://sexbam42.top/index.php?mid=sschkiss&category=12782286&document_srl=353563931',
  'https://sexbam42.top/index.php?mid=sschkiss&category=2827259&document_srl=384663498',
  'https://sexbam42.top/index.php?mid=sschkiss&category=115731753&document_srl=235444641',
  'https://sexbam42.top/index.php?mid=sschkiss&category=12782286&document_srl=345076829',
  'https://sexbam26.top/index.php?mid=sschkiss&category=153551549&document_srl=285322507',
  'https://sexbam26.top/index.php?mid=sschkiss&category=153551549&document_srl=159598777'
];

const keywords = ['코코넛','제이니','홍시','은수','솔지','홍유경','도쿄','아바나','봉쥬르','해린','프림','한다람'];

// 중복 체크 파일
const ALERT_FILE = path.resolve('./alerted.json');
let alertedKeywords = {};
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
// 로그인 및 세션 쿠키 가져오기
// ----------------------
async function login() {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const res = await fetch(loginUrl, {
    method: 'POST',
    body: formData,
    redirect: 'manual'
  });

  const cookies = res.headers.get('set-cookie');
  if (!cookies) throw new Error('로그인 실패: 쿠키 없음');
  const sessionCookie = cookies.split(';')[0];
  console.log('로그인 성공, 세션쿠키:', sessionCookie);
  return sessionCookie;
}

// ----------------------
// HTML에서 제목 추출
// ----------------------
function extractTitle(html) {
  const match = html.match(/<title>(.*?)<\/title>/);
  return match ? match[1].trim() : '';
}

// ----------------------
// 페이지 체크
// ----------------------
async function checkPages() {
  try {
    const sessionCookie = await login();

    for (const url of targetUrls) {
      try {
        const res = await fetch(url, {
          headers: { 'Cookie': sessionCookie }
        });

        if (!res.ok) {
          console.log(`페이지 요청 실패 (${res.status}):`, url);
          continue;
        }

        const html = await res.text();
        const title = extractTitle(html);
        console.log('페이지 제목:', title);

        // 키워드 체크
        for (const kw of keywords) {
          if (title.includes(kw) && alertedKeywords[url] !== title) {
            await sendTelegramMessage(`🔔 ${kw} 감지!\n제목: ${title}\n링크: ${url}`);
            alertedKeywords[url] = title;
          }
        }
      } catch (err) {
        console.log('페이지 요청 에러:', url, err.message);
      }
    }

    // 중복 저장
    fs.writeFileSync(ALERT_FILE, JSON.stringify(alertedKeywords, null, 2));

  } catch (err) {
    console.log('로그인/스크립트 오류:', err.message);
  }
}

// ----------------------
// 실행
// ----------------------
checkPages();
