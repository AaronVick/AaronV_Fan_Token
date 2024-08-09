const { config } = require('../config');
const { AIRSTACK_ENDPOINT } = require('../constants');
const fetch = require('node-fetch').default;

export async function _fetch<ResponseType = any>(
  query: string,
  variables: Variables
): Promise<[ResponseType | null, any]> {
  if (!config.authKey) {
    return [null, Error('No API key provided')];
  }
  try {
    const res = await fetch(AIRSTACK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.authKey,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });
    const json = (await res.json()) as any;
    const data = json?.data;
    let error = null;

    if (json.errors || json.error) {
      error = json.errors || json.error;
    }
    return [data, error];
  } catch (_error) {
    const error =
      typeof _error === 'string'
        ? _error
        : (_error as { message: string })?.message;
    return [null, error || 'Unable to fetch data'];
  }
}

export async function fetchGql<ResponseType = any>(
  query: string,
  variables: Variables
): Promise<[ResponseType | null, any]> {
  return _fetch<ResponseType>(query, variables);
}
