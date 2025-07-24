// 프로젝트 상세 페이지 JavaScript

let ws = null; // WebSocket 연결

// 배포 상세 정보 표시 (미구현)
function showDeployDetails(jobId) {
    // 향후 구현 예정
    console.log('배포 상세 정보:', jobId);
}

// 배포 히스토리 로드
async function loadDeployHistory() {
    try {
        const response = await fetch(`/api/v1/project/${projectName}/history?limit=10`);
        const history = await response.json();
        
        const historyDiv = document.getElementById('deploy-history');
        
        if (!history || history.length === 0) {
            historyDiv.innerHTML = `
                <div class="text-center py-10">
                    <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="text-gray-500">아직 배포 기록이 없습니다</p>
                    <p class="text-sm text-gray-400 mt-1">첫 배포를 시작해보세요!</p>
                </div>
            `;
            return;
        }
        
        historyDiv.innerHTML = history.map(job => {
            const statusClass = getJobStatusClass(job.status);
            const statusIcon = getJobStatusIcon(job.status);
            const duration = job.completed_at ? 
                Math.round((new Date(job.completed_at) - new Date(job.started_at)) / 1000) : 
                null;
            
            return `
                <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer" onclick="showDeployDetails('${job.id}')">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="${statusClass} w-10 h-10 rounded-full flex items-center justify-center">
                                ${statusIcon}
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="font-medium text-gray-900">배포 #${job.id}</span>
                                    <span class="text-sm text-gray-500">• ${job.branch || 'main'} 브랜치</span>
                                </div>
                                <div class="text-sm text-gray-500">${formatDateTime(job.started_at)}</div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm font-medium ${getJobStatusTextClass(job.status)}">
                                ${getJobStatusText(job.status)}
                            </div>
                            ${duration ? `<div class="text-xs text-gray-500">소요시간: ${duration}초</div>` : ''}
                        </div>
                    </div>
                    ${job.error ? `
                        <div class="mt-3 p-2 bg-red-50 rounded-md">
                            <p class="text-sm text-red-800">⚠️ ${job.error}</p>
                        </div>
                    ` : ''}
                    ${job.status === 'completed' ? `
                        <div class="mt-2 text-xs text-gray-500">
                            🎉 성공적으로 배포되었습니다
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('히스토리 로드 실패:', error);
    }
}

function getJobStatusClass(status) {
    switch(status) {
        case 'completed': return 'bg-green-100';
        case 'failed': return 'bg-red-100';
        case 'running': return 'bg-blue-100';
        default: return 'bg-gray-100';
    }
}

function getJobStatusIcon(status) {
    switch(status) {
        case 'completed': 
            return '<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
        case 'failed':
            return '<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
        case 'running':
            return '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>';
        default:
            return '<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    }
}

function getJobStatusText(status) {
    switch(status) {
        case 'completed': return '완료';
        case 'failed': return '실패';
        case 'running': return '진행 중';
        case 'pending': return '대기 중';
        default: return status;
    }
}

function getJobStatusTextClass(status) {
    switch(status) {
        case 'completed': return 'text-green-600';
        case 'failed': return 'text-red-600';
        case 'running': return 'text-blue-600';
        default: return 'text-gray-600';
    }
}

function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

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
                <span class="font-mono text-sm bg-gray-100 px-2 py-1 rounded">${data.commit || '알 수 없음'}</span>
            </div>
            <div class="flex justify-between py-3 border-b border-gray-200">
                <span class="font-medium text-gray-600">Git 브랜치</span>
                <span class="font-semibold">${data.branch || 'main'}</span>
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
    if (!status) return '<span class="text-gray-500">상태 확인 중...</span>';
    if (status.includes('running')) return '<span class="text-green-600 font-medium">✅ 실행 중</span>';
    if (status.includes('stopped')) return '<span class="text-red-600 font-medium">❌ 중지됨</span>';
    return `<span class="text-gray-600">${status}</span>`;
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
    
    // 진행 단계 초기화 (백업 단계 제거)
    progressSteps.innerHTML = `
        <div class="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg" id="step-connect">
            <span class="step-icon text-lg">⏳</span>
            <span class="step-text">서버 연결 확인</span>
        </div>
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" id="step-pull">
            <span class="step-icon text-lg">⏳</span>
            <span class="step-text">GitHub에서 최신 코드 가져오기</span>
        </div>
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" id="step-build">
            <span class="step-icon text-lg">⏳</span>
            <span class="step-text">Docker 컨테이너 빌드 및 재시작</span>
        </div>
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" id="step-health">
            <span class="step-icon text-lg">⏳</span>
            <span class="step-text">서비스 상태 확인</span>
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
    // PROGRESS 이벤트 처리
    if (message.includes('[PROGRESS]')) {
        const match = message.match(/\[PROGRESS\]\s+(\w+)\|(\w+)\|(.+)/);
        if (match) {
            const [, step, status, desc] = match;
            const stepMap = {
                'connect': 'step-connect',
                'pull': 'step-pull',
                'build': 'step-build',
                'health': 'step-health'
            };
            
            if (stepMap[step]) {
                setStepStatus(stepMap[step], status);
            }
            
            // 완료 처리
            if (step === 'complete' && status === 'completed') {
                handleDeployComplete();
            }
            return;
        }
    }
    
    // 기존 텍스트 기반 매칭 (백업)
    if (message.includes('서버 연결 확인')) {
        setStepStatus('step-connect', 'completed');
        setStepStatus('step-pull', 'active');
    } else if (message.includes('Git pull') || message.includes('코드 업데이트')) {
        setStepStatus('step-pull', 'active');
    } else if (message.includes('배포 커밋:')) {
        setStepStatus('step-pull', 'completed');
        setStepStatus('step-build', 'active');
    } else if (message.includes('기존 스택 정리') || message.includes('새로운 스택 빌드')) {
        setStepStatus('step-build', 'active');
    } else if (message.includes('헬스체크')) {
        setStepStatus('step-build', 'completed');
        setStepStatus('step-health', 'active');
    } else if (message.includes('✅ 배포 완료!')) {
        handleDeployComplete();
    } else if (message.includes('[ERROR]')) {
        const activeStep = document.querySelector('.border-blue-200');
        if (activeStep) {
            setStepStatus(activeStep.id, 'error');
        }
        handleDeployError();
    }
}

// 배포 완료 처리
function handleDeployComplete() {
    setStepStatus('step-health', 'completed');
    
    const deployBtn = document.getElementById('deploy-btn');
    deployBtn.disabled = false;
    deployBtn.textContent = '🚀 배포하기';
    
    // 상태 새로고침
    setTimeout(() => {
        loadProjectStatus();
        loadDeployHistory();
        
        // 진행 상황 숨기기
        setTimeout(() => {
            const progressSection = document.getElementById('deploy-progress');
            progressSection.classList.add('hidden');
        }, 3000);
    }, 1000);
    
    // 성공 알림
    showNotification('배포가 성공적으로 완료되었습니다!', 'success');
}

// 배포 에러 처리
function handleDeployError() {
    const deployBtn = document.getElementById('deploy-btn');
    deployBtn.disabled = false;
    deployBtn.textContent = '🚀 배포하기';
    
    // 에러 알림
    showNotification('배포 중 오류가 발생했습니다. 로그를 확인하세요.', 'error');
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


// SSE를 통한 실시간 배포 이벤트 수신
function connectDeployEvents() {
    const eventSource = new EventSource('/api/v1/deploy/events');
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // 현재 프로젝트의 이벤트만 처리
        if (data.service === projectName) {
            handleDeployEvent(data);
        }
    };
    
    eventSource.onerror = (error) => {
        console.error('SSE 연결 오류:', error);
        // 5초 후 재연결 시도
        setTimeout(connectDeployEvents, 5000);
    };
}

// 배포 이벤트 처리
function handleDeployEvent(event) {
    // 히스토리 새로고침
    loadDeployHistory();
    
    // 상태 업데이트
    if (event.status === 'completed' || event.status === 'failed') {
        loadProjectStatus();
        
        // 알림 표시
        if (event.status === 'completed') {
            showNotification('배포가 성공적으로 완료되었습니다!', 'success');
        } else {
            showNotification('배포가 실패했습니다.', 'error');
        }
    }
}

// 알림 표시
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    notification.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${type === 'success' 
                    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>' 
                    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>'}
            </svg>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 애니메이션
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
        notification.classList.add('translate-x-0');
    }, 100);
    
    // 3초 후 제거
    setTimeout(() => {
        notification.classList.remove('translate-x-0');
        notification.classList.add('translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    loadProjectStatus();
    loadDeployHistory();
    
    // 실시간 배포 이벤트 연결
    connectDeployEvents();
    
    document.getElementById('deploy-btn').addEventListener('click', startDeploy);
    document.getElementById('logs-btn').addEventListener('click', showLogs);
    
    // 30초마다 상태 새로고침
    setInterval(loadProjectStatus, 30000);
});