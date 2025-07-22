// 대시보드 JavaScript

async function loadProjects() {
    const grid = document.getElementById('projects-grid');
    
    try {
        const response = await fetch('/api/v1/projects');
        const projects = await response.json();
        
        grid.innerHTML = '';
        
        if (projects.length === 0) {
            grid.innerHTML = '<div class="text-center text-gray-500 py-10 col-span-full">등록된 프로젝트가 없습니다.</div>';
            return;
        }
        
        projects.forEach(project => {
            const card = createProjectCard(project);
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('프로젝트 로드 실패:', error);
        grid.innerHTML = '<div class="text-center text-gray-500 py-10 col-span-full">프로젝트 목록을 불러올 수 없습니다.</div>';
    }
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer hover:-translate-y-0.5 transform transition-transform';
    card.onclick = () => window.location.href = `/project/${project.name}`;
    
    const statusClass = getStatusClass(project.status);
    const statusText = getStatusText(project.status);
    const lastDeployText = formatLastDeploy(project.lastDeploy);
    
    card.innerHTML = `
        <div class="text-xl font-semibold mb-3">${project.name}</div>
        <div class="space-y-2">
            <div class="flex items-center gap-2 text-sm text-gray-600">
                <span>상태:</span>
                <span class="${statusClass}">${statusText}</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-600">
                <span>브랜치:</span>
                <span>${project.branch || 'main'}</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-600">
                <span>경로:</span>
                <span class="truncate">${project.path}</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-600">
                <span>마지막 배포:</span>
                <span>${lastDeployText}</span>
            </div>
        </div>
    `;
    
    return card;
}

function getStatusClass(status) {
    if (status && status.includes('running')) return 'inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800';
    if (status && status.includes('stopped')) return 'inline-block px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
    return 'inline-block px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
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

// 모달 관련 함수
function showAddProjectModal() {
    document.getElementById('add-project-modal').classList.remove('hidden');
    document.getElementById('add-project-form').reset();
}

function hideAddProjectModal() {
    document.getElementById('add-project-modal').classList.add('hidden');
}

// 프로젝트 추가 폼 처리
async function handleAddProject(e) {
    e.preventDefault();
    
    const projectName = document.getElementById('modal-project-name').value;
    const projectConfig = {
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
        const response = await fetch(`/api/v1/project/${projectName}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectConfig)
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            hideAddProjectModal();
            loadProjects(); // 프로젝트 목록 새로고침
            alert('프로젝트가 추가되었습니다!');
        } else {
            alert('프로젝트 추가 실패: ' + (result.error || result.message));
        }
    } catch (error) {
        alert('프로젝트 추가 중 오류 발생: ' + error.message);
    }
}

// 페이지 로드 시 프로젝트 목록 불러오기
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    
    // 30초마다 자동 새로고침
    setInterval(loadProjects, 30000);
    
    // 프로젝트 추가 폼 이벤트 리스너
    const addProjectForm = document.getElementById('add-project-form');
    if (addProjectForm) {
        addProjectForm.addEventListener('submit', handleAddProject);
    }
    
    // 모달 외부 클릭 시 닫기
    document.getElementById('add-project-modal').addEventListener('click', (e) => {
        if (e.target.id === 'add-project-modal') {
            hideAddProjectModal();
        }
    });
});