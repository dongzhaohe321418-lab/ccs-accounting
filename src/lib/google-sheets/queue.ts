import { syncTransactionToSheet, syncReimbursementToSheet } from './sync';

interface SyncTask {
  entityType: 'transaction' | 'reimbursement';
  entityId: number;
  action: 'create' | 'update' | 'delete';
  retryCount: number;
}

const MAX_QUEUE_SIZE = 200;

class SyncQueue {
  private queue: SyncTask[] = [];
  private processing = false;
  private pendingKeys = new Set<string>();

  private taskKey(task: SyncTask): string {
    return `${task.entityType}:${task.entityId}:${task.action}`;
  }

  enqueue(task: SyncTask) {
    // Deduplication: skip if identical task already queued
    const key = this.taskKey(task);
    if (this.pendingKeys.has(key)) {
      return;
    }

    // Enforce max queue size to prevent memory leak
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      console.warn(`Sync queue full (${MAX_QUEUE_SIZE}), dropping task: ${key}`);
      return;
    }

    this.pendingKeys.add(key);
    this.queue.push(task);

    if (!this.processing) {
      this.processing = true;
      this.processNext();
    }
  }

  private async processNext() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    const task = this.queue.shift()!;
    const key = this.taskKey(task);
    this.pendingKeys.delete(key);

    try {
      if (task.entityType === 'transaction') {
        await syncTransactionToSheet(task.entityId);
      } else {
        await syncReimbursementToSheet(task.entityId);
      }
      console.log(`Synced ${task.entityType} #${task.entityId} (${task.action})`);
    } catch (error) {
      console.error(`Sync failed for ${task.entityType} #${task.entityId}:`, error);
      if (task.retryCount < 10) {
        const delay = Math.min(1000 * Math.pow(2, task.retryCount), 60000);
        setTimeout(() => {
          try {
            this.enqueue({ ...task, retryCount: task.retryCount + 1 });
          } catch (retryError) {
            console.error(`Retry enqueue failed for ${task.entityType} #${task.entityId}:`, retryError);
          }
        }, delay);
      } else {
        console.error(`Giving up on ${task.entityType} #${task.entityId} after 10 retries`);
      }
    }

    // Process next task with error guard
    setTimeout(() => {
      try {
        this.processNext();
      } catch (err) {
        console.error('processNext error:', err);
        this.processing = false;
      }
    }, 100);
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isProcessing(): boolean {
    return this.processing;
  }
}

export const syncQueue = new SyncQueue();
