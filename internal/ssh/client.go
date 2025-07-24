package ssh

import (
	"fmt"
	"io"
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
	Host     string
	Port     int
	User     string
	Password string
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
	// Docker Compose가 알아서 처리
	command := fmt.Sprintf("cd %s && docker compose -f %s up -d --build", 
		projectPath, composeFile)
	
	_, err := c.ExecuteCommand(command)
	return err
}

func (c *Client) DockerComposeDown(projectPath string, composeFile string) error {
	command := fmt.Sprintf("cd %s && docker compose -f %s down", 
		projectPath, composeFile)
	
	_, err := c.ExecuteCommand(command)
	return err
}

func (c *Client) GetGitCommitHash(projectPath string) (string, error) {
	command := fmt.Sprintf("cd %s && git rev-parse --short HEAD", projectPath)
	output, err := c.ExecuteCommand(command)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(output), nil
}

func (c *Client) CreateBackup(projectPath string) error {
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
	// 안전하게 기존 스택 정리 후 새로 시작
	fmt.Fprintf(output, "🧹 기존 스택 정리...\n")
	downCmd := fmt.Sprintf("cd %s && docker compose -f %s down --remove-orphans", 
		projectPath, composeFile)
	c.ExecuteCommandWithStreaming(downCmd, output)
	
	fmt.Fprintf(output, "🚀 새로운 스택 빌드 및 시작...\n")
	upCmd := fmt.Sprintf("cd %s && docker compose -f %s up -d --build", 
		projectPath, composeFile)
	
	return c.ExecuteCommandWithStreaming(upCmd, output)
}

func (c *Client) CheckContainerStatus(projectPath string, composeFile string) (string, error) {
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
	command := fmt.Sprintf("cd %s && git rev-parse --short HEAD 2>/dev/null || echo 'unknown'", projectPath)
	output, err := c.ExecuteCommand(command)
	if err != nil {
		return "unknown", nil
	}
	return strings.TrimSpace(output), nil
}

func (c *Client) GetLastDeployTime(projectPath string) (time.Time, error) {
	command := fmt.Sprintf("cd %s && cat .backup_timestamp 2>/dev/null || echo ''")
	output, err := c.ExecuteCommand(command)
	if err != nil || strings.TrimSpace(output) == "" {
		return time.Time{}, nil
	}
	
	return time.Parse("20060102-150405", strings.TrimSpace(output))
}

func (c *Client) DockerLogs(projectPath string, composeFile string, lines string) (string, error) {
	command := fmt.Sprintf("cd %s && docker compose -f %s logs --tail %s", 
		projectPath, composeFile, lines)
	return c.ExecuteCommand(command)
}
