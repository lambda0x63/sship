package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/lambda0x63/sship/internal/ssh"
	"gopkg.in/yaml.v3"
)

type ServerConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	User     string `yaml:"user"`
	Password string `yaml:"password"`
}

type ProjectConfig struct {
	Project struct {
		Name        string       `yaml:"name"`
		Type        string       `yaml:"type"`
		Repository  string       `yaml:"repository"`
		Domain      string       `yaml:"domain"`
		Path        string       `yaml:"path"`
		Branch      string       `yaml:"branch"`
		ComposeFile string       `yaml:"compose_file"`
		Server      ServerConfig `yaml:"server"`
	} `yaml:"project"`
}

type Project struct {
	Server        ssh.ConnectionConfig `yaml:"server"`
	Path          string               `yaml:"path"`
	Branch        string               `yaml:"branch"`
	DockerCompose string               `yaml:"docker_compose"`
	HealthCheck   string               `yaml:"health_check"`
	EnvFile       string               `yaml:"env_file"`
	Port          int                  `yaml:"port"`
}

type Config struct {
	Projects map[string]Project `yaml:"projects"`
	filePath string
}

func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("설정 파일을 읽을 수 없습니다: %v", err)
	}

	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("설정 파일 파싱 실패: %v", err)
	}

	config.filePath = path

	for name, proj := range config.Projects {
		if proj.Server.Port == 0 {
			proj.Server.Port = 22
		}
		if proj.Branch == "" {
			proj.Branch = "main"
		}
		if proj.DockerCompose == "" {
			proj.DockerCompose = "docker-compose.yml"
		}
		config.Projects[name] = proj
	}

	return &config, nil
}

func LoadServerConfig() (*ServerConfig, error) {
	configPath := "configs/server.yaml"

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("서버 설정 파일을 읽을 수 없습니다: %v", err)
	}

	var config ServerConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("서버 설정 파일 파싱 실패: %v", err)
	}

	if config.Port == 0 {
		config.Port = 22
	}

	return &config, nil
}

func LoadProjectConfig(projectName string) (*ProjectConfig, error) {
	configPath := filepath.Join("configs/projects", projectName+".yaml")

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("프로젝트 설정 파일을 찾을 수 없습니다: %s", configPath)
	}

	var config ProjectConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("프로젝트 설정 파일 파싱 실패: %v", err)
	}

	return &config, nil
}

func GetAvailableProjects() ([]string, error) {
	projectsDir := "configs/projects"

	files, err := os.ReadDir(projectsDir)
	if err != nil {
		return nil, fmt.Errorf("프로젝트 디렉토리를 읽을 수 없습니다: %v", err)
	}

	var projects []string
	for _, file := range files {
		if !file.IsDir() && filepath.Ext(file.Name()) == ".yaml" {
			name := file.Name()[:len(file.Name())-5]
			projects = append(projects, name)
		}
	}

	return projects, nil
}

func ValidateConfig(projectName string) error {
	projectConfig, err := LoadProjectConfig(projectName)
	if err != nil {
		return fmt.Errorf("프로젝트 설정 오류: %v", err)
	}

	if projectConfig.Project.Name == "" {
		return fmt.Errorf("프로젝트 이름이 설정되지 않았습니다")
	}

	if projectConfig.Project.Path == "" {
		return fmt.Errorf("프로젝트 경로가 설정되지 않았습니다")
	}

	if projectConfig.Project.ComposeFile == "" {
		return fmt.Errorf("Docker Compose 파일이 설정되지 않았습니다")
	}

	if projectConfig.Project.Server.Host == "" {
		return fmt.Errorf("서버 호스트가 설정되지 않았습니다")
	}

	if projectConfig.Project.Server.User == "" {
		return fmt.Errorf("서버 사용자가 설정되지 않았습니다")
	}

	if projectConfig.Project.Server.Port == 0 {
		projectConfig.Project.Server.Port = 22
	}

	return nil
}

func (c *Config) Save() error {
	data, err := yaml.Marshal(c)
	if err != nil {
		return fmt.Errorf("설정 직렬화 실패: %v", err)
	}

	if err := os.WriteFile(c.filePath, data, 0644); err != nil {
		return fmt.Errorf("설정 파일 저장 실패: %v", err)
	}

	return nil
}

func (c *Config) SetFilePath(path string) {
	c.filePath = path
}
