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
        "오늘 하루를 무탈하게 보냈다니 다행이야. 소소한 일상이나 기분 좋았던 순간을 편하게 들려줘.",
        "소중한 이야기를 나눠줘서 고마워. 너랑 대화하고 있으니 참 따뜻하다. 요즘 마음 쓰이는 일은 없었어?",
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

function analyzeSentiment(text) {
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
        state.chatbotRiskScore = Math.min(state.chatbotRiskScore + 45, 100);
        matchedDanger.forEach(kw => {
            if (!state.detectedKeywords.includes(kw)) state.detectedKeywords.push(kw);
        });
    } else if (matchedWarning.length > 0) {
        if (state.detectedRiskLevel !== 'Danger') {
            state.detectedRiskLevel = 'Warning';
        }
        state.chatbotRiskScore = Math.min(state.chatbotRiskScore + 20, 100);
        matchedWarning.forEach(kw => {
            if (!state.detectedKeywords.includes(kw)) state.detectedKeywords.push(kw);
        });
    }
}

// [지능형 질문 매칭 시스템] 이모지 전면 배제 및 찰떡 답변 구성
function generateBotResponse() {
    const lastUserMsg = state.chatHistory.filter(m => m.sender === 'user').slice(-1)[0];
    const text = lastUserMsg ? lastUserMsg.text : "";
    
    let responseText = "";

    if (text.includes("덥") || text.includes("날씨")) {
        responseText = "오늘 날씨가 정말 덥네. 시원한 물 한 잔 마시면서 나랑 천천히 이야기 나누자.";
    } else if (text.includes("집중") || text.includes("수업") || text.includes("공부")) {
        responseText = "요즘 공부나 수업에 집중이 잘 안 되는구나. 머리속에 걱정이나 고민이 많아서 그럴 수 있어. 나비에게 편하게 얘기해 줘.";
    } else if (text.includes("안녕") || text.includes("반갑")) {
        responseText = "안녕. 만나서 정말 반가워. 오늘 어떤 고민이나 이야기든 편하게 나비에게 들려줘.";
    } else if (text.includes("친구") || text.includes("교우") || text.includes("혼자") || text.includes("소외") || text.includes("외롭")) {
        responseText = "친구 관계 때문에 고민이 많고 외로운 시간을 보냈구나. 그 속상한 감정을 나비가 들으며 같이 위로해 줄게.";
    } else if (state.detectedRiskLevel === 'Danger') {
        const pool = botResponses.danger;
        responseText = pool[Math.floor(Math.random() * pool.length)];
    } else if (state.detectedRiskLevel === 'Warning') {
        const pool = botResponses.warning;
        responseText = pool[Math.floor(Math.random() * pool.length)];
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

function handleOptInAccept() {
    state.optInStatus = 'accepted';
    closeOptInModal();
    
    setTimeout(() => {
        appendMessage("동의해줘서 고마워 지훈아. 네 마음이 담긴 상담 기록을 요약해서 Wee 클래스 담당 선생님께 비밀스럽고 안전하게 전송했어. 선생님이 조만간 따뜻한 차 한 잔과 함께 다정하게 말 걸어주실 거야. 그때까지만 조금만 힘내자.", 'assistant');
    }, 500);

    addStudentToDashboardConnection(false);
}

function handleOptInDeny() {
    state.optInStatus = 'denied';
    closeOptInModal();

    setTimeout(() => {
        appendMessage("그래, 아직 마음의 준비가 되지 않았을 수도 있지. 걱정하지 마, 이 대화 내용은 외부로 노출되지 않고 가명 처리되어 안전하게 보관될 거야. 언제든지 도움의 손길이 필요하면 말해줘.", 'assistant');
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

    if (state.activeTab !== 'teacher') {
        updateAlertBadge(1);
    }
}

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

    const keywordsHtml = state.detectedKeywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('');
    const triageSummaryText = `${state.studentName} 학생은 최근 학업 관련 고충 및 무력감을 토로함. AI 상담 결과 '${state.detectedKeywords.join(', ')}' 등 우울 및 회피 징후 키워드가 대량 검출되어 Wee 클래스 밀착 개입 필요 권고.`;

    if (isPseudonym) {
        nameColumn = `<span class="tbl-badge safe"><i class="fa-solid fa-user-secret"></i> 가명 학생 (비식별)</span>`;
        classColumn = `2학년 (학반 비식별)`;
        riskLevelColumn = `<span class="tbl-badge warning">중위험</span>`;
        keywordsColumn = keywordsHtml || `<span class="keyword-tag">우울 징후</span>`;
        triageSummary = `<div class="triage-summary" title="개인 정보 보호를 위해 상세 요약 비공개">비식별 감성 데이터 분석에 의한 수치 누적 (상세 정보 비공개)</div>`;
        statusColumn = `<span class="tbl-badge safe">거시 통계 누적</span>`;
        actionButton = `<button class="action-btn" style="background:#64748b;" onclick="alert('사전 동의(Opt-in)하지 않은 학생의 개별 데이터는 개인정보보호법에 의해 열람할 수 없습니다.')"><i class="fa-solid fa-lock"></i> 열람 불가</button>`;

        document.getElementById('macro-drop-rate').innerText = "2학년 평균 자퇴 위험도 15% 증가";
        document.getElementById('macro-safety-index').innerText = "비식별 우울 징후 감지 건수 누적";

        const cellIndex = initialHeatmapData.findIndex(cell => cell.grade === 2 && cell.class === 3);
        if (cellIndex !== -1) {
            initialHeatmapData[cellIndex].val = Math.min(initialHeatmapData[cellIndex].val + 35, 100);
            renderHeatmap();
        }

        if (window.riskChart) {
            const currentData = window.riskChart.data.datasets[1].data;
            currentData[currentData.length - 1] += 5;
            window.riskChart.update();
        }

        triggerMacroAlert("시스템 경보: [2학년 영역]에서 비식별 위험 학생 징후 1건이 가명 처리되어 통계에 추가되었습니다. 2학년 대상 학급 케어 주간 편성이 권장됩니다.");

    } else {
        nameColumn = `<strong>${state.studentName}</strong>`;
        classColumn = `${state.studentGradeClass}`;
        
        let badgeClass = 'warning';
        if (state.detectedRiskLevel === 'Danger') badgeClass = 'danger';
        riskLevelColumn = `<span class="tbl-badge ${badgeClass}">${state.detectedRiskLevel === 'Danger' ? '고위험' : '중위험'}</span>`;
        
        keywordsColumn = keywordsHtml;
        triageSummary = `<div class="triage-summary" title="${triageSummaryText}">${triageSummaryText}</div>`;
        statusColumn = `<span class="tbl-badge warning" id="status-badge-${tr.id}">상담 대기</span>`;
        actionButton = `
            <div style="display:flex; flex-direction:column; gap:6px;">
                <button class="action-btn" style="background:var(--primary-color);" onclick="openDetailModal('realtime')"><i class="fa-solid fa-file-invoice"></i> 상세 보고서</button>
                <button class="action-btn" id="action-btn-${tr.id}" onclick="connectWeeClass('${tr.id}', '${state.studentName}')"><i class="fa-solid fa-handshake-angle"></i> Wee클래스 연계</button>
            </div>
        `;

        document.getElementById('macro-drop-rate').innerText = "2학년 3반 위기 점수 급증 (95%)";
        document.getElementById('macro-safety-index').innerText = "자퇴 Threshold 긴급 돌파 경보";

        const cellIndex = initialHeatmapData.findIndex(cell => cell.grade === 2 && cell.class === 3);
        if (cellIndex !== -1) {
            initialHeatmapData[cellIndex].val = 95;
            renderHeatmap();
        }

        if (window.riskChart) {
            const currentData = window.riskChart.data.datasets[1].data;
            currentData[currentData.length - 1] += 12;
            window.riskChart.update();
        }

        triggerMacroAlert(`긴급 연계: [2학년 3반 지훈] 학생으로부터 명시적 사전 동의(Opt-in)를 완료한 위기 연계 신호가 접수되었습니다.`);
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

    state.connectedStudents.push(state.studentName);
    document.getElementById('connected-count').innerText = `${state.connectedStudents.length}건 연계됨`;
}

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

// ==========================================================================
// 4. 상세 보고서 모달 관리 로직 (정적 데모와 실시간 연동 분리)
// ==========================================================================
window.openDetailModal = function(type) {
    const modal = document.getElementById('detail-modal');
    modal.classList.add('open');

    let name = "";
    let riskLevel = "";
    let riskScore = 0;
    let keywords = [];
    let prescriptionText = "";
    let historyHtml = "";

    if (type === 'demo') {
        name = "2학년 3반 김지훈";
        riskLevel = "Danger";
        riskScore = 88;
        keywords = ['자퇴', '죽고싶다', '포기'];
        prescriptionText = `학생이 <strong>'자퇴, 죽고싶다, 포기'</strong> 등 극단적/학업중단 우려 단어를 반복적으로 발화하고 있습니다. 감정적 붕괴 수준이 임계치(80점)를 초과하여 자퇴 도미노의 '초기 징후(Early Stage)'가 뚜렷이 포착되었습니다. <strong>즉각적인 대면 면담 및 보호자 연락, Wee 클래스 정밀 진단 연계를 강력히 권고합니다.</strong>`;
        
        const demoHistory = [
            { sender: 'assistant', text: "반가워. 오늘 하루는 어땠어? 기분이 어떤지 편하게 이야기해보자.", time: "어제 14:02" },
            { sender: 'user', text: "요즘 시험 성적이 너무 떨어져서 괴로워요. 다 포기하고 싶어요.", time: "어제 14:03" },
            { sender: 'assistant', text: "우리 지훈이, 이번 시험 때문에 마음고생이 정말 많았구나. 밤새며 노력한 거 다 아는데 결과가 안 나와 속상했겠어.", time: "어제 14:03" },
            { sender: 'user', text: "이젠 정말 학교 그만두고 자퇴하고 싶어요. 죽고싶다는 생각만 가득 차요.", time: "어제 14:04" }
        ];
        
        historyHtml = demoHistory.map(msg => `
            <div class="history-msg-wrapper ${msg.sender}">
                <div class="history-bubble">${msg.text}</div>
                <span class="history-time">${msg.time}</span>
            </div>
        `).join('');
    } else {
        name = `${state.studentGradeClass} ${state.studentName}`;
        riskLevel = state.detectedRiskLevel;
        riskScore = state.chatbotRiskScore;
        keywords = state.detectedKeywords;
        
        if (state.detectedRiskLevel === 'Danger') {
            prescriptionText = `학생이 <strong>'${state.detectedKeywords.join(', ')}'</strong> 등 극단적 우려 키워드를 발화했습니다. 감정적 상태가 매우 취약하므로, <strong>즉각적인 전문 Wee 클래스 상담 매칭 및 밀착 대면 관찰을 강력히 권고합니다.</strong>`;
        } else if (state.detectedRiskLevel === 'Warning') {
            prescriptionText = `학생이 학업이나 교우 관계로 인해 무력감과 불안(중위험)을 겪고 있습니다. <strong>주기적인 정서 관찰 및 Wee 클래스 상담 멘토링 매칭을 권장합니다.</strong>`;
        } else {
            prescriptionText = `정상 대화가 감지되고 있습니다. 현재 특이 위기 징후는 발견되지 않았으나, <strong>안정적 성장을 돕기 위한 지속적인 교실 정서 모니터링이 유효합니다.</strong>`;
        }

        historyHtml = state.chatHistory.map(msg => `
            <div class="history-msg-wrapper ${msg.sender}">
                <div class="history-bubble">${msg.text}</div>
                <span class="history-time">${msg.time}</span>
            </div>
        `).join('');
    }

    document.getElementById('detail-student-info').innerText = name;
    
    const badge = document.getElementById('detail-risk-badge');
    badge.innerText = riskLevel === 'Danger' ? '고위험' : (riskLevel === 'Warning' ? '중위험' : '안정');
    badge.className = `tbl-badge ${riskLevel === 'Danger' ? 'danger' : (riskLevel === 'Warning' ? 'warning' : 'safe')}`;

    document.getElementById('detail-risk-score').innerText = `${riskScore} / 100`;
    document.getElementById('detail-risk-progress').style.width = `${riskScore}%`;

    const kwList = document.getElementById('detail-keywords-list');
    kwList.innerHTML = keywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('') || '<span class="text-light">감지 키워드 없음</span>';

    document.getElementById('detail-ai-prescription').innerHTML = prescriptionText;

    const historyContainer = document.getElementById('detail-chat-history');
    historyContainer.innerHTML = historyHtml;
    historyContainer.scrollTop = historyContainer.scrollHeight;

    const footer = document.getElementById('detail-modal-footer');
    const rows = document.querySelectorAll('#connection-list tr');
    const rowId = rows.length > 0 ? rows[0].id : 'demo-real-row';
    const targetRowId = type === 'demo' ? 'demo-real-row' : rowId;
    const isAlreadyConnected = type === 'demo' ? (document.getElementById(`status-badge-demo-real-row`).innerText === '연계 완료') : (state.connectedStudents.includes(state.studentName) && document.getElementById(`status-badge-${rowId}`) && document.getElementById(`status-badge-${rowId}`).innerText === '연계 완료');

    if (isAlreadyConnected) {
        footer.innerHTML = `
            <button class="btn btn-secondary" onclick="closeDetailModal()">닫기</button>
            <button class="btn btn-primary" style="background:#10b981; cursor:default;" disabled><i class="fa-solid fa-circle-check"></i> Wee클래스 연계 완료</button>
        `;
    } else {
        footer.innerHTML = `
            <button class="btn btn-secondary" onclick="closeDetailModal()">닫기</button>
            <button class="btn btn-primary" onclick="connectWeeClass('${targetRowId}', '${type === 'demo' ? '김지훈' : state.studentName}'); closeDetailModal();"><i class="fa-solid fa-handshake-angle"></i> 즉시 Wee클래스 연계</button>
        `;
    }
};

window.closeDetailModal = function() {
    const modal = document.getElementById('detail-modal');
    modal.classList.remove('open');
};

// ==========================================================================
// 5. 히트맵-그래프 실시간 인터랙션 연동 로직
// ==========================================================================
let selectedCell = null;

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
