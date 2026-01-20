package ssh

import (
	"fmt"
	"strings"
)

// GetEnvironmentVariables Docker Compose 프로젝트의 환경변수를 조회합니다
func (c *Client) GetEnvironmentVariables(projectPath string, composeFile string) (map[string]string, error) {
	envVars := make(map[string]string)

	// 1. 간단하게 .env.production 파일 읽기
	command := fmt.Sprintf("cat %s/.env.production 2>/dev/null", projectPath)
	envOutput, err := c.ExecuteCommand(command)

	// 2. .env.production이 없으면 .env 시도
	if err != nil || envOutput == "" {
		command = fmt.Sprintf("cat %s/.env 2>/dev/null", projectPath)
		envOutput, _ = c.ExecuteCommand(command)
	}

	// 3. 환경변수 파싱
	if envOutput != "" {
		lines := strings.Split(envOutput, "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)

			// 주석이나 빈 줄 제외
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}

			// KEY=VALUE 형식 파싱
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				value := strings.TrimSpace(parts[1])

				// 따옴표 제거
				value = strings.Trim(value, "\"'")

				// 유효한 환경변수 이름인지 확인
				if isValidEnvVarName(key) {
					envVars[key] = value
				}
			}
		}
	}

	fmt.Printf("GetEnvironmentVariables: projectPath=%s, found %d variables\n", projectPath, len(envVars))

	return envVars, nil
}

// isValidEnvVarName 환경변수 이름이 유효한지 확인
func isValidEnvVarName(name string) bool {
	if name == "" {
		return false
	}

	for i, ch := range name {
		if i == 0 && (ch >= '0' && ch <= '9') {
			return false // 숫자로 시작하면 안됨
		}
		if !((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '_') {
			return false
		}
	}
	return true
}
