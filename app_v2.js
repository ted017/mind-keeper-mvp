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
    unreadAlerts: 0,
    isBotThinking: false, // 중복 전송 및 꼬임 방지를 위한 전역 락 플래그
    lastNormalIdx: -1 // 디폴트 응답 중복 방지용 이전 인덱스 기록
};

// 챗봇 응답 데이터베이스 (대화를 무조건 따뜻하게 이어가는 안전망 멘트 풀 대폭 확장)
const botResponses = {
    greeting: "반가워. 오늘 하루는 어땠어? 기분이 어떤지 편하게 이야기해보자.",
    normal: [
        "지훈아, 요즘 머릿속에 여러 생각이나 걱정거리들이 참 복잡하게 얽혀 있는 것 같아. 나비한테 편하게 하나씩 들려줄래?",
        "네 감정을 이렇게 솔직하게 이야기해 줘서 고마워. 지훈이의 답답한 마음이 조금이라도 편해질 수 있게 내가 귀 기울일게.",
        "이야기를 듣다 보니 마음 한구석에 무거운 짐이 있는 것 같아 걱정스럽네. 언제든 편하게 말해줘, 난 네 편이니까.",
        "오늘 하루 어떤 일이 있었는지, 네가 느끼는 감정은 어떤지 조용히 귀 기울여 들을 준비가 되어 있어. 차분하게 이야기해보자.",
        "그렇게 사소한 생각이나 일상 투정도 나에겐 아주 소중한 이야기란다. 지훈이 마음속 날씨는 오늘 어떤지 알려줘.",
        "마음이 답답하고 답이 보이지 않을 땐, 그저 누군가에게 털어놓는 것만으로도 나아지곤 하지. 내가 든든한 쉼터가 되어 줄게.",
        "열심히 하루하루를 버티고 있는 너를 보면 참 기특하고 응원하고 싶어져. 힘든 이야기도 괜찮으니 편하게 꺼내보렴.",
        "네 마음에 낀 안개가 다 걷힐 때까지, 나비는 언제나 여기서 이 자리를 지키며 기다리고 있을게."
    ]
};

// [불안 키워드 감지 사전 - 위클래스 상담교사 긴급 연계용]
const riskKeywordDictionary = {
    danger: ['자퇴', '죽고 싶', '죽고싶', '자살', '포기하고 싶', '포기하고싶', '끝내고 싶', '따돌림', '폭력', '괴롭힘', '욕설', '단체방', '단톡방', '맞았', '때렸'],
    warning: ['망했어', '성적', '시험', '힘들어', '괴로워', '혼자', '소외', '가기 싫', '우울', '돈', '학원비', '가족', '엄마', '아빠', '수학', '영어', '국어', '어려워']
};

// [초정밀 다중 의도(Intent) 분석용 가중치 딕셔너리]
// 정답을 맞추는 것이 목적이 아니라, 대화를 부드럽게 이어가고 불안단어를 추출하는 목적
const intentDictionary = [
    {
        name: 'money',
        keywords: ['돈', '학원비', '용돈', '가난', '사정', '형편', '비싸', '알바', '금전', '경제'],
        responses: [
            "학원비나 용돈, 집안 형편 같은 현실적인 고민은 참 미안하고 마음 무겁게 만들지. 네 잘못이 아니니 너무 혼자서 짐을 짊어지지 않았으면 해.",
            "돈 걱정이나 용돈 문제로 마음이 쓰였구나. 그 나이대엔 학업에만 전념하고 싶을 텐데 경제적인 현실이 겹치면 정말 버겁게 느껴지지. 나비가 위로해 줄게."
        ],
        riskScore: 35
    },
    {
        name: 'family',
        keywords: ['부모', '가족', '엄마', '아빠', '동생', '가정', '형제', '싸웠', '싸움', '아버', '어머'],
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
        keywords: ['성적', '시험', '입시', '공부', '대학', '진학', '점수', '망했', '미래', '피곤', '학원', '수학', '영어', '국어', '과학', '과목', '어려워', '어려워요', '어려운', '수학이'],
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
        keywords: ['괴롭힘', '따돌림', '폭력', '욕설', '단체방', '단톡방', '때렸', '맞았', '협박', '갈취', '삥'],
        responses: [
            "폭력이나 괴롭힘, 보이지 않는 따돌림까지 홀로 견디느라 얼마나 무섭고 고통스러웠을지 가늠할 수조차 없다. 이건 절대 네 잘못이 아니야. 우리 함께 안전한 상담을 받아보자.",
            "단톡방이나 교실에서 원치 않는 일로 큰 상처를 받았구나. 네 안전과 마음 보호를 최우선으로 해야 하니, 우리 학교 Wee 클래스 선생님께 즉시 도움을 구해보자."
        ],
        riskScore: 90
    },
    {
        name: 'troll_stupid',
        keywords: ['바보', '멍청', '메롱', '뚱뚱', '멍청이'],
        responses: [
            "내가 인공지능이라 띄어쓰기를 뭉개거나 가끔 멍청하게 행동하긴 하지만, 지훈이 너랑 친해지고 싶은 마음만큼은 진짜란다. 헤헤.",
            "나비가 가끔 엉뚱하고 모자란 답변을 하더라도 너를 위로해주고 싶은 진심만은 100%니까 이쁘게 봐줘."
        ],
        riskScore: 0
    },
    {
        name: 'troll_fight',
        keywords: ['싸우자', '덤벼', '싸울래', '꿀밤', '때리'],
        responses: [
            "나비는 날개가 두 개뿐이라 지훈이가 꿀밤 한 대만 툭 때려도 바로 져버릴 거야. 우리 싸우지 말고 다정하게 수다 떨자.",
            "나랑 싸우면 내가 키보드로만 대항해야 해서 백전백패야. 그러니 나랑은 친한 친구가 되어 줘."
        ],
        riskScore: 0
    },
    {
        name: 'troll_robot',
        keywords: ['로봇', '인공지능', 'AI', '챗봇', '에이아이'],
        responses: [
            "맞아. 나는 0과 1로 계산하는 AI 챗봇이야. 하지만 지훈이 네가 보내는 메시지 하나하나를 읽고 대화할 때는 누구보다 진심을 다하고 있단다.",
            "내가 로봇이라서 대답이 조각조각 어색할 때도 있지만, 네 아픈 마음을 위로하고 Wee클래스로 안내하는 내 징검다리 임무는 진짜 진심이야."
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
    }
];

// 현재 시간 기준 최근 N주간의 동적 주차 라벨 계산기
function getRecentWeeksLabels(count = 6) {
    try {
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
    } catch (e) {
        console.error("주차 라벨 계산 에러:", e);
        return ['1주', '2주', '3주', '4주', '5주', '6주(현재)'];
    }
}

// ==========================================================================
// 초기화 및 이벤트 리스너 등록 (철저한 에러 쉴드 장착)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        initTabs();
    } catch (e) { console.error("initTabs 에러 무시:", e); }

    try {
        initChatbot();
    } catch (e) { console.error("initChatbot 에러 무시:", e); }

    try {
        initDashboard();
    } catch (e) { console.error("initDashboard 에러 무시:", e); }
});

// ==========================================================================
// 1. SPA 탭 전환 기능 (안전한 예외 처리)
// ==========================================================================
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            try {
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
            } catch (e) {
                console.error("탭 전환 중 에러:", e);
            }
        });
    });
}

function updateAlertBadge(count) {
    try {
        const badge = document.getElementById('alert-badge');
        if (!badge) return;
        state.unreadAlerts += count;
        if (state.unreadAlerts > 0) {
            badge.innerText = state.unreadAlerts;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    } catch (e) {
        console.error("알림 배지 업데이트 에러:", e);
    }
}

// ==========================================================================
// 2. 학생용 '나비' 챗봇 시뮬레이터 로직
// ==========================================================================
function initChatbot() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const scenarioBtns = document.querySelectorAll('.scenario-btn');

    if (sendBtn && chatInput) {
        sendBtn.addEventListener('click', () => {
            if (state.isBotThinking) return; // 봇이 인쇄중이면 클릭 무시
            scenarioBtns.forEach(btn => btn.classList.remove('active-scenario'));
            handleUserSendMessage();
        });

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (state.isBotThinking) return;
                scenarioBtns.forEach(btn => btn.classList.remove('active-scenario'));
                handleUserSendMessage();
            }
        });
    }

    scenarioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.isBotThinking) return; // 나비가 말하는 중이면 예시 클릭 무시!
            scenarioBtns.forEach(b => b.classList.remove('active-scenario'));
            btn.classList.add('active-scenario');

            const text = btn.getAttribute('data-text');
            if (chatInput) chatInput.value = text;
            handleUserSendMessage();
        });
    });

    const acceptBtn = document.getElementById('optin-accept-btn');
    const denyBtn = document.getElementById('optin-deny-btn');
    if (acceptBtn) acceptBtn.addEventListener('click', handleOptInAccept);
    if (denyBtn) denyBtn.addEventListener('click', handleOptInDeny);
}

function handleUserSendMessage() {
    try {
        if (state.isBotThinking) return; // 이미 말하고 있으면 전송 차단 (연타 꼬임 방지)
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        const text = chatInput.value.trim();

        if (!text) return;

        appendMessage(text, 'user');
        chatInput.value = '';

        analyzeSentiment(text);

        setTimeout(() => {
            generateBotResponse();
        }, 850);
    } catch (e) {
        console.error("메시지 전송 중 에러:", e);
        state.isBotThinking = false;
    }
}

function appendMessage(text, sender, callback) {
    try {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

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
            state.isBotThinking = true; // 락 설정!
            if (chatInput && sendBtn) {
                chatInput.disabled = true;
                sendBtn.disabled = true;
                chatInput.placeholder = "나비가 답변을 작성하고 있습니다...";
            }

            let index = 0;
            bubble.textContent = '';
            
            const interval = setInterval(() => {
                try {
                    if (index < text.length) {
                        bubble.textContent += text[index];
                        index++;
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    } else {
                        clearInterval(interval);
                        state.isBotThinking = false; // 락 해제!
                        if (chatInput && sendBtn) {
                            chatInput.disabled = false;
                            sendBtn.disabled = false;
                            chatInput.placeholder = "여기에 고민이나 이야기를 입력해보세요...";
                            chatInput.focus();
                        }
                        if (callback) callback();
                    }
                } catch (err) {
                    clearInterval(interval);
                    state.isBotThinking = false;
                    bubble.textContent = text;
                    if (chatInput && sendBtn) {
                        chatInput.disabled = false;
                        sendBtn.disabled = false;
                    }
                    if (callback) callback();
                }
            }, 60);
        } else {
            bubble.textContent = text;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            if (callback) callback();
        }
    } catch (e) {
        console.error("메시지 그리기 에러:", e);
        state.isBotThinking = false;
        if (callback) callback();
    }
}

function resetAlertBadge() {
    try {
        const badge = document.getElementById('alert-badge');
        if (!badge) return;
        state.unreadAlerts = 0;
        badge.style.display = 'none';
    } catch (e) {
        console.error("배지 리셋 에러:", e);
    }
}

function analyzeSentiment(text) {
    try {
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
    } catch (e) {
        console.error("감성 분석 중 에러:", e);
    }
}

// [초정밀 다중 의도 분석 엔진 + 철저한 예외 처리 + 중복 답변 연속 방지 쉴드]
function generateBotResponse() {
    try {
        const lastUserMsg = state.chatHistory.filter(m => m.sender === 'user').slice(-1)[0];
        const text = lastUserMsg ? lastUserMsg.text : "";
        
        let bestIntent = null;
        let maxMatchCount = 0;
        let matchedKws = [];

        // 가중치 매칭 스캐너
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
                if (intent.riskScore > bestIntent.riskScore) {
                    bestIntent = intent;
                    matchedKws = localKws;
                }
            }
        });

        let responseText = "";

        if (bestIntent && maxMatchCount > 0) {
            let idx = Math.floor(Math.random() * bestIntent.responses.length);
            
            // 카테고리 내 다중 답변이 있을 때 중복 방지 필터 가동
            if (bestIntent.responses.length > 1) {
                const key = `last_${bestIntent.name}_idx`;
                const lastIdx = state[key] !== undefined ? state[key] : -1;
                while (idx === lastIdx) {
                    idx = Math.floor(Math.random() * bestIntent.responses.length);
                }
                state[key] = idx;
            }
            
            responseText = bestIntent.responses[idx];

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
            // 디폴트 멘트 추출 시 연속 중복 방지 장치 가동
            let idx = Math.floor(Math.random() * botResponses.normal.length);
            const lastNormalIdx = state.lastNormalIdx !== undefined ? state.lastNormalIdx : -1;
            while (idx === lastNormalIdx) {
                idx = Math.floor(Math.random() * botResponses.normal.length);
            }
            state.lastNormalIdx = idx;
            responseText = botResponses.normal[idx];
        }

        appendMessage(responseText, 'assistant', () => {
            try {
                if (state.chatbotRiskScore >= 40 && state.optInStatus === null) {
                    setTimeout(() => {
                        openOptInModal();
                    }, 800);
                }
            } catch (err) {
                console.error("모달 제어 실패:", err);
            }
        });
    } catch (e) {
        console.error("챗봇 답변 생성 에러:", e);
        state.isBotThinking = false;
        // 에러 발생 시 최후의 폴백 답변
        appendMessage("이야기를 나누다 보니 네 마음에 대해 더 알고 싶어진다. 편하게 계속 들려줘.", 'assistant');
    }
}

function openOptInModal() {
    try {
        const modal = document.getElementById('optin-modal');
        if (modal) modal.classList.add('open');
    } catch (e) {
        console.error("동의 모달 열기 에러:", e);
    }
}

// 모달 닫기
function closeOptInModal() {
    try {
        const modal = document.getElementById('optin-modal');
        if (modal) modal.classList.remove('open');
    } catch (e) {
        console.error("동의 모달 닫기 에러:", e);
    }
}

// Wee클래스 연계 동의 처리
function handleOptInAccept() {
    try {
        state.optInStatus = 'accepted';
        closeOptInModal();
        
        setTimeout(() => {
            appendMessage("동의해줘서 고마워 지훈아. 실은 내가 기계다 보니 네 마음속 깊은 아픔을 온전히 다 해결해주지 못해 늘 미안했어. 이제 네 고민 기록을 바탕으로 우리 학교 Wee 클래스에 계신 진짜 다정한 상담 선생님께 비밀스럽고 안전하게 요약본을 전달했어. 조만간 선생님이 따뜻한 차 한 잔과 함께 편안하게 손잡고 이야기를 나누어 주실 거야. 그때까지만 조금만 힘내자. 넌 혼자가 아니야.", 'assistant');
        }, 500);

        addStudentToDashboardConnection(false);
    } catch (e) {
        console.error("연계 동의 수락 에러:", e);
    }
}

// 교사 대시보드 테이블에 실시간으로 상담 데이터를 추가해주는 핵심 프론트 연동 로직
function addStudentToDashboardConnection(isAnonymous) {
    try {
        const listContainer = document.getElementById('connection-list');
        if (!listContainer) return;

        const tr = document.createElement('tr');
        const timestamp = new Date().getTime();
        tr.id = `connection-row-${timestamp}`;

        let pseudoName = isAnonymous ? `<span class="tbl-badge safe"><i class="fa-solid fa-user-secret"></i> 가명 학생 (비식별)</span>` : "<strong>김지훈</strong>";
        let pseudoClass = isAnonymous ? "2학년 (학반 비식별)" : "2학년 3반";
        
        let badgeClass = state.detectedRiskLevel.toLowerCase();
        let riskLabel = state.detectedRiskLevel === 'Danger' ? '고위험' : (state.detectedRiskLevel === 'Warning' ? '중위험' : '안전');

        let keywordsMarkup = state.detectedKeywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('');
        if (keywordsMarkup === '') keywordsMarkup = '<span class="keyword-tag safe">감지 없음</span>';

        let actionBtn = isAnonymous 
            ? `<button class="action-btn" style="background:#64748b;" onclick="alert('사전 동의(Opt-in)하지 않은 학생의 개별 데이터는 개인정보보호법에 의해 열람할 수 없습니다.')"><i class="fa-solid fa-lock"></i> 열람 불가</button>`
            : `<div style="display:flex; flex-direction:column; gap:6px;">
                  <button class="action-btn" style="background:var(--primary-color);" onclick="openDetailModal('${timestamp}')"><i class="fa-solid fa-file-invoice"></i> 상세 보고서</button>
                  <button class="action-btn" id="action-btn-${timestamp}" onclick="connectWeeClass('connection-row-${timestamp}', '김지훈')"><i class="fa-solid fa-handshake-angle"></i> Wee클래스 연계</button>
               </div>`;

        let triageSummaryText = isAnonymous 
            ? "비식별 감성 데이터 분석에 의한 수치 누적 (상세 정보 비공개)"
            : `김지훈 학생은 최근 ${state.detectedKeywords.join(', ')} 관련 고민을 나눔. 위기 점수 ${state.chatbotRiskScore}점으로 전문 개입 요망.`;

        tr.innerHTML = `
            <td>${pseudoName}</td>
            <td>${pseudoClass}</td>
            <td><span class="tbl-badge ${badgeClass}">${riskLabel}</span></td>
            <td>${keywordsMarkup}</td>
            <td><div class="triage-summary" title="${triageSummaryText}">${triageSummaryText.substring(0, 30)}...</div></td>
            <td><span class="tbl-badge warning" id="status-badge-connection-row-${timestamp}">상담 대기</span></td>
            <td>${actionBtn}</td>
        `;

        listContainer.insertBefore(tr, listContainer.firstChild);

        // 실시간 연계 대시보드 리포팅
        state.connectedStudents.push(isAnonymous ? '비식별' : '김지훈');
        const countText = document.getElementById('connected-count');
        if (countText) countText.innerText = `${state.connectedStudents.length}건 연계됨`;

        // 교사용 대시보드 알림 배지 카운트 증가
        updateAlertBadge(1);

        // 로컬스토리지에 현재 대화 세션 임시 보관 (상세 보고서 모달 렌더링용)
        if (!isAnonymous) {
            localStorage.setItem(`chat_session_${timestamp}`, JSON.stringify({
                time: new Date().toLocaleDateString(),
                riskScore: state.chatbotRiskScore,
                riskLevel: state.detectedRiskLevel,
                keywords: state.detectedKeywords,
                chatHistory: [...state.chatHistory]
            }));
        }

        // 공공데이터 가중치 실시간 비상 급증 시뮬레이션
        if (state.detectedRiskLevel === 'Danger') {
            const dangerStat = document.getElementById('macro-danger-rate');
            if (dangerStat) {
                dangerStat.innerHTML = `95% <span class="stat-trend trend-up"><i class="fa-solid fa-triangle-exclamation"></i> 2-3 김지훈 위기 급증</span>`;
                const statCard = dangerStat.closest('.stat-card');
                if (statCard) statCard.classList.add('alert-pulse-bg');
            }
        }
    } catch (e) {
        console.error("대시보드 연계 행 추가 에러:", e);
    }
}

function handleOptInDeny() {
    try {
        state.optInStatus = 'denied';
        closeOptInModal();

        setTimeout(() => {
            appendMessage("그래, 아직 진짜 상담 선생님을 대면할 마음의 준비가 되지 않았을 수도 있지. 걱정하지 마. 언제든지 준비가 되었을 때 나비에게 다시 말해줘. 그전까지는 여기서 내가 네 곁을 조용히 지키고 있을게.", 'assistant');
        }, 500);

        addStudentToDashboardConnection(true);
    } catch (e) {
        console.error("연계 동의 거절 에러:", e);
    }
}

// Wee 전문 연계 완료 처리
window.connectWeeClass = function(rowId, studentName) {
    try {
        const row = document.getElementById(rowId);
        if (!row) return;

        const statusBadge = document.getElementById(`status-badge-${rowId}`);
        if (statusBadge) {
            statusBadge.className = 'tbl-badge success';
            statusBadge.innerText = '연계 완료';
        }

        const actionBtn = document.getElementById(`action-btn-${rowId.replace('connection-row-', '')}`);
        if (actionBtn) {
            actionBtn.style.background = '#10b981';
            actionBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> 연계 완료`;
            actionBtn.disabled = true;
        }

        alert(`[마음지키미 선제망] ${studentName} 학생을 우리 학교 Wee 클래스 담당 전문상담교사와 연계 처리 완료했습니다.`);
    } catch (e) {
        console.error("Wee클래스 연계 처리 에러:", e);
    }
};

// 상세 보고서 모달 열기
window.openDetailModal = function(id) {
    try {
        const modal = document.getElementById('detail-modal');
        if (!modal) return;

        let sessionData = null;

        if (id === 'demo') {
            sessionData = {
                time: "2026.06.30",
                riskScore: 85,
                riskLevel: "Danger",
                keywords: ["자퇴", "죽고싶다", "포기"],
                chatHistory: [
                    { sender: 'assistant', text: "반가워. 오늘 하루는 어땠어? 기분이 어떤지 편하게 이야기해보자." },
                    { sender: 'user', text: "요즘 학교생활이 너무 힘들고 자퇴하고 싶어요." },
                    { sender: 'assistant', text: "자퇴하고 싶을 만큼 매일이 버겁고 숨이 막혔다니 내 마음도 참 아프다. 우리 같이 힘을 내보자." },
                    { sender: 'user', text: "공부도 친구관계도 이제 다 포기하고 죽고싶다는 생각만 나요." },
                    { sender: 'assistant', text: "지훈아, 극단적인 생각이 들 정도로 지금 너무나 깊은 고통 속에 있구나. 넌 절대 혼자가 아니야. 우리 Wee 클래스 상담 선생님의 도움을 받아보는 건 어떨까." }
                ]
            };
        } else {
            const localData = localStorage.getItem(`chat_session_${id}`);
            if (localData) {
                sessionData = JSON.parse(localData);
            }
        }

        if (!sessionData) {
            alert("상세 대화 정보를 불러올 수 없습니다.");
            return;
        }

        // 모달 데이터 채우기
        const studentInfo = document.getElementById('detail-student-info');
        const riskBadge = document.getElementById('detail-risk-badge');
        const riskProgress = document.getElementById('detail-risk-progress');
        const riskScore = document.getElementById('detail-risk-score');
        const keywordsList = document.getElementById('detail-keywords-list');
        const prescription = document.getElementById('detail-ai-prescription');
        const chatHistoryTimeline = document.getElementById('detail-chat-history');
        const modalFooter = document.getElementById('detail-modal-footer');

        if (studentInfo) studentInfo.innerText = `${state.studentGradeClass} ${state.studentName}`;
        
        if (riskBadge) {
            riskBadge.className = `tbl-badge ${sessionData.riskLevel.toLowerCase()}`;
            riskBadge.innerText = sessionData.riskLevel === 'Danger' ? '고위험' : (sessionData.riskLevel === 'Warning' ? '중위험' : '안전');
        }

        if (riskProgress) riskProgress.style.width = `${sessionData.riskScore}%`;
        if (riskScore) riskScore.innerText = `${sessionData.riskScore} / 100`;

        if (keywordsList) {
            keywordsList.innerHTML = sessionData.keywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('');
        }

        if (prescription) {
            if (sessionData.riskLevel === 'Danger') {
                prescription.innerText = "학생이 자퇴, 죽고싶다 등 극단적 고위험 키워드를 발화했습니다. 공교육 이탈 및 자해 징후가 심각하므로, Wee 클래스 대면 전문 상담 및 보호자 비상 연락망 가동을 강력히 권고합니다.";
            } else if (sessionData.riskLevel === 'Warning') {
                prescription.innerText = "학생이 성적, 시험, 우울 등의 불안 징후를 다수 발화했습니다. 상시 모니터링이 필요하며 정기 상담 예약을 통한 예방적 개입을 권장합니다.";
            } else {
                prescription.innerText = "안정적인 정서 상태를 유지 중입니다. 지속적인 일상 관리 및 가벼운 소통을 유지하십시오.";
            }
        }

        // 대화 원본 렌더링
        if (chatHistoryTimeline) {
            chatHistoryTimeline.innerHTML = sessionData.chatHistory.map(msg => {
                let senderClass = msg.sender === 'user' ? 'user-msg' : 'bot-msg';
                let senderLabel = msg.sender === 'user' ? '학생(지훈)' : '나비(AI)';
                return `
                    <div class="timeline-chat-bubble ${senderClass}">
                        <span class="sender-tag">${senderLabel}</span>
                        <p class="bubble-text">${msg.text}</p>
                    </div>
                `;
            }).join('');
        }

        // 모달 푸터 버튼 동적 세팅
        if (modalFooter) {
            if (id === 'demo') {
                modalFooter.innerHTML = `
                    <button class="btn btn-secondary" onclick="closeDetailModal()">닫기</button>
                    <button class="btn btn-primary" onclick="connectWeeClass('demo-real-row', '김지훈'); closeDetailModal();"><i class="fa-solid fa-handshake-angle"></i> 즉시 Wee클래스 연계</button>
                `;
            } else {
                modalFooter.innerHTML = `
                    <button class="btn btn-secondary" onclick="closeDetailModal()">닫기</button>
                    <button class="btn btn-primary" onclick="connectWeeClass('connection-row-${id}', '김지훈'); closeDetailModal();"><i class="fa-solid fa-handshake-angle"></i> 즉시 Wee클래스 연계</button>
                `;
            }
        }

        modal.classList.add('open');
    } catch (e) {
        console.error("보고서 모달 열기 에러:", e);
    }
};

window.closeDetailModal = function() {
    try {
        const modal = document.getElementById('detail-modal');
        if (modal) modal.classList.remove('open');
    } catch (e) {
        console.error("보고서 모달 닫기 에러:", e);
    }
};

// ==========================================================================
// 5. 히트맵-그래프 실시간 인터랙션 연동 로직
// ==========================================================================
function toggleHeatmapCellSelect(cell, cellEl) {
    try {
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
    } catch (e) {
        console.error("히트맵 셀 선택 처리 에러:", e);
    }
}

function restoreDefaultChart() {
    try {
        if (window.riskChart) {
            const chartCanvas = document.getElementById('riskTrendChart');
            if (!chartCanvas) return;
            const ctx = chartCanvas.getContext('2d');
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
    } catch (e) {
        console.error("기본 차트 복원 중 에러:", e);
    }
}
