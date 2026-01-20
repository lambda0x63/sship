// Alpine.js Dashboard Application
function dashboardApp() {
    return {
        services: [],
        loading: true,
        showModal: false,
        activeDeployments: {},
        deployEventSource: null,
        stats: {
            total: 0,
            active: 0,
            servers: 0
        },
        formData: {
            name: '',
            server: {
                host: '',
                port: 22,
                user: '',
                password: ''
            },
            path: '',
            branch: 'main',
            docker_compose: 'docker-compose.prod.yml',
            health_check: ''
        },

        async init() {
            await this.loadServices();
            this.loadActiveDeployments();
            this.startDeployEventListener();
            
            // 30초마다 서비스 목록 새로고침
            setInterval(() => this.loadServices(), 30000);
        },

        async loadServices() {
            try {
                const response = await fetch('/api/v1/projects');
                const data = await response.json();
                this.services = data || [];
                this.updateStats();
            } catch (error) {
                console.error('서비스 로드 실패:', error);
                this.services = [];
            } finally {
                this.loading = false;
            }
        },

        updateStats() {
            this.stats.total = this.services.length;
            this.stats.active = this.services.filter(s => s.status?.includes('running')).length;
            this.stats.servers = [...new Set(this.services.map(s => `${s.server?.host}:${s.server?.port}`))].length;
        },

        async loadActiveDeployments() {
            try {
                const response = await fetch('/api/v1/deploy/active');
                const jobs = await response.json();
                
                this.activeDeployments = {};
                if (jobs && Array.isArray(jobs)) {
                    jobs.forEach(job => {
                        if (job.projectName && job.status === 'running') {
                            this.activeDeployments[job.projectName] = job;
                        }
                    });
                }
            } catch (error) {
                console.error('활성 배포 로드 실패:', error);
            }
        },

        startDeployEventListener() {
            if (this.deployEventSource) {
                this.deployEventSource.close();
            }

            this.deployEventSource = new EventSource('/api/v1/deploy/events');
            
            this.deployEventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    switch(data.event) {
                        case 'deploy.started':
                            this.activeDeployments[data.projectName] = {
                                projectName: data.projectName,
                                status: 'running',
                                startTime: data.timestamp
                            };
                            break;
                        case 'deploy.completed':
                        case 'deploy.failed':
                            delete this.activeDeployments[data.projectName];
                            // 서비스 목록 새로고침
                            setTimeout(() => this.loadServices(), 2000);
                            break;
                    }
                } catch (error) {
                    console.error('이벤트 파싱 오류:', error);
                }
            };

            this.deployEventSource.onerror = (error) => {
                console.error('SSE 연결 오류:', error);
                setTimeout(() => this.startDeployEventListener(), 5000);
            };
        },

        async addService() {
            const projectData = {
                server: this.formData.server,
                path: this.formData.path,
                branch: this.formData.branch,
                docker_compose: this.formData.docker_compose,
                health_check: this.formData.health_check
            };

            try {
                const response = await fetch(`/api/v1/project/${this.formData.name}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(projectData)
                });

                const result = await response.json();
                
                if (response.ok && result.success) {
                    this.showModal = false;
                    this.resetForm();
                    await this.loadServices();
                } else {
                    alert('서비스 추가 실패: ' + (result.error || result.message));
                }
            } catch (error) {
                alert('서비스 추가 중 오류 발생: ' + error.message);
            }
        },

        resetForm() {
            this.formData = {
                name: '',
                server: {
                    host: '',
                    port: 22,
                    user: '',
                    password: ''
                },
                path: '',
                branch: 'main',
                docker_compose: 'docker-compose.prod.yml',
                health_check: ''
            };
        },

        getStatusText(status) {
            if (!status) return '알 수 없음';
            if (status.includes('running')) return '실행 중';
            if (status.includes('stopped')) return '중지됨';
            return status;
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