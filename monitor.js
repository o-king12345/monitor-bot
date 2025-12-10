// monitor.js
const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");

// -------------------------------
// 텔레그램 설정 (직접 입력)
// -------------------------------
const TELEGRAM_BOT_TOKEN = "7249872907:AAG6MqdodcUpQoXltn6TE1DajlSQ0X6DweA";
const TELEGRAM_CHAT_ID = "6030728347";

// -------------------------------
// 로그인 정보
// -------------------------------
const loginUrl = "https://sexbam42.top";
const username = "qqq314";
const password = "12345";

// -------------------------------
// 감시할 URL들
// -------------------------------
const targetUrls = [
    "https://sexbam42.top/index.php?mid=sschkiss&category=2827265&document_srl=293483816",
    "https://sexbam42.top/index.php?mid=sschkiss&category=2827254&document_srl=368834929",
    "https://sexbam42.top/index.php?mid=sschkiss&category=159596652&document_srl=130133201",
    "https://sexbam42.top/index.php?mid=sschkiss&category=12782286&document_srl=365408541",
    "https://sexbam42.top/index.php?mid=sschkiss&category=12782286&document_srl=353563931",
    "https://sexbam42.top/index.php?mid=sschkiss&category=2827259&document_srl=384663498",
    "https://sexbam42.top/index.php?mid=sschkiss&category=115731753&document_srl=235444641",
    "https://sexbam42.top/index.php?mid=sschkiss&category=12782286&document_srl=345076829",
    "https://sexbam26.top/index.php?mid=sschkiss&category=153551549&document_srl=285322507",
    "https://sexbam26.top/index.php?mid=sschkiss&category=153551549&document_srl=159598777",
];

// -------------------------------
// 감지할 키워드
// -------------------------------
const keywords = [
    "코코넛","제이니","홍시","은수","솔지",
    "홍유경","도쿄","아바나","봉쥬르",
    "해린","프림","한다람"
];

// -------------------------------
// 상태 저장 파일
// -------------------------------
const stateFile = "state.json";
let state = {};

if (fs.existsSync(stateFile)) {
    state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
}

// -------------------------------
// 텔레그램 메시지 전송
// -------------------------------
async function sendTelegram(msg) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log("텔레그램 설정이 비어있음.");
        return;
    }
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: msg
    });
    console.log("텔레그램 전송:", msg);
}

// -------------------------------
// 로그인 (쿠키 얻기)
// -------------------------------
async function login() {
    const loginPayload = new URLSearchParams();
    loginPayload.append("user_id", username);
    loginPayload.append("password", password);
    loginPayload.append("act", "procMemberLogin");

    const response = await axios.post(loginUrl, loginPayload, {
        maxRedirects: 0,
        validateStatus: () => true
    });

    const rawCookies = response.headers['set-cookie'] || [];
    const sessionCookie = rawCookies.map(c => c.split(";")[0]).join("; ");

    console.log("로그인 성공. 세션쿠키:", sessionCookie);
    return sessionCookie;
}

// -------------------------------
// 페이지 제목 추출
// -------------------------------
function extractTitle(html) {
    const $ = cheerio.load(html);
    return $("title").text().trim();
}

// -------------------------------
// 메인 로직
// -------------------------------
(async () => {
    try {
        const cookie = await login();

        for (const url of targetUrls) {
            try {
                const response = await axios.get(url, {
                    headers: { Cookie: cookie }
                });

                const title = extractTitle(response.data);
                console.log("제목:", title);

                if (!title) continue;

                // 키워드 감지
                for (const keyword of keywords) {
                    if (title.includes(keyword)) {
                        if (!state[url] || state[url] !== title) {
                            await sendTelegram(`🔔 ${keyword} 감지!\n제목: ${title}\n링크: ${url}`);
                            state[url] = title;
                        }
                    }
                }

            } catch (err) {
                console.log("페이지 요청 실패:", url, err.toString());
            }
        }

        // 상태 저장
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

        console.log("작업 완료.");
    } catch (e) {
        console.log("오류:", e.toString());
    }
})();
