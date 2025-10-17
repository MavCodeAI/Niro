// Performance Optimization System
export interface PerformanceMetrics {
  avgTime: number;
  totalProcessed: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  queueLength: number;
}

export interface OptimizationSettings {
  quality: 'auto' | 'speed' | 'balanced' | 'quality';
  enablePreProcessing: boolean;
  enablePostProcessing: boolean;
  enableParallelProcessing: boolean;
  maxConcurrentRequests: number;
  timeoutMs: number;
}

export class PerformanceOptimizer {
  private metrics: PerformanceMetrics;
  private settings: OptimizationSettings;
  private processingTimes: number[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.metrics = {
      avgTime: 0,
      totalProcessed: 0,
      successRate: 100,
      errorRate: 0,
      throughput: 0,
      queueLength: 0
    };

    this.settings = {
      quality: 'balanced',
      enablePreProcessing: true,
      enablePostProcessing: true,
      enableParallelProcessing: true,
      maxConcurrentRequests: 3,
      timeoutMs: 300000 // 5 minutes
    };

    this.loadMetrics();
  }

  // Optimize video generation parameters
  optimizeParameters(request: any, userTier: string): any {
    const optimized = { ...request };

    switch (this.settings.quality) {
      case 'speed':
        optimized.options.bitrate = 'low';
        optimized.options.fps = Math.min(optimized.options.fps, 30);
        optimized.priority = 'high';
        break;
        
      case 'quality':
        optimized.options.bitrate = 'ultra';
        optimized.options.fps = Math.max(optimized.options.fps, 30);
        break;
        
      case 'balanced':
        if (userTier === 'free') {
          optimized.options.bitrate = 'medium';
          optimized.options.fps = 30;
        }
        break;
        
      case 'auto':
        optimized = this.autoOptimize(optimized, userTier);
        break;
    }

    return optimized;
  }

  // Auto-optimize based on current performance
  private autoOptimize(request: any, userTier: string): any {
    const optimized = { ...request };
    const avgTime = this.getAverageProcessingTime();
    
    // If processing is slow, optimize for speed
    if (avgTime > 60) {
      optimized.options.bitrate = 'low';
      optimized.options.quality = optimized.options.quality === '4K' ? '1080p' : optimized.options.quality;
    }
    
    // If queue is long, prioritize speed
    if (this.metrics.queueLength > 5) {
      optimized.options.fps = Math.min(optimized.options.fps, 30);
    }
    
    // Adjust based on user tier
    if (userTier === 'free') {
      optimized.options.quality = '720p';
      optimized.options.bitrate = 'medium';
    }
    
    return optimized;
  }

  // Record processing time
  recordProcessingTime(timeMs: number, success: boolean): void {
    this.processingTimes.push(timeMs / 1000); // Convert to seconds
    
    // Keep only recent times
    if (this.processingTimes.length > this.maxHistorySize) {
      this.processingTimes.shift();
    }
    
    // Update metrics
    this.metrics.totalProcessed++;
    this.metrics.avgTime = this.calculateAverageTime();
    
    if (success) {
      this.metrics.successRate = (this.metrics.successRate * (this.metrics.totalProcessed - 1) + 100) / this.metrics.totalProcessed;
    } else {
      this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.totalProcessed - 1) + 100) / this.metrics.totalProcessed;
    }
    
    this.metrics.throughput = this.calculateThroughput();
    
    this.saveMetrics();
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Update settings
  updateSettings(newSettings: Partial<OptimizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('niro_optimization_settings', JSON.stringify(this.settings));
  }

  // Get current settings
  getSettings(): OptimizationSettings {
    return { ...this.settings };
  }

  // Get optimal batch size
  getOptimalBatchSize(userTier: string): number {
    const baseSize = userTier === 'professional' ? 10 : userTier === 'premium' ? 5 : 2;
    
    // Adjust based on current performance
    if (this.metrics.avgTime > 60) {
      return Math.max(1, Math.floor(baseSize * 0.7));
    }
    
    if (this.metrics.avgTime < 30) {
      return Math.min(baseSize * 1.5, baseSize + 3);
    }
    
    return baseSize;
  }

  // Estimate processing time
  estimateProcessingTime(duration: number, quality: string, style: string): number {
    const baseTime = duration * 10; // 10 seconds per second of video
    const qualityMultiplier = quality === '4K' ? 3 : quality === '1080p' ? 2 : 1;
    const styleMultiplier = style === 'cinematic' ? 1.5 : style === 'realistic' ? 1.3 : 1;
    
    let estimate = baseTime * qualityMultiplier * styleMultiplier;
    
    // Adjust based on current performance
    const currentAvg = this.getAverageProcessingTime();
    if (currentAvg > 0) {
      const performanceFactor = currentAvg / 30; // 30 seconds is baseline
      estimate *= performanceFactor;
    }
    
    return Math.round(estimate);
  }

  // Preload optimization
  async preloadResources(): Promise<void> {
    // Preload common assets
    const commonAssets = [
      '/assets/default-thumbnail.jpg',
      '/assets/loading-spinner.gif'
    ];
    
    const preloadPromises = commonAssets.map(asset => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = asset;
      });
    });
    
    try {
      await Promise.all(preloadPromises);
    } catch (error) {
      console.warn('Failed to preload some assets:', error);
    }
  }

  // Database query optimization
  optimizeQuery(query: any): any {
    const optimized = { ...query };
    
    // Add pagination if not present
    if (!optimized.limit) {
      optimized.limit = 20;
    }
    
    // Add caching headers
    optimized.cache = {
      ttl: 300, // 5 minutes
      strategy: 'stale-while-revalidate'
    };
    
    return optimized;
  }

  // Network optimization
  optimizeRequest(request: any): any {
    const optimized = { ...request };
    
    // Add compression
    optimized.headers = {
      ...optimized.headers,
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'public, max-age=300'
    };
    
    // Add timeout
    optimized.timeout = this.settings.timeoutMs;
    
    return optimized;
  }

  // Private methods
  private calculateAverageTime(): number {
    if (this.processingTimes.length === 0) return 0;
    
    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.processingTimes.length);
  }

  private calculateThroughput(): number {
    // Videos per hour
    if (this.metrics.avgTime === 0) return 0;
    return Math.round(3600 / this.metrics.avgTime);
  }

  private getAverageProcessingTime(): number {
    return this.metrics.avgTime;
  }

  private saveMetrics(): void {
    localStorage.setItem('niro_performance_metrics', JSON.stringify(this.metrics));
    localStorage.setItem('niro_processing_times', JSON.stringify(this.processingTimes));
  }

  private loadMetrics(): void {
    try {
      const metrics = localStorage.getItem('niro_performance_metrics');
      const times = localStorage.getItem('niro_processing_times');
      const settings = localStorage.getItem('niro_optimization_settings');
      
      if (metrics) {
        this.metrics = JSON.parse(metrics);
      }
      
      if (times) {
        this.processingTimes = JSON.parse(times);
      }
      
      if (settings) {
        this.settings = JSON.parse(settings);
      }
    } catch (error) {
      console.warn('Failed to load performance metrics:', error);
    }
  }
}

// Browser performance utilities
export class BrowserOptimizer {
  // Optimize video element for playback
  static optimizeVideoElement(video: HTMLVideoElement): void {
    video.preload = 'metadata';
    video.playsInline = true;
    
    // Add intersection observer for lazy loading
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          video.preload = 'auto';
          observer.unobserve(video);
        }
      });
    });
    
    observer.observe(video);
  }

  // Debounce function for performance
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }

  // Throttle function for performance
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(null, args);
      }
    };
  }
}
