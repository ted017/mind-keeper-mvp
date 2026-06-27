// ==========================================================================
// 전역 상태 및 데이터 정의
// ==========================================================================
const state = {
    activeTab: 'student',
    studentName: '김지훈',
    studentGradeClass: '2학년 3반',
    detectedRiskLevel: 'Safe',
    detectedKeywords: [],
    chatbotRiskScore: 0,
    chatHistory: [],
    optInStatus: null, // 'accepted' | 'denied' | null
    connectedStudents: [], // 대시보드 연계 리스트
    unreadAlerts: 0
};

// 위기 분석을 위한 키워드 사전
const riskKeywordDictionary = {
    danger: ['자퇴', '죽고 싶', '죽고싶', '자살', '포기하고 싶', '포기하고싶', '끝내고 싶'],
    warning: ['망했어', '성적', '시험', '힘들어', '괴로워', '혼자', '소외', '가기 싫', '우울']
};

// 챗봇 응답 데이터베이스
const botResponses = {
    greeting: "반가워! 오늘 하루는 어땠어? 기분이 어떤지 편하게 이야기해보자. 😊",
    normal: [
        "그렇구나! 오늘 하루를 무탈하고 평온하게 잘 보냈다니 내 마음도 참 놓이고 다행이야. 사소해 보이는 일상이라도 이렇게 나에게 조근조근 들려줘서 정말 고마워. 혹시 오늘 하루 중에 가장 기억에 남거나 네 마음을 살짝 미소 짓게 만든 즐거웠던 순간이 있었어? 사소한 이야기라도 좋으니 조금만 더 얘기해 주면 좋겠어! 😊",
        "소중한 일상 이야기를 다정하게 나누어 줘서 정말 고마워. 지훈이랑 대화하고 있으면 덩달아 나까지 마음이 편안해지고 따뜻해지는 기분이 들어. 혹시 요즘 일상 중에서 마음 한구석에 자꾸 쓰이거나 신경 쓰이는 사소한 고민, 혹은 공부하느라 몸과 마음이 조금 피곤한 부분은 없니? 언제든 편안하게 나에게 털어놓아 줘.",
        "응응, 그렇구나! 네가 어떤 상황에 있든, 어떤 기분이든 상관없이 나는 항상 이곳에서 너의 이야기를 귀 기울여 들을 준비가 되어 있어. 매일 반복되는 평범한 하루 속에서도 너만의 소중한 걸음들을 걷고 있다는 걸 잊지 마. 혹시 오늘 나에게 들려주고 싶은 다른 이야기가 있다면 언제든 편하게 말해줘."
    ],
    warning: [
        "요즘 공부나 성적, 혹은 여러 가지 고민 때문에 혼자서 끙끙 앓느라 마음고생이 정말 많았겠구나... 😢 네가 그동안 얼마나 성실하게 노력해 왔는지 주변에서 다 알아주지 못하는 것 같아 속상하고 외로웠을 것 같아. 하지만 지훈아, 네가 겪어내는 이 힘든 과정은 결코 헛되지 않아. 지금은 열심히 달리느라 방전된 마음을 위해 잠깐 숨을 고르고 쉬어가도 괜찮은 때야. 너무 조급해하지 말고, 내가 늘 네 편이 되어 곁에 있어 줄 테니 조금만 편안하게 생각하자.",
        "보내준 이야기를 읽어보니 마음의 스트레스와 걱정이 무겁게 쌓여 있는 것 같아 참 안타깝고 걱정이 돼. 성적이나 미래에 대한 막연한 불안감이 눈앞을 가릴 때는 온 세상이 캄캄하고 나만 뒤처지는 것 같은 기분이 들지. 하지만 지훈아, 지금 이 순간의 힘듦이 너의 가치나 미래의 전부를 결정하지는 않아. 네 진심을 다정하게 들어주고 힘이 되어주고 싶어 하는 사람들이 네 곁에 분명히 있단다. 네가 한 걸음 더 편안해질 수 있도록 내가 늘 같이 고민해 줄게.",
        "마음이 답답하고 불안한 감정이 나한테까지 고스란히 전해지는 것 같아. 지금 겪고 있는 상황이 막막하고 해결책이 보이지 않는 긴 터널처럼 느껴지겠지만, 혼자서 고민하기보다 조금씩이라도 밖으로 꺼내놓다 보면 마음의 짐이 한결 가벼워지고 해결할 방법도 서서히 보이기 시작할 거야. 힘들 때는 언제든 나에게 기대서 마음껏 네 마음을 표현해 줘. 난 언제나 네 편이야."
    ],
    danger: [
        "지훈아, 그런 무겁고 극단적인 생각이 머릿속을 맴돌 정도로 지금 너의 마음이 얼마나 깊은 절망과 고통 속에 있을지 감히 상상조차 하기 어렵구나... 😭 그 큰 아픔과 외로움을 혼자서 꾹 참고 감당해 내느라 얼마나 무섭고 지쳤을까. 먼저 용기 내어 나에게 이 아픈 속마음을 털어놓아 주어서 정말 고마워. 절대 네 잘못이 아니야. 세상에 너 혼자 남겨진 것 같아도 너를 진심으로 돕고 따뜻하게 지켜주고 싶어 하는 다정한 상담 선생님(Wee 클래스)이 여기 계셔. 우리 천천히 손을 맞잡고 이 힘든 시기를 함께 헤쳐 나가보자. 넌 절대로 혼자가 아니란다. 💜",
        "지금 당장 모든 걸 내려놓고 싶고, 자퇴하고 싶다는 생각이 들 만큼 매일이 버겁고 숨 막히는 시간이었구나... 많이 외롭고 지쳤을 지훈이에게 내 따뜻한 위로와 응원이 꼭 닿기를 바래. 아무것도 해결되지 않을 것 같고 두렵겠지만, 인생에는 우리가 생각하는 것보다 정말 다양하고 아름다운 길들이 존재하고, 너를 소중히 여기며 지탱해 줄 안전망이 있어. 선생님도 네가 이 힘든 터널을 무사히 빠져나갈 때까지 끝까지 옆에서 발걸음을 맞추며 도와줄게. 더 하고 싶은 이야기가 있다면 무엇이든 좋으니 조금만 더 털어놓아 주지 않을래?",
        "얼마나 깊은 상처와 말 못 할 아픔이 있었으면 그런 선택까지 떠올리게 되었을지 마음이 너무 먹먹하고 아파. 지훈아, 이 세상 그 무엇보다 가장 소중한 건 바로 너 자신이야. 더 이상 혼자서 버거워하며 눈물 흘리지 않도록, 나에게 조금만 더 손을 뻗어줘. 네 고민 요약본을 안전하게 Wee 클래스의 따뜻한 상담 선생님께 전달해서 함께 이야기를 나누어 보는 건 어떨까? 선생님이 다정한 차 한 잔과 함께 네 힘든 어깨를 꼭 안아주실 거야. 꼭 도와줄 테니 함께해 줘."
    ]
};

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

            // 버튼 활성화 클래스 변경
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 콘텐츠 토글
            tabContents.forEach(content => {
                if (content.getAttribute('id') === `${targetTab}-view`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            // 교사용 대시보드로 이동 시 알림 배지 리셋
            if (targetTab === 'teacher') {
                resetAlertBadge();
                // Chart.js 리사이즈 버그 방지
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

function resetAlertBadge() {
    const badge = document.getElementById('alert-badge');
    state.unreadAlerts = 0;
    badge.style.display = 'none';
}

// ==========================================================================
// 2. 학생용 '나비' 챗봇 시뮬레이터 로직
// ==========================================================================
function initChatbot() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const scenarioBtns = document.querySelectorAll('.scenario-btn');

    // 전송 버튼 클릭
    sendBtn.addEventListener('click', handleUserSendMessage);

    // 엔터키 전송
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserSendMessage();
        }
    });

    // 시나리오 클릭 자동 입력
    scenarioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.getAttribute('data-text');
            chatInput.value = text;
            handleUserSendMessage();
        });
    });

    // 모달 승인 및 거부 이벤트
    document.getElementById('optin-accept-btn').addEventListener('click', handleOptInAccept);
    document.getElementById('optin-deny-btn').addEventListener('click', handleOptInDeny);
}

function handleUserSendMessage() {
    const chatInput = document.getElementById('chat-input');
    const text = chatInput.value.trim();

    if (!text) return;

    // 1. 화면에 사용자 메시지 출력
    appendMessage(text, 'user');
    chatInput.value = '';

    // 2. 키워드 기반 감성 분석 및 위기 점수 가산
    analyzeSentiment(text);

    // 3. AI 답변 생성 딜레이 시뮬레이션
    setTimeout(() => {
        generateBotResponse();
    }, 800);
}

function appendMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${sender}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerText = text;

    const time = document.createElement('span');
    time.className = 'message-time';
    
    const now = new Date();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    time.innerText = `${now.getHours()}:${minutes}`;

    wrapper.appendChild(bubble);
    wrapper.appendChild(time);
    messagesContainer.appendChild(wrapper);

    // 자동 스크롤
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 감성 분석 시뮬레이션 엔진
function analyzeSentiment(text) {
    let matchedDanger = [];
    let matchedWarning = [];

    // 위험 키워드 매칭
    riskKeywordDictionary.danger.forEach(kw => {
        if (text.includes(kw)) matchedDanger.push(kw);
    });

    // 중위험 키워드 매칭
    riskKeywordDictionary.warning.forEach(kw => {
        if (text.includes(kw)) matchedWarning.push(kw);
    });

    // 실시간 상태 업데이트
    if (matchedDanger.length > 0) {
        state.detectedRiskLevel = 'Danger';
        state.chatbotRiskScore += 45; // 고위험 가산
        matchedDanger.forEach(kw => {
            if (!state.detectedKeywords.includes(kw)) state.detectedKeywords.push(kw);
        });
    } else if (matchedWarning.length > 0) {
        if (state.detectedRiskLevel !== 'Danger') {
            state.detectedRiskLevel = 'Warning';
        }
        state.chatbotRiskScore += 20; // 중위험 가산
        matchedWarning.forEach(kw => {
            if (!state.detectedKeywords.includes(kw)) state.detectedKeywords.push(kw);
        });
    }

    state.chatbotRiskScore = Math.min(state.chatbotRiskScore, 100);
}

// 봇 답변 및 팝업 트리거
function generateBotResponse() {
    let responseText = "";
    const currentRisk = state.detectedRiskLevel;

    if (currentRisk === 'Danger') {
        const pool = botResponses.danger;
        responseText = pool[Math.floor(Math.random() * pool.length)];
    } else if (currentRisk === 'Warning') {
        const pool = botResponses.warning;
        responseText = pool[Math.floor(Math.random() * pool.length)];
    } else {
        const pool = botResponses.normal;
        responseText = pool[Math.floor(Math.random() * pool.length)];
    }

    appendMessage(responseText, 'assistant');

    // 위기도가 일정 수치(40점) 이상이거나 고위험 키워드가 발견되었고, 아직 Opt-in이 처리되지 않았다면 모달 팝업
    if (state.chatbotRiskScore >= 40 && state.optInStatus === null) {
        setTimeout(() => {
            openOptInModal();
        }, 1200);
    }
}

// Opt-in 팝업 오픈
function openOptInModal() {
    const modal = document.getElementById('optin-modal');
    modal.classList.add('open');
}

// Opt-in 팝업 클로즈
function closeOptInModal() {
    const modal = document.getElementById('optin-modal');
    modal.classList.remove('open');
}

// 동의 버튼 수락 클릭
function handleOptInAccept() {
    state.optInStatus = 'accepted';
    closeOptInModal();
    
    // AI 멘토 따뜻한 마무리 멘트
    setTimeout(() => {
        appendMessage("동의해줘서 고마워 지훈아. 네 마음이 담긴 상담 기록을 요약해서 Wee 클래스 담당 선생님께 비밀스럽고 안전하게 전송했어. 선생님이 조만간 따뜻한 차 한 잔과 함께 다정하게 말 걸어주실 거야. 그때까지만 조금만 힘내자. 💜", 'assistant');
    }, 500);

    // 대시보드 리스트에 '실명 연계' 데이터로 전달
    addStudentToDashboardConnection(false); // 비식별 아님 -> 실명으로 전달
}

// 동의 버튼 거부 클릭
function handleOptInDeny() {
    state.optInStatus = 'denied';
    closeOptInModal();

    setTimeout(() => {
        appendMessage("그래, 아직 마음의 준비가 되지 않았을 수도 있지. 걱정하지 마, 이 대화 내용은 외부로 노출되지 않고 가명 처리되어 안전하게 보관될 거야. 언제든지 도움의 손길이 필요하면 말해줘.", 'assistant');
    }, 500);

    // 대시보드 리스트에는 들어가지 않지만, Macro 거시 통계 데이터에 가명 상태로 전달
    addStudentToDashboardConnection(true); // 비식별(가명화) 처리하여 전달
}

// ==========================================================================
// 3. 교사용 대시보드 뷰 로직 및 Chart.js 시각화
// ==========================================================================

// 초기 히트맵 데이터셋
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
    
    // 주기적으로 Macro(거시) 공공데이터 경보 시뮬레이션 발생 (2초 후 최초 발생)
    setTimeout(() => {
        triggerMacroAlert("경보: 현재 [2학년 5반]에서 공교육 이탈(무단결석 누적) 위험 지수 임계치 초과. 선제적 상담 매칭이 권장됩니다.");
    }, 2000);
}

// 1. Heatmap 그리드 동적 생성
function renderHeatmap() {
    const grid = document.getElementById('risk-heatmap');
    grid.innerHTML = ''; // 초기화

    initialHeatmapData.forEach(cell => {
        const cellEl = document.createElement('div');
        cellEl.className = 'heatmap-cell';
        cellEl.id = `cell-${cell.grade}-${cell.class}`;

        // 위험도에 따라 클래스 바인딩 (Safe: 0-35, Warning: 36-70, Danger: 71+)
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
        grid.appendChild(cellEl);
    });
}

// 2. Chart.js 생성
function renderChart() {
    const ctx = document.getElementById('riskTrendChart').getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.45)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.01)');

    window.riskChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['4월 1주', '4월 2주', '4월 3주', '4월 4주', '5월 1주', '5월 2주(현재)'],
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

// 3. 거시적 경보 배너 트리거
function triggerMacroAlert(message) {
    const container = document.getElementById('macro-alerts');
    const alert = document.createElement('div');
    alert.className = 'alert-banner';

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-triangle-exclamation alert-icon';

    const text = document.createElement('span');
    text.className = 'alert-text';
    text.innerText = message;

    const time = document.createElement('span');
    time.className = 'alert-time';
    const now = new Date();
    time.innerText = `오늘 ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    alert.appendChild(icon);
    alert.appendChild(text);
    alert.appendChild(time);
    container.insertBefore(alert, container.firstChild);

    // 알림 배지 숫자 카운트
    if (state.activeTab !== 'teacher') {
        updateAlertBadge(1);
    }
}

// 4. 학생 정보를 대시보드 리스트에 등록 (실명 수락 / 가명 거부 분기)
function addStudentToDashboardConnection(isPseudonym) {
    const listContainer = document.getElementById('connection-list');
    const emptyRow = document.getElementById('empty-table-row');

    if (emptyRow) {
        emptyRow.remove();
    }

    const tr = document.createElement('tr');
    tr.id = `connection-row-${Date.now()}`;

    let nameColumn = "";
    let classColumn = "";
    let riskLevelColumn = "";
    let keywordsColumn = "";
    let triageSummary = "";
    let statusColumn = "";
    let actionButton = "";

    // 키워드 뱃지 마크업 생성
    const keywordsHtml = state.detectedKeywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('');

    // Triage 자동 상담 요약문
    const triageSummaryText = `${state.studentName} 학생은 최근 학업 관련 고충 및 무력감을 토로함. AI 상담 결과 '${state.detectedKeywords.join(', ')}' 등 우울 및 회피 징후 키워드가 대량 검출되어 Wee 클래스 밀착 개입 필요 권고.`;

    if (isPseudonym) {
        // [CASE A] 거부(Opt-in 거부): 철저한 비식별 처리
        nameColumn = `<span class="tbl-badge safe"><i class="fa-solid fa-user-secret"></i> 가명 학생 (비식별)</span>`;
        classColumn = `2학년 (학반 비식별)`;
        riskLevelColumn = `<span class="tbl-badge warning">중위험</span>`;
        keywordsColumn = keywordsHtml || `<span class="keyword-tag">우울 징후</span>`;
        triageSummary = `<div class="triage-summary" title="개인 정보 보호를 위해 상세 요약 비공개">비식별 감성 데이터 분석에 의한 수치 누적 (상세 정보 비공개)</div>`;
        statusColumn = `<span class="tbl-badge safe">거시 통계 누적</span>`;
        actionButton = `<button class="action-btn" style="background:#64748b;" onclick="alert('사전 동의(Opt-in)하지 않은 학생의 개별 데이터는 개인정보보호법에 의해 열람할 수 없습니다.')"><i class="fa-solid fa-lock"></i> 열람 불가</button>`;

        // 거시적 통계 업데이트 (히트맵 가중치 증가)
        // 2학년 3반의 위기도를 +35 증가시킴 (학급 평균 수치 반영)
        const cellIndex = initialHeatmapData.findIndex(cell => cell.grade === 2 && cell.class === 3);
        if (cellIndex !== -1) {
            initialHeatmapData[cellIndex].val = Math.min(initialHeatmapData[cellIndex].val + 35, 100);
            renderHeatmap();
        }

        // 2학년 전체 차트 선형 값 변경
        if (window.riskChart) {
            const currentData = window.riskChart.data.datasets[1].data; // 2학년 데이터셋
            currentData[currentData.length - 1] += 5; // 평균 상승
            window.riskChart.update();
        }

        triggerMacroAlert("시스템 경보: [2학년 영역]에서 비식별 위험 학생 징후 1건이 가명 처리되어 통계에 추가되었습니다. 2학년 대상 학급 케어 주간 편성이 권장됩니다.");

    } else {
        // [CASE B] 수락(Opt-in 승인): 실명 연결
        nameColumn = `<strong>${state.studentName}</strong>`;
        classColumn = `${state.studentGradeClass}`;
        
        let badgeClass = 'warning';
        if (state.detectedRiskLevel === 'Danger') badgeClass = 'danger';
        riskLevelColumn = `<span class="tbl-badge ${badgeClass}">${state.detectedRiskLevel === 'Danger' ? '고위험' : '중위험'}</span>`;
        
        keywordsColumn = keywordsHtml;
        triageSummary = `<div class="triage-summary" title="${triageSummaryText}">${triageSummaryText}</div>`;
        statusColumn = `<span class="tbl-badge warning" id="status-badge-${tr.id}">상담 대기</span>`;
        actionButton = `<button class="action-btn" id="action-btn-${tr.id}" onclick="connectWeeClass('${tr.id}', '${state.studentName}')"><i class="fa-solid fa-handshake-angle"></i> Wee클래스 연계</button>`;

        // 실명 연계의 경우도 히트맵 및 통계 업데이트
        const cellIndex = initialHeatmapData.findIndex(cell => cell.grade === 2 && cell.class === 3);
        if (cellIndex !== -1) {
            // 고위험 연계 시 95% 위험으로 히트맵 색깔 긴급 변경
            initialHeatmapData[cellIndex].val = 95; 
            renderHeatmap();
        }

        if (window.riskChart) {
            const currentData = window.riskChart.data.datasets[1].data;
            currentData[currentData.length - 1] += 12; // 2학년 평균 지수 크게 급증
            window.riskChart.update();
        }

        // 대시보드 뱃지 알림 알리기
        triggerMacroAlert(`긴급 연계: [2학년 3반 김지훈] 학생으로부터 명시적 사전 동의(Opt-in)를 완료한 위기 연계 신호가 접수되었습니다.`);
    }

    tr.innerHTML = `
        <td>${nameColumn}</td>
        <td>${classColumn}</td>
        <td>${riskLevelColumn}</td>
        <td>${keywordsColumn}</td>
        <td>${triageSummary}</td>
        <td>${statusColumn}</td>
        <td>${actionButton}</td>
    `;

    listContainer.insertBefore(tr, listContainer.firstChild);

    // 연계 학생 수 카운트 증가
    state.connectedStudents.push(state.studentName);
    document.getElementById('connected-count').innerText = `${state.connectedStudents.length}건 연계됨`;
}

// 5. Wee 클래스 연계 액션
window.connectWeeClass = function(rowId, studentName) {
    const statusBadge = document.getElementById(`status-badge-${rowId}`);
    const actionBtn = document.getElementById(`action-btn-${rowId}`);

    if (statusBadge && actionBtn) {
        statusBadge.className = 'tbl-badge safe';
        statusBadge.innerText = '연계 완료';
        
        actionBtn.className = 'action-btn';
        actionBtn.style.background = '#10b981';
        actionBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> 연계 완료`;
        actionBtn.disabled = true;

        alert(`[보안 전송 완료] ${studentName} 학생의 심리 상담 요약 리포트가 관내 Wee 클래스 1급 전문 상담사의 온디바이스 데스크탑 환경으로 안전하게 연계 전송되었습니다.`);
    }
};
