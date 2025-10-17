// Video Queue Management System
export interface QueueItem {
  id: string;
  prompt: string;
  options: any;
  priority: 'low' | 'normal' | 'high';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  estimatedTime: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export class VideoQueueManager {
  private queue: QueueItem[] = [];
  private processing: Map<string, QueueItem> = new Map();
  private maxConcurrent = 3;
  private listeners: ((queue: QueueItem[]) => void)[] = [];

  constructor() {
    this.loadQueue();
  }

  // Add item to queue
  add(item: Omit<QueueItem, 'id' | 'status' | 'progress' | 'createdAt'>): string {
    const queueItem: QueueItem = {
      ...item,
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'queued',
      progress: 0,
      createdAt: new Date()
    };

    // Insert based on priority
    const insertIndex = this.findInsertIndex(queueItem.priority);
    this.queue.splice(insertIndex, 0, queueItem);
    
    this.saveQueue();
    this.notifyListeners();
    this.processNext();
    
    return queueItem.id;
  }

  // Remove item from queue
  remove(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id);
    if (index === -1) return false;
    
    this.queue.splice(index, 1);
    this.processing.delete(id);
    
    this.saveQueue();
    this.notifyListeners();
    
    return true;
  }

  // Update item progress
  updateProgress(id: string, progress: number, status?: QueueItem['status']): void {
    const item = this.queue.find(item => item.id === id) || this.processing.get(id);
    if (!item) return;
    
    item.progress = progress;
    if (status) item.status = status;
    
    if (status === 'processing' && !item.startedAt) {
      item.startedAt = new Date();
    }
    
    if (status === 'completed' || status === 'failed') {
      item.completedAt = new Date();
      this.processing.delete(id);
      this.processNext();
    }
    
    this.saveQueue();
    this.notifyListeners();
  }

  // Get queue status
  getStatus() {
    return {
      queued: this.queue.filter(item => item.status === 'queued').length,
      processing: this.processing.size,
      total: this.queue.length,
      estimatedWaitTime: this.calculateWaitTime()
    };
  }

  // Get all items
  getAll(): QueueItem[] {
    return [...this.queue, ...Array.from(this.processing.values())];
  }

  // Subscribe to queue changes
  subscribe(callback: (queue: QueueItem[]) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  // Clear completed items
  clearCompleted(): void {
    this.queue = this.queue.filter(item => 
      item.status !== 'completed' && item.status !== 'failed'
    );
    this.saveQueue();
    this.notifyListeners();
  }

  // Private methods
  private findInsertIndex(priority: QueueItem['priority']): number {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const targetPriority = priorityOrder[priority];
    
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityOrder[this.queue[i].priority] > targetPriority) {
        return i;
      }
    }
    return this.queue.length;
  }

  private async processNext(): Promise<void> {
    if (this.processing.size >= this.maxConcurrent) return;
    
    const nextItem = this.queue.find(item => item.status === 'queued');
    if (!nextItem) return;
    
    nextItem.status = 'processing';
    this.processing.set(nextItem.id, nextItem);
    
    this.notifyListeners();
  }

  private calculateWaitTime(): number {
    const queuedItems = this.queue.filter(item => item.status === 'queued');
    const avgProcessingTime = 45; // seconds
    
    return queuedItems.length * avgProcessingTime;
  }

  private saveQueue(): void {
    localStorage.setItem('niro_video_queue', JSON.stringify(this.queue));
  }

  private loadQueue(): void {
    try {
      const saved = localStorage.getItem('niro_video_queue');
      if (saved) {
        this.queue = JSON.parse(saved).map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          startedAt: item.startedAt ? new Date(item.startedAt) : undefined,
          completedAt: item.completedAt ? new Date(item.completedAt) : undefined
        }));
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
      this.queue = [];
    }
  }

  private notifyListeners(): void {
    const allItems = this.getAll();
    this.listeners.forEach(callback => callback(allItems));
  }
}
