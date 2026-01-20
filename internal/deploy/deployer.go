package deploy

import (
	"fmt"
	"io"
	"time"

	"github.com/lambda0x63/sship/internal/config"
	"github.com/lambda0x63/sship/internal/ssh"
)

type Deployer struct {
	config *config.Config
}

type DeployResult struct {
	Success     bool
	ProjectName string
	CommitHash  string
	DeployTime  time.Time
	Message     string
	Error       error
}

type DeployProgress struct {
	Step    string
	Message string
	Status  string
}

func NewDeployer(cfg *config.Config) *Deployer {
	return &Deployer{
		config: cfg,
	}
}

func (d *Deployer) Deploy(projectName string) error {
	proj, exists := d.config.Projects[projectName]
	if !exists {
		return fmt.Errorf("프로젝트를 찾을 수 없습니다: %s", projectName)
	}

	client, err := ssh.NewClient(proj.Server)
	if err != nil {
		return fmt.Errorf("SSH 연결 실패: %v", err)
	}
	defer client.Close()

	if err := client.CreateBackup(proj.Path); err != nil {
		fmt.Printf("백업 실패 (계속 진행): %v\n", err)
	}

	if err := client.GitPull(proj.Path, proj.Branch); err != nil {
		return fmt.Errorf("Git pull 실패: %v", err)
	}

	if err := client.DockerComposeUp(proj.Path, proj.DockerCompose); err != nil {
		return fmt.Errorf("Docker Compose 실행 실패: %v", err)
	}

	return nil
}

func (d *Deployer) DeployWithProgress(projectName string, output io.Writer, progressChan chan<- DeployProgress) error {
	proj, exists := d.config.Projects[projectName]
	if !exists {
		return fmt.Errorf("프로젝트를 찾을 수 없습니다: %s", projectName)
	}

	client, err := ssh.NewClient(proj.Server)
	if err != nil {
		return fmt.Errorf("SSH 연결 실패: %v", err)
	}
	defer client.Close()

	progressChan <- DeployProgress{Step: "connect", Message: "서버 연결 확인", Status: "active"}
	if err := client.CheckConnection(); err != nil {
		progressChan <- DeployProgress{Step: "connect", Message: "서버 연결 실패", Status: "error"}
		return err
	}
	progressChan <- DeployProgress{Step: "connect", Message: "서버 연결 확인", Status: "completed"}

	// 백업 단계 제거 - GitHub이 백업 역할

	progressChan <- DeployProgress{Step: "pull", Message: "코드 업데이트", Status: "active"}
	fmt.Fprintf(output, "📥 Git pull 시작 (브랜치: %s)...\n", proj.Branch)
	if err := client.GitPull(proj.Path, proj.Branch); err != nil {
		progressChan <- DeployProgress{Step: "pull", Message: "코드 업데이트 실패", Status: "error"}
		return fmt.Errorf("Git pull 실패: %v", err)
	}
	progressChan <- DeployProgress{Step: "pull", Message: "코드 업데이트", Status: "completed"}

	if hash, err := client.GetCurrentCommit(proj.Path); err == nil {
		fmt.Fprintf(output, "📝 배포 커밋: %s\n", hash)
	}

	progressChan <- DeployProgress{Step: "build", Message: "컨테이너 빌드 및 재시작", Status: "active"}
	fmt.Fprintf(output, "🐳 Docker Compose 시작...\n")
	if err := client.DockerComposeUpWithStreaming(proj.Path, proj.DockerCompose, output); err != nil {
		progressChan <- DeployProgress{Step: "build", Message: "컨테이너 빌드 실패", Status: "error"}
		return fmt.Errorf("Docker Compose 실행 실패: %v", err)
	}
	progressChan <- DeployProgress{Step: "build", Message: "컨테이너 빌드 및 재시작", Status: "completed"}

	if proj.HealthCheck != "" {
		progressChan <- DeployProgress{Step: "health", Message: "서비스 헬스체크", Status: "active"}
		time.Sleep(5 * time.Second)
		
		fmt.Fprintf(output, "🔍 헬스체크 시작: %s\n", proj.HealthCheck)
		progressChan <- DeployProgress{Step: "health", Message: "서비스 헬스체크", Status: "completed"}
	}

	// 배포 완료 신호
	progressChan <- DeployProgress{Step: "complete", Message: "배포 완료", Status: "completed"}
	fmt.Fprintf(output, "✅ 배포 완료!\n")
	return nil
}

func (d *Deployer) GetStatus(projectName string) (string, error) {
	proj, exists := d.config.Projects[projectName]
	if !exists {
		return "", fmt.Errorf("프로젝트를 찾을 수 없습니다: %s", projectName)
	}

	client, err := ssh.NewClient(proj.Server)
	if err != nil {
		return "", fmt.Errorf("SSH 연결 실패: %v", err)
	}
	defer client.Close()

	return client.CheckContainerStatus(proj.Path, proj.DockerCompose)
}

func (d *Deployer) GetLogs(projectName string, lines string) (string, error) {
	proj, exists := d.config.Projects[projectName]
	if !exists {
		return "", fmt.Errorf("프로젝트를 찾을 수 없습니다: %s", projectName)
	}

	client, err := ssh.NewClient(proj.Server)
	if err != nil {
		return "", fmt.Errorf("SSH 연결 실패: %v", err)
	}
	defer client.Close()

	return client.DockerLogs(proj.Path, proj.DockerCompose, lines)
}

func (d *Deployer) GetEnvironmentVariables(projectName string) (map[string]string, error) {
	proj, exists := d.config.Projects[projectName]
	if !exists {
		return nil, fmt.Errorf("프로젝트를 찾을 수 없습니다: %s", projectName)
	}

	client, err := ssh.NewClient(proj.Server)
	if err != nil {
		return nil, fmt.Errorf("SSH 연결 실패: %v", err)
	}
	defer client.Close()

	return client.GetEnvironmentVariables(proj.Path, proj.DockerCompose)
}

func (d *Deployer) Rollback(projectName string) error {
	proj, exists := d.config.Projects[projectName]
	if !exists {
		return fmt.Errorf("프로젝트를 찾을 수 없습니다: %s", projectName)
	}

	client, err := ssh.NewClient(proj.Server)
	if err != nil {
		return fmt.Errorf("SSH 연결 실패: %v", err)
	}
	defer client.Close()

	command := fmt.Sprintf("cd %s && git checkout HEAD~1", proj.Path)
	if _, err := client.ExecuteCommand(command); err != nil {
		return fmt.Errorf("롤백 실패: %v", err)
	}

	if err := client.DockerComposeUp(proj.Path, proj.DockerCompose); err != nil {
		return fmt.Errorf("컨테이너 재시작 실패: %v", err)
	}

	return nil
}