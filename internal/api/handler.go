package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/lambda0x63/sship/internal/config"
	"github.com/lambda0x63/sship/internal/deploy"
	"github.com/lambda0x63/sship/internal/ssh"
)

type Handler struct {
	config      *config.Config
	deployer    *deploy.Deployer
	deployQueue *deploy.DeployQueue
	upgrader    websocket.Upgrader
}

func NewHandler(cfg *config.Config) *Handler {
	deployer := deploy.NewDeployer(cfg)
	return &Handler{
		config:      cfg,
		deployer:    deployer,
		deployQueue: deploy.NewDeployQueue(deployer),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}
}

type ProjectInfo struct {
	Name        string               `json:"name"`
	Path        string               `json:"path"`
	Status      string               `json:"status"`
	LastDeploy  time.Time            `json:"lastDeploy"`
	Branch      string               `json:"branch"`
	HealthCheck string               `json:"healthCheck"`
	Server      ssh.ConnectionConfig `json:"server"`
}

type DeployRequest struct {
	Branch string `json:"branch"`
}

type DeployResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	JobID   string `json:"jobId"`
}

type ProjectConfig struct {
	Server        ssh.ConnectionConfig `json:"server"`
	Path          string              `json:"path"`
	Branch        string              `json:"branch"`
	DockerCompose string              `json:"docker_compose"`
	HealthCheck   string              `json:"health_check"`
}

func (h *Handler) ListProjects(c *gin.Context) {
	projects := make([]ProjectInfo, 0, len(h.config.Projects))
	
	for name, proj := range h.config.Projects {
		info := ProjectInfo{
			Name:        name,
			Path:        proj.Path,
			Branch:      proj.Branch,
			HealthCheck: proj.HealthCheck,
			Server:      proj.Server,
		}
		
		client, err := ssh.NewClient(proj.Server)
		if err == nil {
			defer client.Close()
			
			status, _ := client.CheckContainerStatus(proj.Path, proj.DockerCompose)
			info.Status = status
			
			lastDeployTime, _ := client.GetLastDeployTime(proj.Path)
			info.LastDeploy = lastDeployTime
		}
		
		projects = append(projects, info)
	}
	
	c.JSON(http.StatusOK, projects)
}

func (h *Handler) GetProjectStatus(c *gin.Context) {
	projectName := c.Param("name")
	
	proj, exists := h.config.Projects[projectName]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "프로젝트를 찾을 수 없습니다"})
		return
	}
	
	client, err := ssh.NewClient(proj.Server)
	if err != nil {
		fmt.Printf("SSH 연결 실패: %v\n", err)  
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("SSH 연결 실패: %v", err)})
		return
	}
	defer client.Close()
	
	status, err := client.CheckContainerStatus(proj.Path, proj.DockerCompose)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	currentCommit, _ := client.GetCurrentCommit(proj.Path)
	
	healthStatus := "unknown"
	if proj.HealthCheck != "" {
		resp, err := http.Get(proj.HealthCheck)
		if err == nil {
			healthStatus = fmt.Sprintf("HTTP %d", resp.StatusCode)
			resp.Body.Close()
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"status":       status,
		"commit":       currentCommit,
		"healthCheck":  healthStatus,
		"lastDeploy":   time.Now(),
		"branch":       proj.Branch,
	})
}

func (h *Handler) GetProjectEnvironment(c *gin.Context) {
	projectName := c.Param("name")
	
	envVars, err := h.deployer.GetEnvironmentVariables(projectName)
	if err != nil {
		fmt.Printf("GetProjectEnvironment error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	// envVars가 nil이거나 비어있는 경우 빈 맵으로 초기화
	if envVars == nil {
		envVars = make(map[string]string)
	}
	
	fmt.Printf("GetProjectEnvironment: returning %d environment variables\n", len(envVars))
	
	c.JSON(http.StatusOK, gin.H{
		"environment": envVars,
	})
}

func (h *Handler) DeployProject(c *gin.Context) {
	projectName := c.Param("name")
	
	var req DeployRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "잘못된 요청"})
		return
	}
	
	// 배포 큐에 추가
	job, err := h.deployQueue.Enqueue(projectName, req.Branch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "배포 작업 추가 실패"})
		return
	}
	
	c.JSON(http.StatusOK, DeployResponse{
		Success: true,
		Message: "배포가 시작되었습니다",
		JobID:   job.ID,
	})
}

func (h *Handler) GetProjectLogs(c *gin.Context) {
	projectName := c.Param("name")
	lines := c.DefaultQuery("lines", "100")
	
	proj, exists := h.config.Projects[projectName]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "프로젝트를 찾을 수 없습니다"})
		return
	}
	
	client, err := ssh.NewClient(proj.Server)
	if err != nil {
		fmt.Printf("SSH 연결 실패: %v\n", err)  
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("SSH 연결 실패: %v", err)})
		return
	}
	defer client.Close()
	
	logs, err := client.DockerLogs(proj.Path, proj.DockerCompose, lines)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"logs": logs,
	})
}

func (h *Handler) RollbackProject(c *gin.Context) {
	projectName := c.Param("name")
	
	go func() {
		err := h.deployer.Rollback(projectName)
		if err != nil {
			fmt.Printf("롤백 실패: %v\n", err)
		}
	}()
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "롤백이 시작되었습니다",
	})
}

func (h *Handler) StreamLogs(c *gin.Context) {
	projectName := c.Param("name")
	
	_, exists := h.config.Projects[projectName]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "프로젝트를 찾을 수 없습니다"})
		return
	}
	
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	
	// WebSocket 쓰기 동기화를 위한 mutex
	var mu sync.Mutex
	logWriter := &WebSocketWriter{conn: conn, mu: &mu}
	
	progressChan := make(chan deploy.DeployProgress, 10)
	defer close(progressChan)
	
	go func() {
		for progress := range progressChan {
			msg := fmt.Sprintf("[PROGRESS] %s|%s|%s", progress.Step, progress.Status, progress.Message)
			mu.Lock()
			conn.WriteMessage(websocket.TextMessage, []byte(msg))
			mu.Unlock()
		}
	}()
	
	err = h.deployer.DeployWithProgress(projectName, logWriter, progressChan)
	if err != nil {
		mu.Lock()
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("[ERROR] %v", err)))
		mu.Unlock()
	} else {
		mu.Lock()
		conn.WriteMessage(websocket.TextMessage, []byte("[COMPLETE] 배포가 완료되었습니다"))
		mu.Unlock()
	}
}

type WebSocketWriter struct {
	conn *websocket.Conn
	mu   *sync.Mutex
}

func (w *WebSocketWriter) Write(p []byte) (n int, err error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	
	err = w.conn.WriteMessage(websocket.TextMessage, p)
	if err != nil {
		return 0, err
	}
	return len(p), nil
}

func (h *Handler) AddProject(c *gin.Context) {
	projectName := c.Param("name")
	
	var projectConfig ProjectConfig
	if err := c.ShouldBindJSON(&projectConfig); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "잘못된 요청 형식"})
		return
	}
	
	if h.config.Projects == nil {
		h.config.Projects = make(map[string]config.Project)
	}
	
	h.config.Projects[projectName] = config.Project{
		Server:        projectConfig.Server,
		Path:          projectConfig.Path,
		Branch:        projectConfig.Branch,
		DockerCompose: projectConfig.DockerCompose,
		HealthCheck:   projectConfig.HealthCheck,
	}
	
	if err := h.config.Save(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "설정 저장 실패"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "프로젝트가 추가되었습니다",
	})
}

func (h *Handler) UpdateProject(c *gin.Context) {
	projectName := c.Param("name")
	
	if _, exists := h.config.Projects[projectName]; !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "프로젝트를 찾을 수 없습니다"})
		return
	}
	
	var projectConfig ProjectConfig
	if err := c.ShouldBindJSON(&projectConfig); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "잘못된 요청 형식"})
		return
	}
	
	h.config.Projects[projectName] = config.Project{
		Server:        projectConfig.Server,
		Path:          projectConfig.Path,
		Branch:        projectConfig.Branch,
		DockerCompose: projectConfig.DockerCompose,
		HealthCheck:   projectConfig.HealthCheck,
	}
	
	if err := h.config.Save(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "설정 저장 실패"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "프로젝트가 업데이트되었습니다",
	})
}

func (h *Handler) DeleteProject(c *gin.Context) {
	projectName := c.Param("name")
	
	if _, exists := h.config.Projects[projectName]; !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "프로젝트를 찾을 수 없습니다"})
		return
	}
	
	delete(h.config.Projects, projectName)
	
	if err := h.config.Save(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "설정 저장 실패"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "프로젝트가 삭제되었습니다",
	})
}

func (h *Handler) TestConnection(c *gin.Context) {
	var server ssh.ConnectionConfig
	if err := c.ShouldBindJSON(&server); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "잘못된 요청 형식"})
		return
	}
	
	client, err := ssh.NewClient(server)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("연결 실패: %v", err),
		})
		return
	}
	defer client.Close()
	
	if err := client.CheckConnection(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("연결 테스트 실패: %v", err),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "연결 성공",
	})
}

// 배포 히스토리 조회
func (h *Handler) GetDeployHistory(c *gin.Context) {
	projectName := c.Param("name")
	limit := 10
	
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := fmt.Sscanf(limitStr, "%d", &limit); err == nil && l > 0 {
			limit = l
		}
	}
	
	history := h.deployQueue.GetHistory(projectName, limit)
	c.JSON(http.StatusOK, history)
}

// 현재 진행 중인 배포 작업 조회
func (h *Handler) GetActiveJobs(c *gin.Context) {
	jobs := h.deployQueue.GetActiveJobs()
	c.JSON(http.StatusOK, jobs)
}

// 배포 상태 실시간 업데이트 (SSE)
func (h *Handler) StreamDeployEvents(c *gin.Context) {
	clientID := fmt.Sprintf("client-%d", time.Now().UnixNano())
	events := h.deployQueue.Subscribe(clientID)
	defer h.deployQueue.Unsubscribe(clientID)
	
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")
	
	for {
		select {
		case event := <-events:
			data, _ := json.Marshal(event)
			c.Writer.Write([]byte(fmt.Sprintf("data: %s\n\n", data)))
			c.Writer.Flush()
		case <-c.Request.Context().Done():
			return
		}
	}
}