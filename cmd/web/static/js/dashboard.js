// 대시보드 JavaScript

async function loadServices() {
    const grid = document.getElementById('services-grid');
    
    try {
        const response = await fetch('/api/v1/projects');
        const services = await response.json();
        
        grid.innerHTML = '';
        
        if (services.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full">
                    <div class="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
                        <img src="/static/icon.png" alt="No services" class="w-20 h-20 mx-auto mb-4 opacity-30">
                        <p class="text-gray-500 mb-2 text-lg font-medium">아직 등록된 서비스가 없습니다</p>
                        <p class="text-gray-400 text-sm mb-6">첫 번째 서비스를 추가하여 배포를 시작하세요</p>
                        <button onclick="showAddServiceModal()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
                            🚀 첫 번째 서비스 추가하기
                        </button>
                    </div>
                </div>`;
            updateStats(0, 0, 0);
            return;
        }
        
        // 통계 업데이트
        const activeCount = services.filter(s => s.status && s.status.includes('running')).length;
        const uniqueServers = [...new Set(services.map(s => `${s.server?.host}:${s.server?.port}`))].length;
        updateStats(services.length, activeCount, uniqueServers);
        
        services.forEach(service => {
            const card = createServiceCard(service);
            grid.appendChild(card);
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

function createServiceCard(service) {
    const card = document.createElement('div');
    card.className = 'service-card bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden';
    card.onclick = () => window.location.href = `/project/${service.name}`;
    
    const statusClass = getStatusClass(service.status);
    const statusIcon = getStatusIcon(service.status);
    const statusText = getStatusText(service.status);
    const lastDeployText = formatLastDeploy(service.lastDeploy);
    
    card.innerHTML = `
        <div class="p-6">
            <div class="flex items-start justify-between mb-4">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900">${service.name}</h3>
                    <p class="text-sm text-gray-500 mt-1">${service.branch || 'main'} 브랜치</p>
                </div>
                <div class="${statusClass} w-10 h-10 rounded-full flex items-center justify-center">
                    ${statusIcon}
                </div>
            </div>
            
            <div class="space-y-3">
                <div class="flex items-center text-sm">
                    <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                    </svg>
                    <span class="text-gray-600 truncate">${service.server?.host || 'Unknown'}</span>
                </div>
                
                <div class="flex items-center text-sm">
                    <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                    </svg>
                    <span class="text-gray-600 truncate">${service.path}</span>
                </div>
                
                <div class="flex items-center text-sm">
                    <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="text-gray-600">${lastDeployText}</span>
                </div>
            </div>
        </div>
        
        <div class="bg-gray-50 px-6 py-3 border-t border-gray-100">
            <div class="flex items-center justify-between text-sm">
                <span class="text-gray-500">상태</span>
                <span class="font-medium ${getStatusTextClass(service.status)}">${statusText}</span>
            </div>
        </div>
    `;
    
    return card;
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
        return '<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
    }
    if (status && status.includes('stopped')) {
        return '<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
    }
    return '<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
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
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 애니메이션
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
        notification.classList.add('translate-x-0');
    }, 100);
    
    // 3초 후 제거 (에러이고 상세내용이 있으면 5초)
    const duration = hasDetails ? 5000 : 3000;
    setTimeout(() => {
        notification.classList.remove('translate-x-0');
        notification.classList.add('translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// 에러 상세 모달
function showErrorDetailsModal(title, details) {
    // 기존 모달 제거
    const existingModal = document.getElementById('error-details-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'error-details-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div class="p-6 border-b border-gray-200">
                <div class="flex items-start justify-between">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900">배포 오류 상세 정보</h3>
                        <p class="text-sm text-gray-600 mt-1">${title}</p>
                    </div>
                    <button onclick="document.getElementById('error-details-modal').remove()" 
                            class="text-gray-400 hover:text-gray-500">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="p-6 overflow-y-auto flex-1">
                <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto">${escapeHtml(details)}</pre>
            </div>
            <div class="p-6 border-t border-gray-200 bg-gray-50">
                <button onclick="document.getElementById('error-details-modal').remove()" 
                        class="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                    닫기
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// HTML 이스케이프 함수
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// SSE를 통한 실시간 배포 이벤트 수신
function connectDeployEvents() {
    const eventSource = new EventSource('/api/v1/deploy/events');
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleDeployEvent(data);
    };
    
    eventSource.onerror = (error) => {
        console.error('SSE 연결 오류:', error);
        // 5초 후 재연결 시도
        setTimeout(connectDeployEvents, 5000);
    };
}

// 배포 이벤트 처리
function handleDeployEvent(event) {
    // 알림 표시
    if (event.status === 'completed') {
        showSuccessNotification(`${event.service} 배포가 완료되었습니다!`);
    } else if (event.status === 'failed') {
        showErrorNotification(`${event.service} 배포가 실패했습니다`, event.message);
    }
    
    // 서비스 목록 새로고침
    loadServices();
    
    // 활성 배포 작업 업데이트
    updateActiveDeployments();
    
    // 최근 활동 업데이트
    loadRecentActivities();
}

// 활성 배포 작업 표시
async function updateActiveDeployments() {
    try {
        const response = await fetch('/api/v1/deploy/active');
        const jobs = await response.json();
        
        // 활성 작업이 있으면 표시
        if (jobs && jobs.length > 0) {
            showActiveDeploymentsBanner(jobs);
        } else {
            hideActiveDeploymentsBanner();
        }
    } catch (error) {
        console.error('활성 배포 조회 실패:', error);
    }
}

// 활성 배포 배너 표시
function showActiveDeploymentsBanner(jobs) {
    let banner = document.getElementById('active-deployments-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'active-deployments-banner';
        banner.className = 'bg-blue-50 border-l-4 border-blue-400 p-4 mb-6';
        const mainContent = document.querySelector('main');
        mainContent.insertBefore(banner, mainContent.firstChild);
    }
    
    const jobsHtml = jobs.map(job => `
        <div class="flex items-center justify-between py-2">
            <div class="flex items-center">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span class="text-sm font-medium text-blue-800">${job.service_name}</span>
                <span class="text-sm text-blue-600 ml-2">${job.status === 'running' ? '배포 중...' : '대기 중'}</span>
            </div>
            <span class="text-xs text-blue-600">${formatTime(job.started_at)}</span>
        </div>
    `).join('');
    
    banner.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium text-blue-800">진행 중인 배포</h3>
            <button onclick="hideActiveDeploymentsBanner()" class="text-blue-600 hover:text-blue-800">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
        ${jobsHtml}
    `;
}

function hideActiveDeploymentsBanner() {
    const banner = document.getElementById('active-deployments-banner');
    if (banner) {
        banner.remove();
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

// 최근 활동 로드
async function loadRecentActivities() {
    try {
        // 모든 서비스의 최근 히스토리를 가져와서 통합
        const response = await fetch('/api/v1/config');
        const config = await response.json();
        
        const allActivities = [];
        
        // 각 서비스의 최근 활동 가져오기
        for (const serviceName of Object.keys(config.projects || {})) {
            const historyResponse = await fetch(`/api/v1/project/${serviceName}/history?limit=3`);
            if (historyResponse.ok) {
                const history = await historyResponse.json();
                history.forEach(job => {
                    allActivities.push({
                        ...job,
                        service: serviceName
                    });
                });
            }
        }
        
        // 시간순 정렬
        allActivities.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
        
        // 최근 5개만 표시
        const recentActivities = allActivities.slice(0, 5);
        const activitiesDiv = document.getElementById('recent-activities');
        
        if (recentActivities.length === 0) {
            activitiesDiv.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">활동 기록이 없습니다</p>';
            return;
        }
        
        activitiesDiv.innerHTML = recentActivities.map(activity => {
            const statusIcon = activity.status === 'completed' ? '✅' : 
                             activity.status === 'failed' ? '❌' : '⏳';
            const timeAgo = getRelativeTime(new Date(activity.started_at));
            
            return `
                <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div class="flex items-center gap-2">
                        <span class="text-sm">${statusIcon}</span>
                        <span class="text-sm text-gray-700">${activity.service}</span>
                    </div>
                    <span class="text-xs text-gray-500">${timeAgo}</span>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('최근 활동 로드 실패:', error);
    }
}

// 상대 시간 계산
function getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
}

// 페이지 로드 시 서비스 목록 불러오기
document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadRecentActivities();
    
    // 실시간 배포 이벤트 연결
    connectDeployEvents();
    
    // 활성 배포 상태 확인
    updateActiveDeployments();
    
    // 30초마다 자동 새로고침
    setInterval(loadServices, 30000);
    setInterval(loadRecentActivities, 30000);
    
    // 서비스 추가 폼 이벤트 리스너
    const addServiceForm = document.getElementById('add-service-form');
    if (addServiceForm) {
        addServiceForm.addEventListener('submit', handleAddService);
    }
    
    // 모달 외부 클릭 시 닫기
    const modal = document.getElementById('add-service-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'add-service-modal') {
                hideAddServiceModal();
            }
        });
    }
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideAddServiceModal();
        }
    });
});