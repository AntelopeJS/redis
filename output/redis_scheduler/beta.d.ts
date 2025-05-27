/**
 * Handler function type for processing scheduled tasks
 * @param taskInfo - A string containing the task data, typically JSON-formatted
 */
type HandlerType = (taskInfo: string) => void | Promise<void>;
/**
 * Registers a handler function for a specific task type
 *
 * @param handlerName - Unique identifier for the task type (must not contain ':')
 * @param handler - Function that processes tasks of this type
 *
 * @example
 * ```typescript
 * import { setHandler } from '@ajs/redis_scheduler/1';
 *
 * // Register a handler for email tasks
 * setHandler('send-email', async (taskInfo) => {
 *   const emailData = JSON.parse(taskInfo);
 *   await sendEmail({
 *     to: emailData.recipient,
 *     subject: emailData.subject,
 *     body: emailData.body
 *   });
 * });
 * ```
 */
export declare function setHandler(handlerName: string, handler: HandlerType): void;
/**
 * Enables the task execution listener
 * This starts monitoring for scheduled tasks and executes them when due
 *
 * @example
 * ```typescript
 * import { enableListener } from '@ajs/redis_scheduler/1';
 *
 * // During application startup
 * async function startApp() {
 *   // Register task handlers
 *   // ...
 *
 *   // Start the task listener
 *   await enableListener();
 *   console.log('Task scheduler is now active');
 * }
 * ```
 */
export declare function enableListener(): Promise<void>;
/**
 * Disables the task execution listener
 * This stops the scheduler from processing any further tasks
 *
 * @example
 * ```typescript
 * import { disableListener } from '@ajs/redis_scheduler/1';
 *
 * // During application shutdown
 * async function stopApp() {
 *   await disableListener();
 *   console.log('Task scheduler stopped');
 * }
 * ```
 */
export declare function disableListener(): Promise<void>;
/**
 * Schedules a task to be executed at a specific time
 *
 * @param handlerName - The registered handler name that will process this task
 * @param dueTime - Unix timestamp (milliseconds) when the task should be executed
 * @param taskInfo - String containing any data needed by the handler (typically JSON)
 * @throws Error if the handler name is not registered
 *
 * @example
 * ```typescript
 * import { addTask } from '@ajs/redis_scheduler/1';
 *
 * // Schedule a task for future execution
 * async function schedulePasswordReminder(userId: string) {
 *   // Schedule for 3 days from now
 *   const dueTime = Date.now() + 3 * 24 * 60 * 60 * 1000;
 *
 *   const taskInfo = JSON.stringify({
 *     userId,
 *     type: 'password_reminder',
 *     createdAt: new Date().toISOString()
 *   });
 *
 *   await addTask('send-email', dueTime, taskInfo);
 *   console.log(`Password reminder scheduled for user ${userId}`);
 * }
 * ```
 */
export declare function addTask(handlerName: string, dueTime: number, taskInfo: string): Promise<void>;
/**
 * Removes a previously scheduled task
 *
 * @param handlerName - The handler name associated with the task
 * @param taskInfo - The exact task info string used when scheduling the task
 * @throws Error if the handler name is not registered
 *
 * @example
 * ```typescript
 * import { removeTask } from '@ajs/redis_scheduler/1';
 *
 * // Cancel a previously scheduled reminder
 * async function cancelReminder(userId: string) {
 *   const taskInfo = JSON.stringify({
 *     userId,
 *     type: 'password_reminder',
 *     createdAt: '2023-04-05T12:00:00.000Z' // Must match exactly
 *   });
 *
 *   await removeTask('send-email', taskInfo);
 *   console.log(`Reminder canceled for user ${userId}`);
 * }
 * ```
 */
export declare function removeTask(handlerName: string, taskInfo: string): Promise<void>;
/**
 * Updates the timer for the next task execution
 * This is called internally whenever the task schedule changes
 */
export declare function updateTimer(): Promise<void>;
/**
 * Executes all due tasks
 * This is called internally by the timer when tasks are due for execution
 * It includes automatic retry logic for failed tasks
 */
export declare function runTasks(): Promise<void>;
export {};
