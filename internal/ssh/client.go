package ssh

import (
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"
)

type Client struct {
	client *ssh.Client
	config *ssh.ClientConfig
	host   string
	port   int
}

type ConnectionConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"-"`
}

func NewClient(config ConnectionConfig) (*Client, error) {
	sshConfig := &ssh.ClientConfig{
		User: config.User,
		Auth: []ssh.AuthMethod{
			ssh.Password(config.Password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", config.Host, config.Port)

	client, err := ssh.Dial("tcp", addr, sshConfig)
	if err != nil {
		return nil, fmt.Errorf("SSH 연결 실패: %v", err)
	}

	return &Client{
		client: client,
		config: sshConfig,
		host:   config.Host,
		port:   config.Port,
	}, nil
}

func (c *Client) ExecuteCommand(command string) (string, error) {
	session, err := c.client.NewSession()
	if err != nil {
		return "", fmt.Errorf("세션 생성 실패: %v", err)
	}
	defer session.Close()

	output, err := session.CombinedOutput(command)
	if err != nil {
		return string(output), fmt.Errorf("명령어 실행 실패: %v\n출력: %s", err, string(output))
	}

	return string(output), nil
}

func (c *Client) ExecuteCommands(commands []string) ([]string, error) {
	var results []string

	for i, command := range commands {
		fmt.Printf("  [%d/%d] %s\n", i+1, len(commands), command)

		output, err := c.ExecuteCommand(command)
		if err != nil {
			return results, fmt.Errorf("명령어 실행 실패 (단계 %d): %v", i+1, err)
		}

		results = append(results, strings.TrimSpace(output))
	}

	return results, nil
}

func (c *Client) CheckConnection() error {
	_, err := c.ExecuteCommand("echo 'connection test'")
	return err
}

func (c *Client) GetDockerContainerStatus(containerName string) (string, error) {
	command := fmt.Sprintf("docker ps --filter name=%s --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'", containerName)
	return c.ExecuteCommand(command)
}

func (c *Client) GetDockerLogs(containerName string, lines int) (string, error) {
	command := fmt.Sprintf("docker logs --tail %d %s", lines, containerName)
	return c.ExecuteCommand(command)
}

func (c *Client) CheckServiceHealth(url string) (string, error) {
	command := fmt.Sprintf("curl -s -o /dev/null -w '%%{http_code}' %s || echo 'connection_failed'", url)
	return c.ExecuteCommand(command)
}

func (c *Client) Close() error {
	if c.client != nil {
		return c.client.Close()
	}
	return nil
}

func (c *Client) GitPull(projectPath string, branch string) error {
	if !isValidPath(projectPath) || !isValidBranch(branch) {
		return fmt.Errorf("유효하지 않은 프로젝트 경로 또는 브랜치명입니다")
	}
	// 그냥 git pull을 하자. 심플하게.
	command := fmt.Sprintf("cd %s && git pull origin %s", projectPath, branch)

	_, err := c.ExecuteCommand(command)
	if err != nil {
		// pull 실패시 한번 더 시도 (force로)
		forceCommand := fmt.Sprintf("cd %s && git fetch origin && git reset --hard origin/%s",
			projectPath, branch)
		_, err = c.ExecuteCommand(forceCommand)
	}

	return err
}

func (c *Client) DockerComposeUp(projectPath string, composeFile string) error {
	if !isValidPath(projectPath) || !isValidPath(composeFile) {
		return fmt.Errorf("유효하지 않은 경로 또는 파일명입니다")
	}
	// Docker Compose가 알아서 처리
	command := fmt.Sprintf("cd %s && docker compose -f %s up -d --build",
		projectPath, composeFile)

	_, err := c.ExecuteCommand(command)
	return err
}

func (c *Client) DockerComposeDown(projectPath string, composeFile string) error {
	if !isValidPath(projectPath) || !isValidPath(composeFile) {
		return fmt.Errorf("유효하지 않은 경로 또는 파일명입니다")
	}
	command := fmt.Sprintf("cd %s && docker compose -f %s down",
		projectPath, composeFile)

	_, err := c.ExecuteCommand(command)
	return err
}

func (c *Client) GetGitCommitHash(projectPath string) (string, error) {
	if !isValidPath(projectPath) {
		return "", fmt.Errorf("유효하지 않은 프로젝트 경로입니다")
	}
	command := fmt.Sprintf("cd %s && git rev-parse --short HEAD", projectPath)
	output, err := c.ExecuteCommand(command)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(output), nil
}

func (c *Client) CreateBackup(projectPath string) error {
	if !isValidPath(projectPath) {
		return fmt.Errorf("유효하지 않은 프로젝트 경로입니다")
	}
	timestamp := time.Now().Format("20060102-150405")
	command := fmt.Sprintf("cd %s && git rev-parse HEAD > .last_deploy_commit && echo %s > .backup_timestamp",
		projectPath, timestamp)

	_, err := c.ExecuteCommand(command)
	return err
}

func (c *Client) ExecuteCommandWithStreaming(command string, output io.Writer) error {
	session, err := c.client.NewSession()
	if err != nil {
		return fmt.Errorf("세션 생성 실패: %v", err)
	}
	defer session.Close()

	session.Stdout = output
	session.Stderr = output

	return session.Run(command)
}

func (c *Client) DockerComposeUpWithStreaming(projectPath string, composeFile string, output io.Writer) error {
	if !isValidPath(projectPath) || !isValidPath(composeFile) {
		return fmt.Errorf("유효하지 않은 경로 또는 파일명입니다")
	}
	// 파일 존재 확인
	fmt.Fprintf(output, "📋 Docker Compose 파일 확인...\n")
	checkCmd := fmt.Sprintf("cd %s && ls -la %s", projectPath, composeFile)
	c.ExecuteCommandWithStreaming(checkCmd, output)

	// 기존 컨테이너 확인
	fmt.Fprintf(output, "\n🔍 기존 컨테이너 확인...\n")
	psCmd := fmt.Sprintf("cd %s && docker compose -f %s ps", projectPath, composeFile)
	c.ExecuteCommandWithStreaming(psCmd, output)

	// 안전하게 기존 스택 정리
	fmt.Fprintf(output, "\n🧹 기존 스택 정리...\n")
	downCmd := fmt.Sprintf("cd %s && docker compose -f %s down --remove-orphans",
		projectPath, composeFile)

	if err := c.ExecuteCommandWithStreaming(downCmd, output); err != nil {
		fmt.Fprintf(output, "⚠️ Docker Compose down 실패: %v\n", err)

		// 프로젝트명 기반으로 컨테이너 직접 제거 시도
		fmt.Fprintf(output, "🔧 컨테이너 직접 제거 시도...\n")
		projectName := filepath.Base(projectPath)
		removeCmd := fmt.Sprintf("docker ps -a --filter 'name=%s' -q | xargs -r docker rm -f", projectName)
		c.ExecuteCommandWithStreaming(removeCmd, output)
	}

	fmt.Fprintf(output, "\n🚀 새로운 스택 빌드 및 시작...\n")
	upCmd := fmt.Sprintf("cd %s && docker compose -f %s up -d --build",
		projectPath, composeFile)

	return c.ExecuteCommandWithStreaming(upCmd, output)
}

func (c *Client) CheckContainerStatus(projectPath string, composeFile string) (string, error) {
	if !isValidPath(projectPath) || !isValidPath(composeFile) {
		return "unknown", fmt.Errorf("유효하지 않은 경로 또는 파일명입니다")
	}
	command := fmt.Sprintf("cd %s && docker compose -f %s ps --format json", projectPath, composeFile)
	output, err := c.ExecuteCommand(command)
	if err != nil {
		return "unknown", err
	}

	if strings.Contains(output, "running") {
		return "running", nil
	} else if strings.Contains(output, "exited") || strings.Contains(output, "stopped") {
		return "stopped", nil
	}

	return "unknown", nil
}

func (c *Client) GetCurrentCommit(projectPath string) (string, error) {
	if !isValidPath(projectPath) {
		return "unknown", nil
	}
	// 커밋 해시와 메시지를 함께 가져오기
	command := fmt.Sprintf("cd %s && git log -1 --pretty=format:'%%h|%%s' 2>/dev/null || echo 'unknown|'", projectPath)
	output, err := c.ExecuteCommand(command)
	if err != nil {
		return "unknown", nil
	}
	return strings.TrimSpace(output), nil
}

func (c *Client) GetLastDeployTime(projectPath string) (time.Time, error) {
	if !isValidPath(projectPath) {
		return time.Time{}, nil
	}
	command := fmt.Sprintf("cd %s && cat .backup_timestamp 2>/dev/null || echo ''", projectPath)
	output, err := c.ExecuteCommand(command)
	if err != nil || strings.TrimSpace(output) == "" {
		return time.Time{}, nil
	}

	return time.Parse("20060102-150405", strings.TrimSpace(output))
}

func (c *Client) DockerLogs(projectPath string, composeFile string, lines string) (string, error) {
	if !isValidPath(projectPath) || !isValidPath(composeFile) {
		return "", fmt.Errorf("유효하지 않은 경로 또는 파일명입니다")
	}
	command := fmt.Sprintf("cd %s && docker compose -f %s logs --tail %s",
		projectPath, composeFile, lines)
	return c.ExecuteCommand(command)
}

// 유효한 경로 이름인지 확인 (커맨드 인젝션 방지)
func isValidPath(path string) bool {
	if path == "" {
		return false
	}
	// 경로에 세미콜론, 앰퍼샌드, 파이프 등 위험한 문자 금지
	dangerChars := []string{";", "&", "|", ">", "<", "`", "$", "(", ")"}
	for _, char := range dangerChars {
		if strings.Contains(path, char) {
			return false
		}
	}
	return true
}

func isValidBranch(branch string) bool {
	if branch == "" {
		return false
	}
	// 브랜치명에는 공백이나 위험한 문자 금지
	dangerChars := []string{" ", ";", "&", "|", ">", "<", "`", "$", "(", ")", "*", "?", "[", "]", "{", "}"}
	for _, char := range dangerChars {
		if strings.Contains(branch, char) {
			return false
		}
	}
	return true
}
