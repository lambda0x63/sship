package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/lambda0x63/sship/internal/api"
	"github.com/lambda0x63/sship/internal/config"
	"github.com/lambda0x63/sship/internal/web"
)

var (
	version = "dev"
	commit  = "none"
	date    = "unknown"
)

func main() {
	var (
		port        = flag.String("port", "8080", "웹 서버 포트")
		configPath  = flag.String("config", "sship.yaml", "설정 파일 경로")
		showVersion = flag.Bool("version", false, "버전 정보 표시")
	)
	flag.Parse()

	if *showVersion {
		fmt.Printf("sship %s (%s) built on %s\n", version, commit, date)
		os.Exit(0)
	}

	cfg, err := config.LoadConfig(*configPath)
	if err != nil {
		// 설정 파일이 없으면 빈 설정으로 시작
		cfg = &config.Config{
			Projects: make(map[string]config.Project),
		}
		cfg.SetFilePath(*configPath)
	}

	router := gin.Default()

	apiHandler := api.NewHandler(cfg)

	// Use embedded files
	router.StaticFS("/static", getStaticFS())
	router.SetHTMLTemplate(loadHTMLTemplates())

	// 초기 설정 체크 미들웨어
	router.Use(func(c *gin.Context) {
		path := c.Request.URL.Path
		
		// API 요청과 정적 파일은 체크하지 않음
		if path == "/setup" || 
		   len(path) >= 7 && path[:7] == "/api/v1" || 
		   len(path) >= 7 && path[:7] == "/static" ||
		   path == "/test-connection" {
			c.Next()
			return
		}

		// 프로젝트가 없으면 설정 페이지로
		if len(cfg.Projects) == 0 && path != "/setup" {
			c.Redirect(http.StatusTemporaryRedirect, "/setup")
			c.Abort()
			return
		}
		c.Next()
	})

	router.GET("/", web.IndexHandler)
	router.GET("/setup", web.SetupHandler)
	router.GET("/project/:name", web.ProjectHandler)

	v1 := router.Group("/api/v1")
	{
		v1.GET("/projects", apiHandler.ListProjects)
		v1.GET("/project/:name/status", apiHandler.GetProjectStatus)
		v1.POST("/project/:name/deploy", apiHandler.DeployProject)
		v1.GET("/project/:name/logs", apiHandler.GetProjectLogs)
		v1.POST("/project/:name/rollback", apiHandler.RollbackProject)
		v1.GET("/ws/logs/:name", apiHandler.StreamLogs)
		
		// 프로젝트 관리 API
		v1.PUT("/project/:name", apiHandler.AddProject)
		v1.PATCH("/project/:name", apiHandler.UpdateProject)
		v1.DELETE("/project/:name", apiHandler.DeleteProject)
		v1.POST("/test-connection", apiHandler.TestConnection)
		
		// 배포 히스토리 및 상태 API
		v1.GET("/project/:name/history", apiHandler.GetDeployHistory)
		v1.GET("/deploy/active", apiHandler.GetActiveJobs)
		v1.GET("/deploy/events", apiHandler.StreamDeployEvents)
	}

	fmt.Printf("🌐 sship 웹 UI 시작: http://localhost:%s\n", *port)
	router.Run(":" + *port)
}