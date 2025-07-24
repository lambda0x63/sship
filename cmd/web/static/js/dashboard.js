// 메인 페이지 (Dashboard) JavaScript

// 전역 변수
let deployEventSource = null;
let activeDeployments = {}; // 진행 중인 배포 추적

// 서비스 목록 로드
async function loadServices() {
    const grid = document.getElementById('services-grid');
    
    try {
        const response = await fetch('/api/v1/projects');
        const services = await response.json();
        
        // 디버깅: API 응답 확인
        console.log('API 응답:', services);
        
        // 서비스가 없는 경우
        if (!services || services.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full">
                    <div class="bg-gray-50 rounded-xl p-8 text-center">
                        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        <p class="text-gray-600 mb-4">아직 등록된 서비스가 없습니다</p>
                        <button onclick="showAddServiceModal()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                            첫 서비스 추가하기
                        </button>
                    </div>
                </div>`;
            return;
        }
        
        // 통계 업데이트
        const activeCount = services.filter(s => s.status && s.status.includes('running')).length;
        const uniqueServers = [...new Set(services.map(s => `${s.server?.host}:${s.server?.port}`))].length;
        updateStats(services.length, activeCount, uniqueServers);
        
        // VPS별로 서비스 그룹화
        const servicesByVPS = {};
        services.forEach(service => {
            const vpsKey = `${service.server?.host}:${service.server?.port}`;
            if (!servicesByVPS[vpsKey]) {
                servicesByVPS[vpsKey] = {
                    host: service.server?.host || 'Unknown',
                    port: service.server?.port || 22,
                    services: []
                };
            }
            servicesByVPS[vpsKey].services.push(service);
        });
        
        // VPS별로 렌더링
        grid.innerHTML = '';
        Object.entries(servicesByVPS).forEach(([vpsKey, vpsData]) => {
            const vpsSection = createVPSSection(vpsData);
            grid.appendChild(vpsSection);
        });
    } catch (error) {
        console.error('서비스 로드 실패:', error);
        grid.innerHTML = `
            <div class="col-span-full">
                <div class="bg-red-50 rounded-xl p-8 text-center">
                    <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="text-red-600 font-medium">서비스 목록을 불러올 수 없습니다</p>
                    <p class="text-red-500 text-sm mt-2">${error.message}</p>
                </div>
            </div>`;
    }
}

function createVPSSection(vpsData) {
    const section = document.createElement('div');
    section.className = 'col-span-full bg-white rounded-xl shadow-sm p-6 mb-6';
    
    const runningCount = vpsData.services.filter(s => s.status && s.status.includes('running')).length;
    const totalCount = vpsData.services.length;
    
    section.innerHTML = `
        <div class="mb-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900">${vpsData.host}</h3>
                        <p class="text-sm text-gray-500">포트 ${vpsData.port} • ${runningCount}/${totalCount} 서비스 실행 중</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            ${vpsData.services.map(service => createServiceCard(service)).join('')}
        </div>
    `;
    
    return section;
}

function createServiceCard(service) {
    // 배포 중인지 확인
    const isDeploying = activeDeployments[service.name];
    
    const statusClass = isDeploying ? 'bg-blue-100' : getStatusClass(service.status);
    const statusIcon = isDeploying ? getDeployingIcon() : getStatusIcon(service.status);
    const statusText = isDeploying ? '배포 중...' : getStatusText(service.status);
    const lastDeployText = formatLastDeploy(service.lastDeploy);
    
    return `
        <div class="service-card bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all duration-200 cursor-pointer group relative" 
             onclick="window.location.href='/project/${service.name}'">
            <button onclick="event.stopPropagation(); deleteServiceFromDashboard('${service.name}')" 
                    class="absolute top-2 right-2 p-1.5 text-red-600 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="서비스 삭제">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
            </button>
            <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                    <h4 class="font-medium text-gray-900">${service.name}</h4>
                    <p class="text-sm text-gray-500">${service.branch || 'main'} 브랜치</p>
                </div>
                <div class="${statusClass} w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    ${statusIcon}
                </div>
            </div>
            <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600">${statusText}</span>
                <span class="text-gray-400">${lastDeployText}</span>
            </div>
            <div class="mt-2 text-xs text-gray-500 truncate">
                <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
                ${service.path}
            </div>
        </div>
    `;
}

function getStatusClass(status) {
    if (status && status.includes('running')) return 'bg-green-100';
    if (status && status.includes('stopped')) return 'bg-red-100';
    return 'bg-gray-100';
}

function getStatusTextClass(status) {
    if (status && status.includes('running')) return 'text-green-600';
    if (status && status.includes('stopped')) return 'text-red-600';
    return 'text-gray-600';
}

function getStatusIcon(status) {
    if (status && status.includes('running')) {
        return '<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
    }
    if (status && status.includes('stopped')) {
        return '<svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
    }
    return '<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
}

function getDeployingIcon() {
    return '<div class="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>';
}

function getStatusText(status) {
    if (!status) return '알 수 없음';
    if (status.includes('running')) return '실행 중';
    if (status.includes('stopped')) return '중지됨';
    return status;
}

function formatLastDeploy(timestamp) {
    if (!timestamp || timestamp === '0001-01-01T00:00:00Z') {
        return '배포 기록 없음';
    }
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // 시간 차이 계산
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    
    // 일주일 이상이면 날짜 표시
    return date.toLocaleDateString('ko-KR');
}

// 통계 업데이트 함수
function updateStats(total, active, servers) {
    document.getElementById('total-services').textContent = total;
    document.getElementById('active-services').textContent = active;
    document.getElementById('connected-servers').textContent = servers;
}

// 모달 관련 함수
function showAddServiceModal() {
    document.getElementById('add-service-modal').classList.remove('hidden');
    document.getElementById('add-service-form').reset();
}

function hideAddServiceModal() {
    document.getElementById('add-service-modal').classList.add('hidden');
}

// 서비스 추가 폼 처리
async function handleAddService(e) {
    e.preventDefault();
    
    const serviceName = document.getElementById('modal-service-name').value;
    const serviceConfig = {
        server: {
            host: document.getElementById('modal-host').value,
            port: parseInt(document.getElementById('modal-port').value),
            user: document.getElementById('modal-user').value,
            password: document.getElementById('modal-password').value
        },
        path: document.getElementById('modal-path').value,
        branch: document.getElementById('modal-branch').value,
        docker_compose: document.getElementById('modal-docker-compose').value,
        health_check: document.getElementById('modal-health-check').value
    };

    try {
        const response = await fetch(`/api/v1/project/${serviceName}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serviceConfig)
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            hideAddServiceModal();
            loadServices(); // 서비스 목록 새로고침
            showSuccessNotification('서비스가 성공적으로 추가되었습니다!');
        } else {
            showErrorNotification('서비스 추가 실패: ' + (result.error || result.message));
        }
    } catch (error) {
        showErrorNotification('서비스 추가 중 오류 발생: ' + error.message);
    }
}

// 알림 함수들
function showSuccessNotification(message) {
    showNotification(message, 'success');
}

function showErrorNotification(message, details) {
    showNotification(message, 'error', details);
}

function showNotification(message, type, details) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    } max-w-md`;
    
    const hasDetails = type === 'error' && details;
    
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center flex-1">
                <svg class="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    ${type === 'success' 
                        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>' 
                        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>'}
                </svg>
                <span class="mr-4">${message}</span>
            </div>
            ${hasDetails ? `
                <button onclick="showErrorDetailsModal('${message}', \`${details.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)" 
                        class="ml-2 px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm transition-colors">
                    상세보기
                </button>
            ` : ''}
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 애니메이션으로 표시
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // 3초 후 자동 제거 (에러가 아닌 경우)
    if (type !== 'error') {
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// 에러 상세 모달
function showErrorDetailsModal(title, details) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div class="p-6 border-b">
                <h3 class="text-lg font-semibold text-gray-900">${title}</h3>
            </div>
            <div class="p-6 overflow-y-auto max-h-[60vh]">
                <pre class="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded">${details}</pre>
            </div>
            <div class="p-6 border-t bg-gray-50 flex justify-end">
                <button onclick="this.closest('.fixed').remove()" 
                        class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
                    닫기
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 연결 테스트
async function testConnection() {
    const testBtn = document.getElementById('test-connection-btn');
    const originalText = testBtn.textContent;
    testBtn.disabled = true;
    testBtn.textContent = '연결 테스트 중...';
    
    const connectionData = {
        host: document.getElementById('modal-host').value,
        port: parseInt(document.getElementById('modal-port').value),
        user: document.getElementById('modal-user').value,
        password: document.getElementById('modal-password').value
    };
    
    try {
        const response = await fetch('/api/v1/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(connectionData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showSuccessNotification('SSH 연결 성공!');
        } else {
            showErrorNotification('SSH 연결 실패', result.error || result.message);
        }
    } catch (error) {
        showErrorNotification('연결 테스트 실패', error.message);
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = originalText;
    }
}

// 실시간 배포 이벤트 연결
function connectDeployEvents() {
    if (deployEventSource) {
        deployEventSource.close();
    }
    
    deployEventSource = new EventSource('/api/v1/deploy/events');
    
    deployEventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleDeployEvent(data);
    };
    
    deployEventSource.onerror = (error) => {
        console.error('SSE 연결 오류:', error);
        // 5초 후 재연결
        setTimeout(connectDeployEvents, 5000);
    };
}

// 배포 이벤트 처리
function handleDeployEvent(event) {
    console.log('배포 이벤트:', event);
    
    // 배포 상태 업데이트
    if (event.status === 'started' || event.status === 'running') {
        activeDeployments[event.service] = true;
    } else if (event.status === 'completed' || event.status === 'failed') {
        delete activeDeployments[event.service];
        
        // 알림 표시
        if (event.status === 'completed') {
            showSuccessNotification(`${event.service} 배포가 완료되었습니다!`);
        } else {
            showErrorNotification(`${event.service} 배포가 실패했습니다`, event.message);
        }
    }
    
    // 서비스 목록 새로고침
    loadServices();
    
    // 활성 배포 작업 업데이트
    updateActiveDeployments();
}

// 활성 배포 작업 표시
async function updateActiveDeployments() {
    try {
        const response = await fetch('/api/v1/deploy/active');
        const activeJobs = await response.json();
        
        // 활성 배포 상태 업데이트
        activeDeployments = {};
        if (activeJobs) {
            Object.keys(activeJobs).forEach(jobId => {
                const job = activeJobs[jobId];
                if (job.service) {
                    activeDeployments[job.service] = true;
                }
            });
        }
        
        // 활성 배포 수 업데이트
        const activeCount = Object.keys(activeDeployments).length;
        const badge = document.getElementById('active-deployments-badge');
        
        if (badge) {
            if (activeCount > 0) {
                badge.textContent = activeCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
        
        // 서비스 목록 새로고침
        loadServices();
    } catch (error) {
        console.error('활성 배포 상태 확인 실패:', error);
    }
}

// 유틸리티 함수들
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

function getRelativeTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // 초 단위
    
    if (diff < 60) return '방금 전';
    
    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes}분 전`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}주 전`;
    
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}개월 전`;
    
    return date.toLocaleDateString('ko-KR');
}

// 대시보드에서 서비스 삭제
async function deleteServiceFromDashboard(serviceName) {
    const confirmMessage = `'${serviceName}' 서비스를 sship에서 제거하시겠습니까?\n\n` +
                          `⚠️ sship 설정에서만 제거됩니다.\n` +
                          `VPS의 실제 파일과 컨테이너는 그대로 유지됩니다.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/v1/project/${serviceName}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showSuccessNotification('서비스가 삭제되었습니다');
            // 서비스 목록 새로고침
            loadServices();
        } else {
            showErrorNotification('서비스 삭제 실패', result.error || result.message);
        }
    } catch (error) {
        showErrorNotification('서비스 삭제 중 오류 발생', error.message);
    }
}

// 페이지 로드 시 서비스 목록 불러오기
document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    
    // 실시간 배포 이벤트 연결
    connectDeployEvents();
    
    // 활성 배포 상태 확인
    updateActiveDeployments();
    
    // 30초마다 자동 새로고침
    setInterval(loadServices, 30000);
    
    // 서비스 추가 폼 이벤트 리스너
    const addServiceForm = document.getElementById('add-service-form');
    if (addServiceForm) {
        addServiceForm.addEventListener('submit', handleAddService);
    }
});