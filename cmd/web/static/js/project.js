// 프로젝트 상세 페이지 JavaScript

let ws = null; // WebSocket 연결

async function loadProjectStatus() {
    const statusInfo = document.getElementById('status-info');
    
    try {
        const response = await fetch(`/api/v1/project/${projectName}/status`);
        const data = await response.json();
        
        statusInfo.innerHTML = `
            <div class="flex justify-between py-3 border-b border-gray-200">
                <span class="font-medium text-gray-600">컨테이너 상태</span>
                <span class="font-semibold">${formatStatus(data.status)}</span>
            </div>
            <div class="flex justify-between py-3 border-b border-gray-200">
                <span class="font-medium text-gray-600">현재 커밋</span>
                <span class="font-semibold">${data.commit || '알 수 없음'}</span>
            </div>
            <div class="flex justify-between py-3 border-b border-gray-200">
                <span class="font-medium text-gray-600">헬스체크</span>
                <span class="font-semibold">${data.healthCheck || '설정 안 됨'}</span>
            </div>
            <div class="flex justify-between py-3">
                <span class="font-medium text-gray-600">마지막 배포</span>
                <span class="font-semibold">${formatDate(data.lastDeploy)}</span>
            </div>
        `;
    } catch (error) {
        console.error('상태 로드 실패:', error);
        statusInfo.innerHTML = '<div class="text-center text-gray-500 py-10">상태를 불러올 수 없습니다.</div>';
    }
}

function formatStatus(status) {
    if (!status) return '알 수 없음';
    if (status.includes('running')) return '✅ 실행 중';
    if (status.includes('stopped')) return '❌ 중지됨';
    return status;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR');
}

// 배포 시작
async function startDeploy() {
    const deployBtn = document.getElementById('deploy-btn');
    const progressSection = document.getElementById('deploy-progress');
    const progressSteps = document.getElementById('progress-steps');
    
    deployBtn.disabled = true;
    deployBtn.textContent = '배포 중...';
    progressSection.classList.remove('hidden');
    
    // WebSocket 연결로 실시간 로그 받기
    connectWebSocket();
    
    // 진행 단계 초기화
    progressSteps.innerHTML = `
        <div class="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg" id="step-connect">
            <span class="step-icon text-lg">⏳</span>
            <span class="step-text">서버 연결 확인</span>
        </div>
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" id="step-backup">
            <span class="step-icon text-lg">⏳</span>
            <span class="step-text">현재 상태 백업</span>
        </div>
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" id="step-pull">
            <span class="step-icon text-lg">⏳</span>
            <span class="step-text">코드 업데이트</span>
        </div>
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" id="step-build">
            <span class="step-icon text-lg">⏳</span>
            <span class="step-text">컨테이너 빌드 및 재시작</span>
        </div>
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" id="step-health">
            <span class="step-icon text-lg">⏳</span>
            <span class="step-text">서비스 헬스체크</span>
        </div>
    `;
    
    try {
        const response = await fetch(`/api/v1/project/${projectName}/deploy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ branch: 'main' })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('배포 시작 실패:', error);
        alert('배포 시작에 실패했습니다: ' + error.message);
        deployBtn.disabled = false;
        deployBtn.textContent = '🚀 배포하기';
        progressSection.classList.add('hidden');
    }
}

// WebSocket 연결
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/logs/${projectName}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket 연결됨');
    };
    
    ws.onmessage = (event) => {
        handleLogMessage(event.data);
    };
    
    ws.onclose = () => {
        console.log('WebSocket 연결 종료');
        const deployBtn = document.getElementById('deploy-btn');
        deployBtn.disabled = false;
        deployBtn.textContent = '🚀 배포하기';
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket 에러:', error);
    };
}

// 로그 메시지 처리
function handleLogMessage(message) {
    const logContent = document.getElementById('log-content');
    const logsSection = document.getElementById('logs-section');
    
    // 로그 섹션 표시
    logsSection.classList.remove('hidden');
    
    // 로그 추가
    logContent.textContent += message + '\n';
    logContent.scrollTop = logContent.scrollHeight;
    
    // 진행 단계 업데이트
    updateProgressStep(message);
}

// 진행 단계 업데이트
function updateProgressStep(message) {
    if (message.includes('서버 연결 확인')) {
        setStepStatus('step-connect', 'completed');
        setStepStatus('step-backup', 'active');
    } else if (message.includes('현재 상태 백업')) {
        setStepStatus('step-backup', 'completed');
        setStepStatus('step-pull', 'active');
    } else if (message.includes('코드 업데이트')) {
        setStepStatus('step-pull', 'completed');
        setStepStatus('step-build', 'active');
    } else if (message.includes('컨테이너 빌드')) {
        setStepStatus('step-build', 'completed');
        setStepStatus('step-health', 'active');
    } else if (message.includes('배포 완료')) {
        setStepStatus('step-health', 'completed');
        setTimeout(() => {
            loadProjectStatus(); // 상태 새로고침
        }, 2000);
    }
}

function setStepStatus(stepId, status) {
    const step = document.getElementById(stepId);
    if (!step) return;
    
    const icon = step.querySelector('.step-icon');
    
    if (status === 'completed') {
        step.className = 'flex items-center gap-3 p-3 bg-green-50 rounded-lg';
        icon.textContent = '✅';
    } else if (status === 'active') {
        step.className = 'flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg';
        icon.innerHTML = '<svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
    } else if (status === 'error') {
        step.className = 'flex items-center gap-3 p-3 bg-red-50 rounded-lg';
        icon.textContent = '❌';
    }
}

// 로그 보기
async function showLogs() {
    const logsSection = document.getElementById('logs-section');
    const logContent = document.getElementById('log-content');
    
    logsSection.classList.remove('hidden');
    logContent.textContent = '로그를 불러오는 중...\n';
    
    try {
        const response = await fetch(`/api/v1/project/${projectName}/logs?lines=100`);
        const data = await response.json();
        
        logContent.textContent = data.logs || '로그가 없습니다.';
    } catch (error) {
        console.error('로그 로드 실패:', error);
        logContent.textContent = '로그를 불러올 수 없습니다.';
    }
}

// 롤백
async function rollback() {
    if (!confirm('정말로 이전 버전으로 롤백하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/v1/project/${projectName}/rollback`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('롤백이 완료되었습니다.');
            loadProjectStatus();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('롤백 실패:', error);
        alert('롤백에 실패했습니다: ' + error.message);
    }
}

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    loadProjectStatus();
    
    document.getElementById('deploy-btn').addEventListener('click', startDeploy);
    document.getElementById('logs-btn').addEventListener('click', showLogs);
    document.getElementById('rollback-btn').addEventListener('click', rollback);
    
    // 30초마다 상태 새로고침
    setInterval(loadProjectStatus, 30000);
});