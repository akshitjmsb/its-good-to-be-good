interface SchedulerDeps {
  updateTime: () => void;
  periodicRender: () => Promise<void>;
  syncTasks: () => Promise<void>;
  onError: (error: Error, context: string) => void;
}

export function initializeSchedulers(deps: SchedulerDeps): void {
  const { updateTime, periodicRender, syncTasks, onError } = deps;

  setInterval(updateTime, 1000);

  setInterval(async () => {
    try {
      await periodicRender();
    } catch (error) {
      onError(error as Error, 'periodic update');
    }
  }, 60000 * 5);

  setInterval(async () => {
    try {
      await syncTasks();
    } catch (error) {
      onError(error as Error, 'task sync');
    }
  }, 30000);
}
