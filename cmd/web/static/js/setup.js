document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('setup-form');
    const testBtn = document.getElementById('test-connection');
    const connectionResult = document.getElementById('connection-result');

    // 연결 테스트
    testBtn.addEventListener('click', async function() {
        const server = {
            host: document.getElementById('host').value,
            port: parseInt(document.getElementById('port').value),
            user: document.getElementById('user').value,
            password: document.getElementById('password').value
        };

        if (!server.host || !server.user || !server.password) {
            showConnectionResult(false, '모든 연결 정보를 입력해주세요');
            return;
        }

        testBtn.disabled = true;
        testBtn.textContent = '연결 테스트 중...';

        try {
            const response = await fetch('/api/v1/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(server)
            });

            const result = await response.json();
            showConnectionResult(result.success, result.message);
        } catch (error) {
            showConnectionResult(false, '연결 테스트 실패: ' + error.message);
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = '연결 테스트';
        }
    });

    // 폼 제출
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const projectName = document.getElementById('project-name').value;
        const projectConfig = {
            server: {
                host: document.getElementById('host').value,
                port: parseInt(document.getElementById('port').value),
                user: document.getElementById('user').value,
                password: document.getElementById('password').value
            },
            path: document.getElementById('path').value,
            branch: document.getElementById('branch').value,
            docker_compose: document.getElementById('docker-compose').value,
            health_check: document.getElementById('health-check').value
        };

        try {
            const response = await fetch(`/api/v1/project/${projectName}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectConfig)
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                // 대시보드로 이동
                window.location.href = '/';
            } else {
                alert('프로젝트 생성 실패: ' + (result.error || result.message));
            }
        } catch (error) {
            alert('프로젝트 생성 중 오류 발생: ' + error.message);
        }
    });

    function showConnectionResult(success, message) {
        connectionResult.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
        
        if (success) {
            connectionResult.classList.add('bg-green-100', 'text-green-800');
        } else {
            connectionResult.classList.add('bg-red-100', 'text-red-800');
        }
        
        connectionResult.textContent = message;
    }
});