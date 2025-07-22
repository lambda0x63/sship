package main

import (
	"embed"
	"html/template"
	"io/fs"
	"net/http"
)

//go:embed all:static
var staticFiles embed.FS

//go:embed all:templates
var templateFiles embed.FS

func getStaticFS() http.FileSystem {
	sub, err := fs.Sub(staticFiles, "static")
	if err != nil {
		panic(err)
	}
	return http.FS(sub)
}

func loadHTMLTemplates() *template.Template {
	tmpl := template.New("")
	
	// Read all template files
	files, err := templateFiles.ReadDir("templates")
	if err != nil {
		panic(err)
	}
	
	for _, file := range files {
		if file.IsDir() {
			continue
		}
		
		content, err := templateFiles.ReadFile("templates/" + file.Name())
		if err != nil {
			panic(err)
		}
		
		tmpl = template.Must(tmpl.New(file.Name()).Parse(string(content)))
	}
	
	return tmpl
}