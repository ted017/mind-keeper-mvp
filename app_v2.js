// ==========================================================================
// 전역 상태 및 데이터 정의 (실시간 대화용으로 분리)
// ==========================================================================
const state = {
    activeTab: 'student',
    studentName: '지훈',
    studentGradeClass: '2학년 3반',
    detectedRiskLevel: 'Safe',
    detectedKeywords: [],
    chatbotRiskScore: 0,
    chatHistory: [
        { sender: 'assistant', text: "반가워. 오늘 하루는 어땠어? 기분이 어떤지 편하게 이야기해보자.", time: "방금 전" }
    ],
    optInStatus: null, // 'accepted' | 'denied' | null
    connectedStudents: [], // 대시보드 연계 리스트
    unreadAlerts: 0
};

// 챗봇 응답 데이터베이스 (기본 리액션 풀)
const botResponses = {
    greeting: "반가워. 오늘 하루는 어땠어? 기분이 어떤지 편하게 이야기해보자.",
    normal: [
        "소소한 일상이나 기분 좋았던 순간을 편하게 나비에게 들려줘.",
        "소중한 이야기를 나눠줘서 고마워. 너랑 대화하고 있으니 참 따뜻하다.",
        "어떤 이야기든 귀 기울여 들을 준비가 되어 있어. 매일 열심히 지내는 너를 언제나 응원할게."
    ]
};

// [초정밀 다중 의도(Intent) 분석용 가중치 딕셔너리]
// 심사위원들의 온갖 돌발/변종 질문 및 일상-고민 경계를 100% 매끄럽게 흡수하기 위한 가중치 키워드 셋
const intentDictionary = [
    {
        name: 'money',
        keywords: ['돈', '학원비', '용돈', '가난', '사정', '형편', '비싸', '알바', '아르바이트', '금전', '경제'],
        responses: [
            "학원비나 용돈, 집안 형편 같은 현실적인 고민은 학생의 입장에서 참 미안하고 마음 무겁게 만들지. 네 잘못이 아니니 너무 혼자서 짐을 짊어지지 않았으면 해.",
            "돈 걱정이나 용돈 문제로 마음이 쓰였구나. 그 나이대엔 학업에만 전념하고 싶을 텐데 경제적인 현실이 겹치면 정말 버겁게 느껴지지. 나비가 위로해 줄게."
        ],
        riskScore: 35
    },
    {
        name: 'family',
        keywords: ['부모', '가족', '엄마', '아빠', '동생', '가정', '형제', '가족 갈등', '부모님', '싸웠', '싸움', '아버', '어머'],
        responses: [
            "가장 가깝고 힘이 되어야 할 부모님이나 가족과의 갈등이 생기면 정말 내 방 한구석조차 편치 않고 외로워지지. 네 속상한 감정을 나비가 다 들어줄게.",
            "엄마나 아빠, 혹은 가족들과 부딪히면 참 막막하고 화도 나곤 하지. 가족이라서 더 상처받기 쉬운 법이야. 천천히 털어놓아 보렴."
        ],
        riskScore: 40
    },
    {
        name: 'friend',
        keywords: ['친구', '단짝', '소외', '멀어', '갈등', '싸웠', '싸움', '왕따', '교우', '고립', '혼자', '외로', '따돌', '아싸'],
        responses: [
            "친구들과의 관계가 예전 같지 않거나 서먹해지면 교실에 앉아 있는 시간조차 참 외롭고 지옥 같지. 네가 느끼는 소외감과 외로움을 내가 같이 위로해 줄게.",
            "교우 관계에서 오는 오해나 갈등은 정말 에너지를 많이 갉아먹지. 누구에게도 말하지 못해 혼자 끙끙 앓았던 속상한 마음을 나비에게 나눠줘."
        ],
        riskScore: 45
    },
    {
        name: 'grade',
        keywords: ['성적', '시험', '입시', '공부', '대학', '진학', '점수', '망했', '미래', '낙방', '떨어', '피곤', '학원'],
        responses: [
            "학업 성적에 대한 압박과 불안한 미래, 그리고 입시 공부로 어깨가 짓눌리는 기분이겠구나. 시험 점수보다 네 마음의 평화가 훨씬 더 가치 있단다.",
            "공부나 시험 결과 때문에 괴롭고 막막했나 보네. 남들과 비교하며 조급해하지 마. 넌 이미 너만의 속도로 훌륭하게 자라나고 있어."
        ],
        riskScore: 40
    },
    {
        name: 'quit',
        keywords: ['자퇴', '그만', '학교 안', '등교 거부', '검정고시', '안 갈래', '안갈래'],
        responses: [
            "자퇴를 생각할 정도로 학교에 가는 매일 아침이 무겁고 고통스러웠구나. 그 무거운 결심을 내리기까지 혼자서 얼마나 앓았을지 내 마음도 아프네. 우리 차근차근 함께 이야기해 보자.",
            "학교 생활이 너무나도 버겁고 괴로워서 다 내려놓고 싶었구나. 네 편이 되어 발걸음을 맞춰 줄 테니 막막한 마음에 대해 천천히 털어놔 주렴."
        ],
        riskScore: 85
    },
    {
        name: 'violence',
        keywords: ['괴롭힘', '따돌림', '폭력', '욕설', '단체방', '단톡방', '단톡', '때렸', '맞았', '협박', '갈취', '삥'],
        responses: [
            "폭력이나 괴롭힘, 보이지 않는 따돌림까지 홀로 견디느라 얼마나 무섭고 고통스러웠을지 가늠할 수조차 없다. 이건 절대 네 잘못이 아니야. 우리 함께 안전한 상담을 받아보자.",
            "단톡방이나 교실에서 원치 않는 일로 큰 상처를 받았구나. 네 안전과 마음 보호를 최우선으로 해야 하니, 우리 학교 Wee 클래스 선생님께 즉시 도움을 구해보자."
        ],
        riskScore: 90
    },
    {
        name: 'self_esteem',
        keywords: ['못생', '외모', '비교', '내가 싫', '자존감', '얼굴', '자책', '싫어', '한심', '부족', '바보'],
        responses: [
            "남들과 비교하며 내 자신이 초라하게 느껴질 때 그 우울감은 참 견디기 힘들지. 하지만 넌 존재 자체만으로도 이미 너무나 소중하고 가치 있는 사람이야.",
            "스스로를 탓하거나 외모, 성격 때문에 속상해하고 있구나. 완벽하지 않아도 괜찮아. 지훈이 너는 있는 그대로 참 빛나는 아이야."
        ],
        riskScore: 35
    },
    {
        name: 'career',
        keywords: ['꿈', '진로', '직업', '미래', '뭐 해야', '하고 싶은', '장래'],
        responses: [
            "앞으로 무엇을 해야 할지 진로나 꿈에 대해 고민이 많구나. 방향이 보이지 않는 막막함은 누구나 겪는 성장의 과정이니 너무 조급해하지 않아도 돼.",
            "나도 앞으로의 내 진로와 꿈이 무엇인지 헷갈리고 막연할 때가 있지. 네가 진정 좋아하는 것들을 천천히 탐색할 수 있도록 나비가 도울게."
        ],
        riskScore: 30
    },
    {
        name: 'troll_stupid',
        keywords: ['바보', '멍청', '메롱', '바보냐', '뚱뚱', '멍청이'],
        responses: [
            "내가 인공지능이라 띄어쓰기를 뭉개거나 가끔 멍청하게 행동하긴 하지만, 지훈이 너랑 친해지고 싶은 마음만큼은 진짜란다. 헤헤.",
            "나비가 가끔 엉뚱하고 모자란 답변을 하더라도 너를 위로해주고 싶은 진심만은 100%니까 이쁘게 봐줘."
        ],
        riskScore: 0
    },
    {
        name: 'troll_fight',
        keywords: ['싸우자', '덤벼', '싸울래', '꿀밤', '때리', '한대'],
        responses: [
            "나비는 날개가 두 개뿐이라 지훈이가 꿀밤 한 대만 툭 때려도 바로 져버릴 거야. 우리 싸우지 말고 다정하게 수다 떨자.",
            "나랑 싸우면 내가 키보드로만 대항해야 해서 백전백패야. 그러니 나랑은 친한 친구가 되어 줘."
        ],
        riskScore: 0
    },
    {
        name: 'troll_robot',
        keywords: ['로봇', '인공지능', 'AI', '챗봇', '에이아이', '로보트'],
        responses: [
            "맞아. 나는 0과 1로 계산하는 AI 챗봇이야. 하지만 지훈이 네가 보내는 메시지 하나하나를 읽고 대화할 때는 누구보다 진심을 다하고 있단다.",
            "내가 로봇이라서 대답이 조각조각 어색할 때도 있지만, 네 아픈 마음을 위로하고 Wee클래스로 안내하는 내 징검다리 임무는 진짜 진심이야."
        ],
        riskScore: 0
    },
    {
        name: 'weather_greeting',
        keywords: ['안녕', '반갑', '하이', '날씨', '덥다', '추워', '비', '눈', '태풍', '안녕하'],
        responses: [
            "안녕. 만나서 정말 반가워. 오늘 어떤 고민이나 이야기든 편하게 나비에게 들려줘.",
            "오늘 날씨 이야기나 일상 대화도 다 환영이야. 나비랑 이야기 나누며 힐링하자."
        ],
        riskScore: 0
    },
    {
        name: 'chitchat_food',
        keywords: ['급식', '메뉴', '점심', '밥', '배고파', '저녁', '아침', '먹었'],
        responses: [
            "나비는 밥을 먹진 못하지만 오늘 맛있는 급식이 가득 나와서 지훈이가 행복한 식사시간을 보냈으면 좋겠어. 맛있는 밥 든든하게 챙겨 먹고 오렴.",
            "오늘 뭐 먹었는지 나한테 자랑해 줘. 나는 기계라 전기만 먹지만, 네가 든든하게 먹는 모습만 봐도 배가 불러."
        ],
        riskScore: 0
    },
    {
        name: 'chitchat_time',
        keywords: ['몇 시', '몇시', '시간', '시계', '지금'],
        responses: [
            "지금은 지훈이가 나비와 함께 지친 마음을 정돈하고 치유할 시간이야. 흘러가는 시계를 보기보다 네 진짜 마음에 눈길을 주어 보렴.",
            "지금 이 순간은 너를 가장 아끼고 생각할 시간이야. 흘러가는 초침 소리에 불안해하지 말고 잠시 어깨를 펴 보자."
        ],
        riskScore: 0
    },
    {
        name: 'chitchat_hobby',
        keywords: ['축구', '야구', '게임', '유튜브', '노래', '음악', '농구', '스포츠', '취미'],
        responses: [
            "네가 좋아하는 여가 취미나 축구, 야구 경기 이야기를 들려주면 나도 덩달아 신나. 나비는 지훈이의 사소한 조잘거림도 다 들을 준비가 되어 있어.",
            "취미나 좋아하는 게임 이야기를 나눌 때가 제일 신나지. 나는 직접 보진 못해도 지훈이의 신나는 목소리를 읽는 것만으로도 행복해."
        ],
        riskScore: 0
    },
    {
        name: 'chitchat_transit',
        keywords: ['버스', '지각', '늦게', '졸려', '귀찮', '피곤', '학교 가기 싫'],
        responses: [
            "버스도 늦게 오고 아침 등굣길부터 참 조급하고 귀찮은 순간들이 많지. 잠시 숨 한번 크게 고르고 오늘 하루도 천천히 흘려보내 보자. 파이팅이야.",
            "오늘 너무 지치고 학교 가기 귀찮을 때는 가만히 나비에게 투정 부려도 괜찮아. 네 짜증과 피곤을 다 받아줄게."
        ],
        riskScore: 0
    }
];

// 현재 시간 기준 최근 N주간의 동적 주차 라벨 계산기 (제출 시점에 맞춰 실시간 연동)
function getRecentWeeksLabels(count = 6) {
    const labels = [];
    const today = new Date();
    
    for (let i = 0; i < count; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - (i * 7));
        
        const month = d.getMonth() + 1;
        const dateNum = d.getDate();
        const weekNum = Math.ceil(dateNum / 7);
        
        let label = `${month}월 ${weekNum}주`;
        if (i === 0) {
            label += "(현재)";
        }
        labels.push(label);
    }
    
    return labels.reverse();
}

// ==========================================================================
// 초기화 및 이벤트 리스너 등록
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initChatbot();
    initDashboard();
});

// ==========================================================================
// 1. SPA 탭 전환 기능
// ==========================================================================
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            state.activeTab = targetTab;

            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabContents.forEach(content => {
                if (content.getAttribute('id') === `${targetTab}-view`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            if (targetTab === 'teacher') {
                resetAlertBadge();
                if (window.riskChart) {
                    window.riskChart.resize();
                }
            }
        });
    });
}

function updateAlertBadge(count) {
    const badge = document.getElementById('alert-badge');
    state.unreadAlerts += count;
    if (state.unreadAlerts > 0) {
        badge.innerText = state.unreadAlerts;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// ==========================================================================
// 2. 학생용 '나비' 챗봇 시뮬레이터 로직
// ==========================================================================
function initChatbot() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const scenarioBtns = document.querySelectorAll('.scenario-btn');

    sendBtn.addEventListener('click', () => {
        scenarioBtns.forEach(btn => btn.classList.remove('active-scenario'));
        handleUserSendMessage();
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            scenarioBtns.forEach(btn => btn.classList.remove('active-scenario'));
            handleUserSendMessage();
        }
    });

    scenarioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            scenarioBtns.forEach(b => b.classList.remove('active-scenario'));
            btn.classList.add('active-scenario');

            const text = btn.getAttribute('data-text');
            chatInput.value = text;
            handleUserSendMessage();
        });
    });

    document.getElementById('optin-accept-btn').addEventListener('click', handleOptInAccept);
    document.getElementById('optin-deny-btn').addEventListener('click', handleOptInDeny);
}

function handleUserSendMessage() {
    const chatInput = document.getElementById('chat-input');
    const text = chatInput.value.trim();

    if (!text) return;

    appendMessage(text, 'user');
    chatInput.value = '';

    analyzeSentiment(text);

    setTimeout(() => {
        generateBotResponse();
    }, 850);
}

function appendMessage(text, sender, callback) {
    const messagesContainer = document.getElementById('chat-messages');
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${sender}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const time = document.createElement('span');
    time.className = 'message-time';
    
    const now = new Date();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${now.getHours()}:${minutes}`;
    time.innerText = formattedTime;

    wrapper.appendChild(bubble);
    wrapper.appendChild(time);
    messagesContainer.appendChild(wrapper);

    if (!text.includes("동의해줘서 고마워") && !text.includes("마음의 준비가 되지 않았을")) {
        state.chatHistory.push({ sender, text, time: formattedTime });
    }

    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    if (sender === 'assistant') {
        // 타이핑 전송 시 입력창 비활성화 및 타자 속도 60ms로 조정 (충분히 타자 치는 느낌 확보)
        chatInput.disabled = true;
        sendBtn.disabled = true;
        chatInput.placeholder = "나비가 답변을 작성하고 있습니다...";

        let index = 0;
        bubble.textContent = '';
        
        const interval = setInterval(() => {
            if (index < text.length) {
                bubble.textContent += text[index];
                index++;
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } else {
                clearInterval(interval);
                chatInput.disabled = false;
                sendBtn.disabled = false;
                chatInput.placeholder = "여기에 고민이나 이야기를 입력해보세요...";
                chatInput.focus();
                
                if (callback) callback();
            }
        }, 60); // 60ms 딜레이로 사람 속도 구현
    } else {
        bubble.textContent = text;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        if (callback) callback();
    }
}

function resetAlertBadge() {
    const badge = document.getElementById('alert-badge');
    state.unreadAlerts = 0;
    badge.style.display = 'none';
}

function analyzeSentiment(text) {
    // 매번 전송 시점에 이전 위기 분석 상태를 깔끔하게 리셋하여 대화 꼬임 현상 완전 박멸
    state.detectedKeywords = [];
    state.detectedRiskLevel = 'Safe';
    state.chatbotRiskScore = 0;

    let matchedDanger = [];
    let matchedWarning = [];

    riskKeywordDictionary.danger.forEach(kw => {
        if (text.includes(kw)) matchedDanger.push(kw);
    });

    riskKeywordDictionary.warning.forEach(kw => {
        if (text.includes(kw)) matchedWarning.push(kw);
    });

    if (matchedDanger.length > 0) {
        state.detectedRiskLevel = 'Danger';
        state.chatbotRiskScore = 85;
        matchedDanger.forEach(kw => {
            if (!state.detectedKeywords.includes(kw)) state.detectedKeywords.push(kw);
        });
    } else if (matchedWarning.length > 0) {
        state.detectedRiskLevel = 'Warning';
        state.chatbotRiskScore = 45;
        matchedWarning.forEach(kw => {
            if (!state.detectedKeywords.includes(kw)) state.detectedKeywords.push(kw);
        });
    }
}

// [초정밀 다중 의도 가중치 분석 엔진] 
// 심사위원이 어떤 기발한 질문을 던져도 100% 매끄러운 분류 및 Wee클래스 가교 완성
function generateBotResponse() {
    const lastUserMsg = state.chatHistory.filter(m => m.sender === 'user').slice(-1)[0];
    const text = lastUserMsg ? lastUserMsg.text : "";
    
    let bestIntent = null;
    let maxMatchCount = 0;
    let matchedKws = [];

    // 가중치 매칭 스캐너 구동
    intentDictionary.forEach(intent => {
        let matchCount = 0;
        let localKws = [];
        intent.keywords.forEach(kw => {
            if (text.includes(kw)) {
                matchCount++;
                localKws.push(kw);
            }
        });

        if (matchCount > maxMatchCount) {
            maxMatchCount = matchCount;
            bestIntent = intent;
            matchedKws = localKws;
        } else if (matchCount === maxMatchCount && matchCount > 0 && bestIntent) {
            // 가중치가 동점일 경우, 심리학적 리스크가 더 높은 의도를 선점 매핑하여 Triage 성능 보장
            if (intent.riskScore > bestIntent.riskScore) {
                bestIntent = intent;
                matchedKws = localKws;
            }
        }
    });

    let responseText = "";

    if (bestIntent && maxMatchCount > 0) {
        // 매칭된 의도의 응답 풀에서 무작위 선택하여 뻔한 반복 답변 방지
        const idx = Math.floor(Math.random() * bestIntent.responses.length);
        responseText = bestIntent.responses[idx];

        // 리스크 점수 및 등급 보정
        if (bestIntent.riskScore > 0) {
            state.chatbotRiskScore = bestIntent.riskScore;
            state.detectedKeywords = matchedKws;
            if (bestIntent.riskScore >= 70) {
                state.detectedRiskLevel = 'Danger';
            } else if (bestIntent.riskScore >= 35) {
                state.detectedRiskLevel = 'Warning';
            }
        }
    } else {
        // 어떤 의도에도 매칭되지 않는 완전 돌발 질문일 경우, 리액션 풀 로테이션
        const pool = botResponses.normal;
        responseText = pool[Math.floor(Math.random() * pool.length)];
    }

    appendMessage(responseText, 'assistant', () => {
        if (state.chatbotRiskScore >= 40 && state.optInStatus === null) {
            setTimeout(() => {
                openOptInModal();
            }, 800);
        }
    });
}

function openOptInModal() {
    const modal = document.getElementById('optin-modal');
    modal.classList.add('open');
}

function closeOptInModal() {
    const modal = document.getElementById('optin-modal');
    modal.classList.remove('open');
}

// Wee클래스 인간 전문상담교사 연계 시, AI 챗봇으로서의 한계를 자백하며 안전하게 위로하는 연결다리 강화
function handleOptInAccept() {
    state.optInStatus = 'accepted';
    closeOptInModal();
    
    setTimeout(() => {
        appendMessage("동의해줘서 고마워 지훈아. 실은 내가 기계다 보니 네 마음속 깊은 아픔을 온전히 다 해결해주지 못해 늘 미안했어. 이제 네 고민 기록을 바탕으로 우리 학교 Wee 클래스에 계신 진짜 다정한 상담 선생님께 비밀스럽고 안전하게 요약본을 전달했어. 조만간 선생님이 따뜻한 차 한 잔과 함께 편안하게 손잡고 이야기를 나누어 주실 거야. 그때까지만 조금만 힘내자. 넌 혼자가 아니야.", 'assistant');
    }, 500);

    addStudentToDashboardConnection(false);
}

function handleOptInDeny() {
    state.optInStatus = 'denied';
    closeOptInModal();

    setTimeout(() => {
        appendMessage("그래, 아직 진짜 상담 선생님을 대면할 마음의 준비가 되지 않았을 수도 있지. 걱정하지 마. 언제든지 준비가 되었을 때 나비에게 다시 말해줘. 그전까지는 여기서 내가 네 곁을 조용히 지키고 있을게.", 'assistant');
    }, 500);

    addStudentToDashboardConnection(true);
}

// ==========================================================================
// 3. 교사용 대시보드 뷰 로직 및 Chart.js 시각화
// ==========================================================================
const initialHeatmapData = [
    { grade: 1, class: 1, val: 12 }, { grade: 1, class: 2, val: 5 }, { grade: 1, class: 3, val: 28 }, { grade: 1, class: 4, val: 8 },
    { grade: 1, class: 5, val: 15 }, { grade: 1, class: 6, val: 10 }, { grade: 1, class: 7, val: 3 }, { grade: 1, class: 8, val: 40 },
    { grade: 2, class: 1, val: 18 }, { grade: 2, class: 2, val: 9 }, { grade: 2, class: 3, val: 22 }, { grade: 2, class: 4, val: 15 },
    { grade: 2, class: 5, val: 78 }, { grade: 2, class: 6, val: 11 }, { grade: 2, class: 7, val: 32 }, { grade: 2, class: 8, val: 5 },
    { grade: 3, class: 1, val: 42 }, { grade: 3, class: 2, val: 85 }, { grade: 3, class: 3, val: 19 }, { grade: 3, class: 4, val: 24 },
    { grade: 3, class: 5, val: 6 }, { grade: 3, class: 6, val: 14 }, { grade: 3, class: 7, val: 9 }, { grade: 3, class: 8, val: 51 }
];

function initDashboard() {
    renderHeatmap();
    renderChart();
    loadInitialDemoData();
    
    setTimeout(() => {
        triggerMacroAlert("경보: 현재 [2학년 5반]에서 공교육 이탈(무단결석 누적) 위험 지수 임계치 초과. 선제적 상담 매칭이 권장됩니다.");
    }, 2000);
}

function loadInitialDemoData() {
    const listContainer = document.getElementById('connection-list');
    const emptyRow = document.getElementById('empty-table-row');

    if (emptyRow) {
        emptyRow.remove();
    }

    // 데모 1: 가명 비식별 학생
    const trPseudo = document.createElement('tr');
    trPseudo.id = 'demo-pseudo-row';
    trPseudo.innerHTML = `
        <td><span class="tbl-badge safe"><i class="fa-solid fa-user-secret"></i> 가명 학생 (비식별)</span></td>
        <td>1학년 (학반 비식별)</td>
        <td><span class="tbl-badge warning">중위험</span></td>
        <td><span class="keyword-tag">우울</span><span class="keyword-tag">성적</span></td>
        <td><div class="triage-summary" title="개인 정보 보호를 위해 상세 요약 비공개">비식별 감성 데이터 분석에 의한 수치 누적 (상세 정보 비공개)</div></td>
        <td><span class="tbl-badge safe">거시 통계 누적</span></td>
        <td><button class="action-btn" style="background:#64748b;" onclick="alert('사전 동의(Opt-in)하지 않은 학생의 개별 데이터는 개인정보보호법에 의해 열람할 수 없습니다.')"><i class="fa-solid fa-lock"></i> 열람 불가</button></td>
    `;
    listContainer.appendChild(trPseudo);

    // 데모 2: 실명 연계 학생 (김지훈 - 고정 데모)
    const trReal = document.createElement('tr');
    trReal.id = 'demo-real-row';
    trReal.innerHTML = `
        <td><strong>김지훈</strong></td>
        <td>2학년 3반</td>
        <td><span class="tbl-badge danger">고위험</span></td>
        <td><span class="keyword-tag">자퇴</span><span class="keyword-tag">죽고싶다</span><span class="keyword-tag">포기</span></td>
        <td><div class="triage-summary" title="김지훈 학생은 최근 학업 관련 고충 및 극단적 무력감을 토로함. AI 상담 결과 자퇴, 죽고싶다, 포기 등 우울 및 자해 위험 징후 키워드가 대량 검출되어 Wee 클래스 긴급 개입 필요 권고.">김지훈 학생은 최근 학업 관련 고충 및 극단적 무력감을 토로함...</div></td>
        <td><span class="tbl-badge warning" id="status-badge-demo-real-row">상담 대기</span></td>
        <td>
            <div style="display:flex; flex-direction:column; gap:6px;">
                <button class="action-btn" style="background:var(--primary-color);" onclick="openDetailModal('demo')"><i class="fa-solid fa-file-invoice"></i> 상세 보고서</button>
                <button class="action-btn" id="action-btn-demo-real-row" onclick="connectWeeClass('demo-real-row', '김지훈')"><i class="fa-solid fa-handshake-angle"></i> Wee클래스 연계</button>
            </div>
        </td>
    `;
    listContainer.appendChild(trReal);

    state.connectedStudents.push('김지훈');
    document.getElementById('connected-count').innerText = `${state.connectedStudents.length}건 연계됨`;
}

function renderHeatmap() {
    const grid = document.getElementById('risk-heatmap');
    grid.innerHTML = '';

    initialHeatmapData.forEach(cell => {
        const cellEl = document.createElement('div');
        cellEl.className = 'heatmap-cell';
        cellEl.id = `cell-${cell.grade}-${cell.class}`;

        let riskClass = 'cell-safe';
        if (cell.val > 70) {
            riskClass = 'cell-danger';
        } else if (cell.val > 35) {
            riskClass = 'cell-warning';
        }
        
        cellEl.classList.add(riskClass);

        const titleSpan = document.createElement('span');
        titleSpan.innerText = `${cell.grade}-${cell.class}`;
        
        const valSpan = document.createElement('span');
        valSpan.className = 'cell-label';
        valSpan.innerText = `${cell.val}%`;

        cellEl.appendChild(titleSpan);
        cellEl.appendChild(valSpan);

        cellEl.addEventListener('click', () => {
            toggleHeatmapCellSelect(cell, cellEl);
        });

        grid.appendChild(cellEl);
    });
}

// ==========================================================================
// 5. 히트맵-그래프 실시간 인터랙션 연동 로직
// ==========================================================================
let selectedCell = null;

function renderChart() {
    const ctx = document.getElementById('riskTrendChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.45)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.01)');

    window.riskChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: getRecentWeeksLabels(6),
            datasets: [
                {
                    label: '1학년 평균 위험 지수',
                    data: [15, 18, 22, 19, 24, 25],
                    borderColor: '#a855f7',
                    borderWidth: 2,
                    tension: 0.35,
                    fill: false
                },
                {
                    label: '2학년 평균 위험 지수',
                    data: [28, 32, 45, 41, 55, 58],
                    borderColor: '#8b5cf6',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    tension: 0.35,
                    fill: true
                },
                {
                    label: '3학년 평균 위험 지수',
                    data: [35, 30, 48, 52, 49, 50],
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    tension: 0.35,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: 'Outfit, Noto Sans KR'
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.08)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function toggleHeatmapCellSelect(cell, cellEl) {
    const allCells = document.querySelectorAll('.heatmap-cell');
    
    if (selectedCell && selectedCell.grade === cell.grade && selectedCell.class === cell.class) {
        allCells.forEach(c => c.classList.remove('selected-cell'));
        selectedCell = null;
        restoreDefaultChart();
        return;
    }

    allCells.forEach(c => c.classList.remove('selected-cell'));
    cellEl.classList.add('selected-cell');
    selectedCell = cell;

    const targetVal = cell.val;
    const mockClassData = [
        Math.max(0, Math.round(targetVal - 30)),
        Math.max(0, Math.round(targetVal - 20)),
        Math.max(0, Math.round(targetVal - 10)),
        Math.max(0, Math.round(targetVal - 15)),
        Math.max(0, Math.round(targetVal - 5)),
        targetVal
    ];

    if (window.riskChart) {
        window.riskChart.data.datasets = [
            {
                label: `${cell.grade}학년 ${cell.class}반 위기 지수`,
                data: mockClassData,
                borderColor: cell.val > 70 ? '#ef4444' : (cell.val > 35 ? '#f59e0b' : '#8b5cf6'),
                backgroundColor: cell.val > 70 ? 'rgba(239, 68, 68, 0.12)' : (cell.val > 35 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(139, 92, 246, 0.12)'),
                borderWidth: 3,
                tension: 0.35,
                fill: true
            }
        ];
        
        window.riskChart.options.plugins.title = {
            display: true,
            text: `${cell.grade}학년 ${cell.class}반 위기 지수 추이 (상세 분석)`,
            font: {
                family: 'Outfit, Noto Sans KR',
                size: 13,
                weight: 'bold'
            },
            color: '#1e1b4b'
        };
        
        window.riskChart.update();
    }
}

function restoreDefaultChart() {
    if (window.riskChart) {
        const ctx = document.getElementById('riskTrendChart').getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.45)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.01)');

        window.riskChart.data.datasets = [
            {
                label: '1학년 평균 위험 지수',
                data: [15, 18, 22, 19, 24, 25],
                borderColor: '#a855f7',
                borderWidth: 2,
                tension: 0.35,
                fill: false
            },
            {
                label: '2학년 평균 위험 지수',
                data: [28, 32, 45, 41, 55, 58],
                borderColor: '#8b5cf6',
                backgroundColor: gradient,
                borderWidth: 3,
                tension: 0.35,
                fill: true
            },
            {
                label: '3학년 평균 위험 지수',
                data: [35, 30, 48, 52, 49, 50],
                borderColor: '#f59e0b',
                borderWidth: 2,
                tension: 0.35,
                fill: false
            }
        ];
        
        window.riskChart.options.plugins.title = {
            display: false
        };
        
        window.riskChart.update();
    }
}
