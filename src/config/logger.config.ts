import { createLogger, transports, format } from 'winston';
import { LOG_CONFIG } from './index';

export const logger = createLogger({
  level: LOG_CONFIG.level,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [new transports.Console()],
});
