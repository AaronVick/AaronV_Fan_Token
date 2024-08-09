// manual_module/airstack-node-sdk-main/src/init.ts

import { config, ConfigType } from './config';

export function init(authKey: string, options?: Partial<ConfigType>) {
  config.authKey = authKey;
  if (options) {
    Object.assign(config, options);
  }
}
