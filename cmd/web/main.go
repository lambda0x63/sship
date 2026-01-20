package main

import (
	"flag"
	"fmt"
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
		port        = flag.String("port", "9999", "웹 서버 포트")
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

	// 설정 공유 미들웨어
	router.Use(func(c *gin.Context) {
		c.Set("config", cfg)
		c.Next()
	})

	router.GET("/", web.IndexHandler)
	router.GET("/project/:name", web.ProjectHandler)

	v1 := router.Group("/api/v1")
	{
		v1.GET("/projects", apiHandler.ListProjects)
		v1.GET("/project/:name/status", apiHandler.GetProjectStatus)
		v1.GET("/project/:name/environment", apiHandler.GetProjectEnvironment)
		v1.POST("/project/:name/deploy", apiHandler.DeployProject)
		v1.GET("/project/:name/logs", apiHandler.GetProjectLogs)
		v1.POST("/project/:name/rollback", apiHandler.RollbackProject)
		v1.GET("/ws/logs/:name", apiHandler.StreamLogs)
		
		// 프로젝트 관리 API
		v1.PUT("/project/:name", apiHandler.AddProject)
		v1.PATCH("/project/:name", apiHandler.UpdateProject)
		v1.DELETE("/project/:name", apiHandler.DeleteProject)
		v1.POST("/test-connection", apiHandler.TestConnection)
		
		// 배포 상태 API
		v1.GET("/deploy/active", apiHandler.GetActiveJobs)
		v1.GET("/deploy/events", apiHandler.StreamDeployEvents)
	}

	fmt.Printf("🌐 sship 웹 UI 시작: http://localhost:%s\n", *port)
	router.Run(":" + *port)
}