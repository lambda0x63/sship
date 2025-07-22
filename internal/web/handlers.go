package web

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func IndexHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "index.html", gin.H{
		"title": "sship 대시보드",
	})
}

func ProjectHandler(c *gin.Context) {
	projectName := c.Param("name")
	
	c.HTML(http.StatusOK, "project.html", gin.H{
		"title":       "프로젝트: " + projectName,
		"projectName": projectName,
	})
}

func SetupHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "setup.html", gin.H{
		"title": "sship - 초기 설정",
	})
}