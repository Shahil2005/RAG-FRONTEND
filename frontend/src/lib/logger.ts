type LogLevel = 'info' | 'warn' | 'error';

function emit(level: LogLevel, scope: string, message: string, detail?: Record<string, unknown>) {
  const prefix = `[Starbot:${scope}]`;
  const payload = detail && Object.keys(detail).length > 0 ? detail : undefined;
  if (level === 'error') {
    console.error(prefix, message, payload ?? '');
  } else if (level === 'warn') {
    console.warn(prefix, message, payload ?? '');
  } else {
    console.log(prefix, message, payload ?? '');
  }
}

export function logInfo(scope: string, message: string, detail?: Record<string, unknown>) {
  emit('info', scope, message, detail);
}

export function logWarn(scope: string, message: string, detail?: Record<string, unknown>) {
  emit('warn', scope, message, detail);
}

export function logError(scope: string, message: string, detail?: Record<string, unknown>) {
  emit('error', scope, message, detail);
}

export function logErrorFromUnknown(
  scope: string,
  message: string,
  err: unknown,
  detail?: Record<string, unknown>,
) {
  const extra =
    err instanceof Error
      ? { ...detail, errorMessage: err.message, errorName: err.name }
      : { ...detail, errorMessage: String(err) };
  logError(scope, message, extra);
}
