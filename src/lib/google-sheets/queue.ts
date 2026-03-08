import { syncTransactionToSheet, syncReimbursementToSheet } from './sync';

interface SyncTask {
  entityType: 'transaction' | 'reimbursement';
  entityId: number;
  action: 'create' | 'update' | 'delete';
  retryCount: number;
}

class SyncQueue {
  private queue: SyncTask[] = [];
  private processing = false;

  enqueue(task: SyncTask) {
    this.queue.push(task);
    if (!this.processing) {
      this.processNext();
    }
  }

  private async processNext() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const task = this.queue.shift()!;

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
          this.enqueue({ ...task, retryCount: task.retryCount + 1 });
        }, delay);
      } else {
        console.error(`Giving up on ${task.entityType} #${task.entityId} after 10 retries`);
      }
    }

    // Process next task
    setTimeout(() => this.processNext(), 100);
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isProcessing(): boolean {
    return this.processing;
  }
}

export const syncQueue = new SyncQueue();
