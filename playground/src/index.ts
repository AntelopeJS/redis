export function construct(): void {
  console.log('construct');
}

export async function start(): Promise<void> {
  console.log('start');
}

export async function stop(): Promise<void> {
  console.log('stop');
}

export async function destroy(): Promise<void> {
  console.log('destroy');
}
