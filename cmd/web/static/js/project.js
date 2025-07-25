// Alpine.js Project Application
function projectApp(projectName) {
    return {
        projectName: projectName,
        projectInfo: null,
        containerStatus: null,
        currentCommit: null,
        loadingStatus: true,
        statusError: null,
        deploying: false,
        deploySteps: [
            { name: 'SSH 연결 중...', status: 'pending' },
            { name: 'Git Pull 실행 중...', status: 'pending' },
            { name: 'Docker Compose Down...', status: 'pending' },
            { name: 'Docker Compose Up...', status: 'pending' },
            { name: '헬스체크 확인 중...', status: 'pending' }
        ],
        showLogs: false,
        logs: '',
        showEnvVars: false,
        envVars: null,
        loadingEnvVars: false,
        ws: null,

        async init() {
            await this.loadProjectStatus();
            // 30초마다 상태 업데이트
            setInterval(() => {
                if (!this.deploying) {
                    this.loadProjectStatus();
                }
            }, 30000);
        },

        async loadProjectStatus() {
            this.loadingStatus = true;
            this.statusError = null;

            try {
                const response = await fetch(`/api/v1/project/${this.projectName}/status`);
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || '상태를 가져올 수 없습니다');
                }

                const data = await response.json();
                this.projectInfo = data.project;
                this.containerStatus = data.status;
                this.currentCommit = data.currentCommit;
            } catch (error) {
                this.statusError = error.message;
                console.error('상태 로드 실패:', error);
            } finally {
                this.loadingStatus = false;
            }
        },

        async deploy() {
            if (this.deploying) return;

            if (!confirm('서비스를 배포하시겠습니까?')) return;

            this.deploying = true;
            this.resetDeploySteps();
            this.connectWebSocket();
        },

        connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/logs/${this.projectName}`;
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket 연결됨');
                this.logs = '';
                this.showLogs = true;
            };
            
            this.ws.onmessage = (event) => {
                this.logs += event.data;
                
                // 로그에서 진행 상황 파악
                if (event.data.includes('[PROGRESS]')) {
                    this.updateDeployProgress(event.data);
                } else if (event.data.includes('[COMPLETE]')) {
                    this.deployComplete(true);
                } else if (event.data.includes('[ERROR]')) {
                    this.deployComplete(false);
                }
                
                // 로그 스크롤
                this.$nextTick(() => {
                    const logContainer = document.querySelector('.bg-gray-900');
                    if (logContainer) {
                        logContainer.scrollTop = logContainer.scrollHeight;
                    }
                });
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket 오류:', error);
                this.deployComplete(false);
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket 연결 종료');
            };
        },

        updateDeployProgress(message) {
            // [PROGRESS] step|status|message 형식 파싱
            const match = message.match(/\[PROGRESS\]\s*([^|]+)\|([^|]+)\|(.+)/);
            if (match) {
                const [, step, status] = match;
                const stepMap = {
                    'connect': 0,
                    'pull': 1,
                    'down': 2,
                    'up': 3,
                    'health': 4
                };
                
                const stepIndex = stepMap[step];
                if (stepIndex !== undefined) {
                    // 현재 단계 업데이트
                    this.deploySteps[stepIndex].status = status === 'success' ? 'completed' : 'running';
                    
                    // 이전 단계들은 completed로
                    for (let i = 0; i < stepIndex; i++) {
                        this.deploySteps[i].status = 'completed';
                    }
                }
            }
        },

        deployComplete(success) {
            this.deploying = false;
            if (this.ws) {
                this.ws.close();
            }
            
            // 모든 단계 완료 표시
            if (success) {
                this.deploySteps.forEach(step => step.status = 'completed');
            }
            
            // 2초 후 상태 새로고침
            setTimeout(() => {
                this.loadProjectStatus();
            }, 2000);
        },

        resetDeploySteps() {
            this.deploySteps.forEach(step => step.status = 'pending');
        },

        toggleLogs() {
            this.showLogs = !this.showLogs;
            if (this.showLogs && !this.logs) {
                this.loadLogs();
            }
        },

        async loadLogs() {
            try {
                const response = await fetch(`/api/v1/project/${this.projectName}/logs?lines=100`);
                const data = await response.json();
                this.logs = data.logs || '로그가 없습니다';
            } catch (error) {
                this.logs = '로그를 가져올 수 없습니다: ' + error.message;
            }
        },

        async toggleEnvVars() {
            this.showEnvVars = !this.showEnvVars;
            if (this.showEnvVars && !this.envVars) {
                await this.loadEnvVars();
            }
        },

        async loadEnvVars() {
            this.loadingEnvVars = true;
            try {
                const response = await fetch(`/api/v1/project/${this.projectName}/environment`);
                const data = await response.json();
                
                // environment는 key-value 객체로 반환됨
                if (data.environment && Object.keys(data.environment).length > 0) {
                    // 환경변수를 key=value 형태로 변환
                    this.envVars = Object.entries(data.environment)
                        .map(([key, value]) => `${key}=${value}`)
                        .sort()
                        .join('\n');
                } else {
                    this.envVars = null;
                }
            } catch (error) {
                this.envVars = '환경 변수를 가져올 수 없습니다: ' + error.message;
            } finally {
                this.loadingEnvVars = false;
            }
        },

        async copyEnvVars() {
            if (!this.envVars) {
                await this.loadEnvVars();
            }
            
            if (this.envVars) {
                navigator.clipboard.writeText(this.envVars)
                    .then(() => alert('환경 변수가 클립보드에 복사되었습니다'))
                    .catch(() => alert('복사에 실패했습니다'));
            }
        },

        async deleteService() {
            if (!confirm(`정말로 "${this.projectName}" 서비스를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
                return;
            }

            try {
                const response = await fetch(`/api/v1/project/${this.projectName}`, {
                    method: 'DELETE'
                });

                const result = await response.json();
                
                if (response.ok && result.success) {
                    alert('서비스가 삭제되었습니다');
                    window.location.href = '/';
                } else {
                    alert('서비스 삭제 실패: ' + (result.error || result.message));
                }
            } catch (error) {
                alert('서비스 삭제 중 오류 발생: ' + error.message);
            }
        },

        formatLastDeploy(timestamp) {
            if (!timestamp || timestamp === '0001-01-01T00:00:00Z') {
                return '배포 기록 없음';
            }
            
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return '방금 전';
            if (minutes < 60) return `${minutes}분 전`;
            if (hours < 24) return `${hours}시간 전`;
            if (days < 7) return `${days}일 전`;
            
            return date.toLocaleDateString('ko-KR');
        }
    };
}