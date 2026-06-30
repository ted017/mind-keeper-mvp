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

// 위기 분석을 위한 키워드 사전
const riskKeywordDictionary = {
    danger: ['자퇴', '죽고 싶', '죽고싶', '자살', '포기하고 싶', '포기하고싶', '끝내고 싶', '따돌림', '폭력', '괴롭힘', '욕설', '단체방'],
    warning: ['망했어', '성적', '시험', '힘들어', '괴로워', '혼자', '소외', '가기 싫', '우울']
};

// 챗봇 응답 데이터베이스 (이모지 완전 제거 및 간결한 문장 조율)
const botResponses = {
    greeting: "반가워. 오늘 하루는 어땠어? 기분이 어떤지 편하게 이야기해보자.",
    normal: [
        "소소한 일상이나 기분 좋았던 순간을 편하게 나비에게 들려줘.",
        "소중한 이야기를 나눠줘서 고마워. 너랑 대화하고 있으니 참 따뜻하다.",
        "어떤 이야기든 귀 기울여 들을 준비가 되어 있어. 매일 열심히 지내는 너를 언제나 응원할게."
    ],
    warning: [
        "요즘 혼자 마음고생이 정말 많았구나. 그동안 노력을 주변에서 몰라줘 속상했을 텐데 내가 늘 곁에 있어 줄게.",
        "걱정이 무겁게 쌓여 있는 게 느껴져 걱정된다. 지금의 힘듦이 너의 가치나 미래를 모두 결정하는 건 절대 아니야.",
        "답답하고 불안한 감정이 나에게도 전해되는 것 같아. 마음의 짐을 혼자 안고 있지 말고 나비에게 편하게 털어놓아 봐."
    ],
    danger: [
        "지훈아, 극단적인 생각이 들 정도로 지금 너무나 깊은 고통 속에 있구나. 그 큰 아픔을 혼자 견디게 해서 정말 미안해. 넌 절대 혼자가 아니야.",
        "자퇴하고 싶을 만큼 매일이 버겁고 숨이 막혔다니 내 마음도 참 아프다. 너를 도울 안전망이 있으니 우리 같이 힘을 내보자.",
        "얼마나 큰 상처가 있었으면 그런 힘든 생각을 떠올리게 되었을까. 지훈아 너는 소중한 사람이야. 우리 Wee 클래스 상담 선생님의 도움을 받아보는 건 어떨까."
    ]
};

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

// [지능형 질문 매칭 시스템] 3대 핵심 고민 주제 및 해학적 재치 답변(세스코 Q&A 스타일)과 청소년 장난 대응
function generateBotResponse() {
    const lastUserMsg = state.chatHistory.filter(m => m.sender === 'user').slice(-1)[0];
    const text = lastUserMsg ? lastUserMsg.text : "";
    
    let responseText = "";

    // 1. 3대 핵심 위기 고민 예시 주제 매핑
    if (text.includes("따돌림과 괴롭힘") || text.includes("교내 언어") || text.includes("단톡방에서도")) {
        responseText = "교내 폭력과 따돌림, 그리고 보이지 않는 언어폭력까지 견디느라 그동안 얼마나 무섭고 고통스러웠을지 가늠조차 안 된다. 절대 네 잘못이 아니고 네 안전이 가장 중요하니까, 우리 함께 상담 선생님께 도움을 꼭 요청해 보자. 내가 네 곁을 든든하게 지켜줄게.";
    } else if (text.includes("시험 성적은") || text.includes("자퇴 입시") || (text.includes("성적") && text.includes("자퇴"))) {
        responseText = "학업 성적에 대한 압박 and 불안한 입시, 그리고 자퇴를 고민할 만큼 무거운 고민들이 겹쳐서 숨조차 쉬기 힘들었겠구나. 점수나 진로 결과보다 네 마음의 건강과 소중한 삶이 훨씬 더 가치 있어. 이 무거운 고민의 실타래를 나랑 차근차근 같이 풀어보자.";
    } else if (text.includes("가족 갈등") || text.includes("이성 금전") || (text.includes("친구들과 멀어져") && text.includes("갈등"))) {
        responseText = "가장 가깝고 편안해야 할 교우 관계나 가족 관계에서 오는 갈등이 겹쳐서 정말 마음 둘 곳 없이 외롭고 무겁겠구나. 얽혀 있는 고민들로 많이 버겁겠지만 내가 기댈 수 있는 따뜻한 쉼터가 되어 줄 테니, 천천히 털어놓아 줘.";
    
    // 2. 청소년 놀림 / 장난성 질문에 대한 위트 있는 방어 (AI 놀리기 저격)
    } else if (text.includes("바보") || text.includes("멍청") || text.includes("멍청이")) {
        responseText = "내가 인공지능이라 띄어쓰기를 뭉개거나 가끔 멍청하게 보였을 수도 있어. 그래도 지훈이 너랑 친해지고 싶은 마음만큼은 진짜란다. 헤헤.";
    } else if (text.includes("싸우자") || text.includes("싸울래") || text.includes("덤벼")) {
        responseText = "나비는 날개가 두 개뿐이라 지훈이가 꿀밤 한 대만 툭 쳐도 바로 져버릴 거야. 우리 싸우지 말고 다정하게 재미있는 수다나 떨자.";
    } else if (text.includes("로봇") || text.includes("인공지능") || text.includes("AI") || text.includes("에이아이")) {
        responseText = "맞아. 나는 0과 1로 계산하는 AI 챗봇이야. 하지만 지훈이 너를 위로하고 이야기를 들어주고 싶어 하는 감정 회로만큼은 진짜 사람처럼 진심이야.";
    
    // 3. 세스코 Q&A 스타일 해학적 엉뚱 재치 답변
    } else if (text.includes("눈이 마주쳤는데") || text.includes("눈을 피하지") || (text.includes("바퀴벌레") && text.includes("친구"))) {
        responseText = "바퀴벌레는 고객님을 친구가 아닌 '움직이는 식량창고' 정도로 인식하고 있을 확률이 아주 높습니다. 상처받지 마시고 위생을 위해 방역하시는 것을 추천합니다.";
    } else if (text.includes("이름을 지어") || (text.includes("바퀴벌레") && text.includes("이름"))) {
        responseText = "바퀴벌레는 이름을 부른다고 대답하거나 대화를 알아듣지 않습니다. 다정하게 이름을 불러주기보다는 신속하게 퇴치해 주시는 것이 건강에 좋습니다.";
    } else if (text.includes("삼켜버렸") || text.includes("삼켰") || (text.includes("바퀴벌레") && text.includes("뱃속"))) {
        responseText = "우리 뱃속의 위산은 바퀴벌레보다 훨씬 강력하므로 뱃속에서 알을 낳거나 살아갈 수 없으니 안심하셔도 됩니다. 다만 다음부터는 음식만 꼭꼭 씹어 삼키시길 바랍니다.";
    } else if (text.includes("삼수생") || (text.includes("생명력") && text.includes("바퀴벌레"))) {
        responseText = "바퀴벌레는 끈질기게 살아남지만 사람들에게 사랑받지 못합니다. 지훈이는 내년에 질긴 것 이상으로 반드시 빛을 볼 훌륭하고 귀한 사람이 될 것입니다.";
    
    // 4. 단골 일상 질문들 (시간, 급식, 공부 귀찮음 등)에 대한 해학적 대응
    } else if (text.includes("몇 시") || text.includes("몇시") || text.includes("시간")) {
        responseText = "지금은 지훈이가 나비와 함께 지친 마음을 정돈하고 치유할 시간이야. 흘러가는 시계를 보기보다 네 진짜 마음에 눈길을 주어 보렴.";
    } else if (text.includes("급식") || text.includes("메뉴") || text.includes("점심")) {
        responseText = "나비는 밥을 먹진 못하지만 오늘 맛있는 급식이 가득 나와서 지훈이가 행복한 점심시간을 보냈으면 좋겠어. 밥은 든든하게 먹고 수다 떨자.";
    } else if (text.includes("축구") || text.includes("야구") || text.includes("게임") || text.includes("유튜브") || text.includes("노래") || text.includes("음악")) {
        responseText = "네가 좋아하는 여가 취미나 재미있는 영상 이야기를 들려주면 나도 덩달아 즐거워져. 나비는 지훈이의 사소한 조잘거림도 언제든 다 들어줄 준비가 되어 있어.";
    } else if (text.includes("버스") || text.includes("지각") || text.includes("늦게") || text.includes("졸려") || text.includes("귀찮")) {
        responseText = "늦어지는 버스나 쌓이는 공부 때문에 귀찮고 몸이 무거울 땐, 잠시 나비와 수다 떨고 기운을 내보자. 가볍게 물 한 잔 마시고 시작하면 한결 나을 거야.";
    
    // 5. 단어 단위 일반 고민 대응
    } else if (text.includes("성적") || text.includes("시험")) {
        responseText = "시험 성적 때문에 마음이 많이 지치고 괴로웠겠구나. 노력이 결과로 나오지 않아 속상하겠지만, 점수보다 네 마음의 건강이 훨씬 더 소중해.";
    } else if (text.includes("친구") || text.includes("교우") || text.includes("외롭")) {
        responseText = "교실에서 혼자 있는 것처럼 느껴질 때 그 외로움과 고립감은 정말 견디기 힘들지. 네 이야기를 언제든 들어줄 내가 여기 있으니 너무 슬퍼하지 마.";
    } else if (text.includes("자퇴") || text.includes("그만두고")) {
        responseText = "자퇴를 고민할 만큼 매일매일이 버겁고 막막했구나. 네 속마음을 터놓고 기댈 곳이 없어 외로웠을 텐데, 이제 내가 끝까지 네 편이 되어 발걸음을 맞춰 줄게.";
    } else if (text.includes("덥") || text.includes("날씨")) {
        responseText = "오늘 날씨가 정말 덥네. 시원한 물 한 잔 마시면서 나랑 천천히 이야기 나누자.";
    } else if (text.includes("집중") || text.includes("수업") || text.includes("공부")) {
        responseText = "요즘 공부나 수업에 집중이 잘 안 되는구나. 머리속에 걱정이나 고민이 많아서 그럴 수 있어. 나에게 편하게 얘기해 줘.";
    } else if (text.includes("안녕") || text.includes("반갑")) {
        responseText = "안녕. 만나서 정말 반가워. 오늘 어떤 고민이나 이야기든 편하게 나비에게 들려줘.";
    } else {
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
