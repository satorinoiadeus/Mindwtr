package main

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os/exec"
	"runtime"
	"sync/atomic"
	"time"
)

//go:embed web/*
var webFS embed.FS

func openBrowser(url string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	return cmd.Start()
}

func main() {
	sub, err := fs.Sub(webFS, "web")
	if err != nil {
		log.Fatal(err)
	}

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		log.Fatal(err)
	}
	port := ln.Addr().(*net.TCPAddr).Port

	var lastBeat atomic.Int64
	lastBeat.Store(time.Now().Unix())

	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(http.FS(sub)))
	mux.HandleFunc("/heartbeat", func(w http.ResponseWriter, r *http.Request) {
		lastBeat.Store(time.Now().Unix())
		w.Header().Set("Cache-Control", "no-store")
		_, _ = w.Write([]byte("ok"))
	})

	srv := &http.Server{Handler: mux}
	url := fmt.Sprintf("http://127.0.0.1:%d/?native=1", port)

	go func() {
		time.Sleep(250 * time.Millisecond)
		_ = openBrowser(url)
	}()

	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			if time.Now().Unix()-lastBeat.Load() > 35 {
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				_ = srv.Shutdown(ctx)
				cancel()
				return
			}
		}
	}()

	err = srv.Serve(ln)
	if err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
