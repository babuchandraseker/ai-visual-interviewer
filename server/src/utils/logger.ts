const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'audiobase64',
  'secret',
  'jwt',
  'apikey',
  'key',
  'cookie',
  'bearer',
]);

const sanitizeMeta = (meta?: Record<string, any>): Record<string, any> | undefined => {
  if (!meta) return undefined;
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && (lowerKey.includes('token') || lowerKey.includes('secret') || lowerKey.includes('key'))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMeta(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'INFO', message, ...sanitizeMeta(meta) }));
  },
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: 'WARN', message, ...sanitizeMeta(meta) }));
  },
  error: (message: string, meta?: Record<string, any>) => {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'ERROR', message, ...sanitizeMeta(meta) }));
  },
  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify({ timestamp: new Date().toISOString(), level: 'DEBUG', message, ...sanitizeMeta(meta) }));
    }
  }
};
