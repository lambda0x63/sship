// 프로젝트 상세 페이지 JavaScript

let ws = null; // WebSocket 연결

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
            <div class="flex justify-between items-start py-3 border-b border-gray-200">
                <span class="font-medium text-gray-600">현재 커밋</span>
                <div class="text-right max-w-xs">
                    ${formatCommitInfo(data.commit)}
                </div>
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

function formatCommitInfo(commitInfo) {
    if (!commitInfo || commitInfo === 'unknown' || commitInfo === 'unknown|') {
        return '<span class="text-gray-500">커밋 정보 없음</span>';
    }
    
    // 커밋 해시와 메시지 분리
    const parts = commitInfo.split('|');
    const hash = parts[0] || 'unknown';
    const message = parts[1] || '';
    
    if (!message) {
        return `<span class="font-mono text-sm bg-gray-100 px-2 py-1 rounded">${hash}</span>`;
    }
    
    return `
        <div>
            <span class="font-mono text-sm bg-gray-100 px-2 py-1 rounded">${hash}</span>
            <div class="text-sm text-gray-600 mt-1 truncate">${message}</div>
        </div>
    `;
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

// 환경변수 토글
let envVarsLoaded = false;
let currentEnvVars = {};

async function toggleEnvVars() {
    const envVarsDiv = document.getElementById('env-vars');
    const toggleBtn = document.getElementById('toggle-env-btn');
    
    if (envVarsDiv.classList.contains('hidden')) {
        envVarsDiv.classList.remove('hidden');
        toggleBtn.textContent = '숨기기';
        
        if (!envVarsLoaded) {
            await loadEnvironmentVariables();
            envVarsLoaded = true;
        }
    } else {
        envVarsDiv.classList.add('hidden');
        toggleBtn.textContent = '보기';
    }
}

// 환경변수 로드
async function loadEnvironmentVariables() {
    const envVarsDiv = document.getElementById('env-vars');
    
    try {
        const response = await fetch(`/api/v1/project/${projectName}/environment`);
        const data = await response.json();
        
        if (data.environment && Object.keys(data.environment).length > 0) {
            currentEnvVars = data.environment;
            const envVarsHtml = Object.entries(data.environment)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => {
                    return `
                        <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 group">
                            <span class="font-mono text-sm text-gray-700">${key}</span>
                            <div class="flex items-center gap-2">
                                <span class="font-mono text-sm text-gray-900 break-all max-w-xs text-right">
                                    ${value}
                                </span>
                                <button onclick="copyEnvVar('${key}', '${value.replace(/'/g, "\\'")}')" 
                                        class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                                        title="복사">
                                    <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            
            envVarsDiv.innerHTML = `
                <div class="max-h-96 overflow-y-auto">
                    ${envVarsHtml}
                </div>
                <div class="mt-4 flex justify-between items-center">
                    <button onclick="copyAllEnvVars()" class="text-sm text-blue-600 hover:text-blue-800">
                        전체 복사 (.env 형식)
                    </button>
                    <span id="copy-feedback" class="text-sm text-green-600 opacity-0 transition-opacity">
                        복사됨!
                    </span>
                </div>
            `;
        } else {
            envVarsDiv.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">환경 변수가 설정되지 않았습니다</p>';
        }
    } catch (error) {
        console.error('환경변수 로드 실패:', error);
        envVarsDiv.innerHTML = '<p class="text-sm text-red-600 text-center py-4">환경 변수를 불러올 수 없습니다</p>';
    }
}

// 개별 환경변수 복사
function copyEnvVar(key, value) {
    const text = `${key}=${value}`;
    copyToClipboard(text, () => {
        showCopyFeedback();
    });
}

// 전체 환경변수 복사
function copyAllEnvVars() {
    const envText = Object.entries(currentEnvVars)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    copyToClipboard(envText, () => {
        showCopyFeedback();
    });
}

// 환경 변수 섹션 복사 (보이는 상태 그대로)
function copyEnvSection() {
    const envSection = document.querySelector('#env-vars').parentElement;
    const title = envSection.querySelector('h2').textContent;
    
    // 환경변수가 로드되지 않았으면 먼저 로드
    if (!envVarsLoaded) {
        showNotification('환경 변수를 먼저 확인해주세요', 'warning');
        return;
    }
    
    // 환경변수 텍스트 생성
    let copyText = `${title}\n${'='.repeat(title.length)}\n\n`;
    
    if (Object.keys(currentEnvVars).length > 0) {
        Object.entries(currentEnvVars)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([key, value]) => {
                copyText += `${key}: ${value}\n`;
            });
    } else {
        copyText += '환경 변수가 설정되지 않았습니다\n';
    }
    
    copyToClipboard(copyText, () => {
        showNotification('환경 변수 섹션이 복사되었습니다', 'success');
    });
}

// 클립보드 복사 함수
async function copyToClipboard(text, onSuccess) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            onSuccess();
        } else {
            // 폴백: textarea 사용
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                onSuccess();
            } catch (err) {
                console.error('복사 실패:', err);
            } finally {
                document.body.removeChild(textarea);
            }
        }
    } catch (err) {
        console.error('클립보드 복사 실패:', err);
    }
}

// 복사 완료 피드백
function showCopyFeedback() {
    const feedback = document.getElementById('copy-feedback');
    if (feedback) {
        feedback.classList.remove('opacity-0');
        feedback.classList.add('opacity-100');
        
        setTimeout(() => {
            feedback.classList.remove('opacity-100');
            feedback.classList.add('opacity-0');
        }, 2000);
    }
}

// 서비스 삭제
async function deleteService() {
    const confirmMessage = `'${projectName}' 서비스를 sship에서 제거하시겠습니까?\n\n` +
                          `⚠️ 주의사항:\n` +
                          `• sship 설정에서만 제거됩니다\n` +
                          `• VPS의 실제 파일과 컨테이너는 그대로 유지됩니다\n` +
                          `• 이 작업은 되돌릴 수 없습니다`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // 두 번째 확인
    const userInput = prompt(`정말로 삭제하려면 서비스명을 입력하세요: ${projectName}`);
    if (userInput !== projectName) {
        showNotification('서비스명이 일치하지 않습니다', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/v1/project/${projectName}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification('서비스가 삭제되었습니다', 'success');
            // 메인 페이지로 리다이렉트
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } else {
            showNotification('서비스 삭제 실패: ' + (result.error || result.message), 'error');
        }
    } catch (error) {
        showNotification('서비스 삭제 중 오류 발생', 'error');
        console.error('삭제 오류:', error);
    }
}

// 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    loadProjectStatus();
    
    // 실시간 배포 이벤트 연결
    connectDeployEvents();
    
    document.getElementById('deploy-btn').addEventListener('click', startDeploy);
    document.getElementById('logs-btn').addEventListener('click', showLogs);
    
    // 30초마다 상태 새로고침
    setInterval(loadProjectStatus, 30000);
});