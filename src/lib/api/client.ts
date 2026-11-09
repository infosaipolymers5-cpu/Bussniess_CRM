/**
 * Typed API client with standard error envelope and correlation ID.
 */

import { supabase } from '../supabase';

/** Standard error shape returned by API operations */
export interface ApiError {
  message: string;
  code?: string;
  correlationId?: string;
  statusCode?: number;
}

/** API response envelope */
export type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiError };

/** Generate a correlation ID for tracking requests */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Wrap a Supabase query into the standard ApiResult envelope */
export async function queryApi<T>(
  queryFn: () => Promise<{
    data: T | null;
    error: { message: string; code?: string } | null;
  }>,
): Promise<ApiResult<T>> {
  try {
    const { data, error } = await queryFn();
    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          correlationId: generateCorrelationId(),
        },
      };
    }
    if (data === null) {
      return {
        data: null,
        error: {
          message: 'No data returned',
          correlationId: generateCorrelationId(),
        },
      };
    }
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error',
        correlationId: generateCorrelationId(),
      },
    };
  }
}

/** Invoke a Supabase Edge Function with typed response */
export async function invokeFunction<TRequest, TResponse>(
  functionName: string,
  body: TRequest,
): Promise<ApiResult<TResponse>> {
  const correlationId = generateCorrelationId();
  try {
    const res = (await supabase.functions.invoke(functionName, {
      body: { ...body, correlationId },
    })) as { data: TResponse | null; error: { message: string } | null };
    if (res.error) {
      return {
        data: null,
        error: {
          message: res.error.message,
          code: 'FUNCTION_ERROR',
          correlationId,
        },
      };
    }
    return { data: res.data as TResponse, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error',
        correlationId,
      },
    };
  }
}
