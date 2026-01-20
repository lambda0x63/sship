package deploy

import (
	"fmt"
	"sync"
	"time"
)

type JobStatus string

const (
	JobStatusPending   JobStatus = "pending"
	JobStatusRunning   JobStatus = "running"
	JobStatusCompleted JobStatus = "completed"
	JobStatusFailed    JobStatus = "failed"
)

type DeployJob struct {
	ID          string    `json:"id"`
	ServiceName string    `json:"service_name"`
	Status      JobStatus `json:"status"`
	StartedAt   time.Time `json:"started_at"`
	CompletedAt time.Time `json:"completed_at"`
	Error       string    `json:"error,omitempty"`
	Output      []string  `json:"output"`
	Branch      string    `json:"branch"`
	Commit      string    `json:"commit"`
}

type DeployQueue struct {
	jobs      map[string]*DeployJob
	queue     chan string
	history   []*DeployJob
	mu        sync.RWMutex
	deployer  *Deployer
	listeners map[string][]chan DeployEvent
	listenerMu sync.RWMutex
}

type DeployEvent struct {
	JobID   string    `json:"job_id"`
	Service string    `json:"service"`
	Status  JobStatus `json:"status"`
	Message string    `json:"message"`
	Time    time.Time `json:"time"`
}

func NewDeployQueue(deployer *Deployer) *DeployQueue {
	q := &DeployQueue{
		jobs:      make(map[string]*DeployJob),
		queue:     make(chan string, 100),
		history:   make([]*DeployJob, 0),
		deployer:  deployer,
		listeners: make(map[string][]chan DeployEvent),
	}
	
	// Worker goroutine
	go q.worker()
	
	return q
}

func (q *DeployQueue) Enqueue(serviceName string, branch string) (*DeployJob, error) {
	jobID := fmt.Sprintf("deploy-%s-%d", serviceName, time.Now().Unix())
	
	job := &DeployJob{
		ID:          jobID,
		ServiceName: serviceName,
		Status:      JobStatusPending,
		StartedAt:   time.Now(),
		Branch:      branch,
		Output:      make([]string, 0),
	}
	
	q.mu.Lock()
	q.jobs[jobID] = job
	q.mu.Unlock()
	
	// 큐에 추가
	q.queue <- jobID
	
	// 이벤트 발송
	q.publishEvent(DeployEvent{
		JobID:   jobID,
		Service: serviceName,
		Status:  JobStatusPending,
		Message: "배포가 대기열에 추가되었습니다",
		Time:    time.Now(),
	})
	
	return job, nil
}

func (q *DeployQueue) worker() {
	for jobID := range q.queue {
		q.mu.RLock()
		job, exists := q.jobs[jobID]
		q.mu.RUnlock()
		
		if !exists {
			continue
		}
		
		// 상태 업데이트
		q.updateJobStatus(jobID, JobStatusRunning, "")
		
		// 배포 실행
		err := q.deployer.Deploy(job.ServiceName)
		
		if err != nil {
			q.updateJobStatus(jobID, JobStatusFailed, err.Error())
			q.publishEvent(DeployEvent{
				JobID:   jobID,
				Service: job.ServiceName,
				Status:  JobStatusFailed,
				Message: fmt.Sprintf("배포 실패: %v", err),
				Time:    time.Now(),
			})
		} else {
			q.updateJobStatus(jobID, JobStatusCompleted, "")
			q.publishEvent(DeployEvent{
				JobID:   jobID,
				Service: job.ServiceName,
				Status:  JobStatusCompleted,
				Message: "배포가 성공적으로 완료되었습니다",
				Time:    time.Now(),
			})
		}
		
		// 히스토리에 추가
		q.addToHistory(job)
	}
}

func (q *DeployQueue) updateJobStatus(jobID string, status JobStatus, errorMsg string) {
	q.mu.Lock()
	defer q.mu.Unlock()
	
	if job, exists := q.jobs[jobID]; exists {
		job.Status = status
		if status == JobStatusCompleted || status == JobStatusFailed {
			job.CompletedAt = time.Now()
		}
		if errorMsg != "" {
			job.Error = errorMsg
		}
	}
}

func (q *DeployQueue) addToHistory(job *DeployJob) {
	q.mu.Lock()
	defer q.mu.Unlock()
	
	// 최대 100개의 히스토리만 유지
	if len(q.history) >= 100 {
		q.history = q.history[1:]
	}
	q.history = append(q.history, job)
}

func (q *DeployQueue) GetJob(jobID string) (*DeployJob, error) {
	q.mu.RLock()
	defer q.mu.RUnlock()
	
	job, exists := q.jobs[jobID]
	if !exists {
		return nil, fmt.Errorf("job not found: %s", jobID)
	}
	
	return job, nil
}

func (q *DeployQueue) GetHistory(serviceName string, limit int) []*DeployJob {
	q.mu.RLock()
	defer q.mu.RUnlock()
	
	result := make([]*DeployJob, 0)
	count := 0
	
	// 역순으로 순회 (최신 것부터)
	for i := len(q.history) - 1; i >= 0 && count < limit; i-- {
		if serviceName == "" || q.history[i].ServiceName == serviceName {
			result = append(result, q.history[i])
			count++
		}
	}
	
	return result
}

func (q *DeployQueue) GetActiveJobs() []*DeployJob {
	q.mu.RLock()
	defer q.mu.RUnlock()
	
	result := make([]*DeployJob, 0)
	for _, job := range q.jobs {
		if job.Status == JobStatusPending || job.Status == JobStatusRunning {
			result = append(result, job)
		}
	}
	
	return result
}

// 이벤트 구독
func (q *DeployQueue) Subscribe(clientID string) chan DeployEvent {
	q.listenerMu.Lock()
	defer q.listenerMu.Unlock()
	
	ch := make(chan DeployEvent, 10)
	q.listeners[clientID] = append(q.listeners[clientID], ch)
	
	return ch
}

func (q *DeployQueue) Unsubscribe(clientID string) {
	q.listenerMu.Lock()
	defer q.listenerMu.Unlock()
	
	if channels, exists := q.listeners[clientID]; exists {
		for _, ch := range channels {
			close(ch)
		}
		delete(q.listeners, clientID)
	}
}

func (q *DeployQueue) publishEvent(event DeployEvent) {
	q.listenerMu.RLock()
	defer q.listenerMu.RUnlock()
	
	for _, channels := range q.listeners {
		for _, ch := range channels {
			select {
			case ch <- event:
			default:
				// 채널이 가득 찬 경우 스킵
			}
		}
	}
}