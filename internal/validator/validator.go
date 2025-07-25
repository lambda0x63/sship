package validator

import (
	"fmt"
	"strings"

	"github.com/lambda0x63/sship/internal/config"
	"github.com/lambda0x63/sship/internal/ssh"
)

type ValidationResult struct {
	Passed   bool
	Checks   []CheckResult
	Warnings []string
	Errors   []string
}

type CheckResult struct {
	Name    string
	Passed  bool
	Message string
}

type PreDeployValidator struct {
	config *config.Config
}

func NewPreDeployValidator(cfg *config.Config) *PreDeployValidator {
	return &PreDeployValidator{
		config: cfg,
	}
}

func (v *PreDeployValidator) Validate(projectName string) (*ValidationResult, error) {
	proj, exists := v.config.Projects[projectName]
	if !exists {
		return nil, fmt.Errorf("프로젝트를 찾을 수 없습니다: %s", projectName)
	}

	client, err := ssh.NewClient(proj.Server)
	if err != nil {
		return nil, fmt.Errorf("SSH 연결 실패: %v", err)
	}
	defer client.Close()

	result := &ValidationResult{
		Passed:   true,
		Checks:   []CheckResult{},
		Warnings: []string{},
		Errors:   []string{},
	}

	check := v.checkSSHConnection(client)
	result.Checks = append(result.Checks, check)
	if !check.Passed {
		result.Passed = false
		result.Errors = append(result.Errors, check.Message)
		return result, nil
	}

	check = v.checkGitRepository(client, proj.Path)
	result.Checks = append(result.Checks, check)
	if !check.Passed {
		result.Passed = false
		result.Errors = append(result.Errors, check.Message)
	}

	check = v.checkRequiredFiles(client, proj)
	result.Checks = append(result.Checks, check)
	if !check.Passed {
		result.Passed = false
		result.Errors = append(result.Errors, check.Message)
	}

	check = v.checkDockerStatus(client)
	result.Checks = append(result.Checks, check)
	if !check.Passed {
		result.Passed = false
		result.Errors = append(result.Errors, check.Message)
	}

	check = v.checkDiskSpace(client, proj.Path)
	result.Checks = append(result.Checks, check)
	if !check.Passed {
		result.Warnings = append(result.Warnings, check.Message)
	}

	if proj.Port > 0 {
		check = v.checkPortAvailability(client, proj.Port)
		result.Checks = append(result.Checks, check)
		if !check.Passed {
			result.Warnings = append(result.Warnings, check.Message)
		}
	}

	return result, nil
}

func (v *PreDeployValidator) checkSSHConnection(client *ssh.Client) CheckResult {
	err := client.CheckConnection()
	if err != nil {
		return CheckResult{
			Name:    "SSH 연결",
			Passed:  false,
			Message: fmt.Sprintf("SSH 연결 실패: %v", err),
		}
	}
	return CheckResult{
		Name:    "SSH 연결",
		Passed:  true,
		Message: "SSH 연결 성공",
	}
}

func (v *PreDeployValidator) checkGitRepository(client *ssh.Client, projectPath string) CheckResult {
	command := fmt.Sprintf("cd %s && git status --porcelain 2>&1", projectPath)
	output, err := client.ExecuteCommand(command)
	
	if err != nil {
		if strings.Contains(err.Error(), "not a git repository") {
			return CheckResult{
				Name:    "Git 저장소",
				Passed:  false,
				Message: "Git 저장소가 아닙니다",
			}
		}
		return CheckResult{
			Name:    "Git 저장소",
			Passed:  false,
			Message: fmt.Sprintf("Git 상태 확인 실패: %v", err),
		}
	}

	if strings.TrimSpace(output) != "" {
		return CheckResult{
			Name:    "Git 저장소",
			Passed:  true,
			Message: "경고: 커밋되지 않은 변경사항이 있습니다",
		}
	}

	return CheckResult{
		Name:    "Git 저장소",
		Passed:  true,
		Message: "Git 저장소 정상",
	}
}

func (v *PreDeployValidator) checkRequiredFiles(client *ssh.Client, proj config.Project) CheckResult {
	requiredFiles := []string{
		proj.DockerCompose,
	}

	if proj.EnvFile != "" {
		requiredFiles = append(requiredFiles, proj.EnvFile)
	}

	var missingFiles []string
	for _, file := range requiredFiles {
		command := fmt.Sprintf("cd %s && test -f %s", proj.Path, file)
		_, err := client.ExecuteCommand(command)
		if err != nil {
			missingFiles = append(missingFiles, file)
		}
	}

	if len(missingFiles) > 0 {
		return CheckResult{
			Name:    "필수 파일",
			Passed:  false,
			Message: fmt.Sprintf("필수 파일 누락: %s", strings.Join(missingFiles, ", ")),
		}
	}

	return CheckResult{
		Name:    "필수 파일",
		Passed:  true,
		Message: "모든 필수 파일 존재",
	}
}

func (v *PreDeployValidator) checkDockerStatus(client *ssh.Client) CheckResult {
	_, err := client.ExecuteCommand("docker info > /dev/null 2>&1")
	if err != nil {
		return CheckResult{
			Name:    "Docker",
			Passed:  false,
			Message: "Docker 데몬이 실행 중이지 않습니다",
		}
	}

	_, err = client.ExecuteCommand("docker compose version > /dev/null 2>&1")
	if err != nil {
		return CheckResult{
			Name:    "Docker",
			Passed:  false,
			Message: "Docker Compose가 설치되지 않았습니다",
		}
	}

	return CheckResult{
		Name:    "Docker",
		Passed:  true,
		Message: "Docker 및 Docker Compose 정상",
	}
}

func (v *PreDeployValidator) checkDiskSpace(client *ssh.Client, projectPath string) CheckResult {
	command := fmt.Sprintf("df -h %s | tail -1 | awk '{print $5}' | sed 's/%%//'", projectPath)
	output, err := client.ExecuteCommand(command)
	if err != nil {
		return CheckResult{
			Name:    "디스크 공간",
			Passed:  true,
			Message: "디스크 공간 확인 실패 (경고)",
		}
	}

	usage := strings.TrimSpace(output)
	if usage >= "90" {
		return CheckResult{
			Name:    "디스크 공간",
			Passed:  false,
			Message: fmt.Sprintf("디스크 사용률이 높습니다: %s%%", usage),
		}
	}

	return CheckResult{
		Name:    "디스크 공간",
		Passed:  true,
		Message: fmt.Sprintf("디스크 사용률: %s%%", usage),
	}
}

func (v *PreDeployValidator) checkPortAvailability(client *ssh.Client, port int) CheckResult {
	command := fmt.Sprintf("lsof -i:%d > /dev/null 2>&1", port)
	_, err := client.ExecuteCommand(command)
	
	if err != nil {
		return CheckResult{
			Name:    "포트 확인",
			Passed:  true,
			Message: fmt.Sprintf("포트 %d 사용 가능", port),
		}
	}

	return CheckResult{
		Name:    "포트 확인",
		Passed:  false,
		Message: fmt.Sprintf("포트 %d가 이미 사용 중입니다", port),
	}
}