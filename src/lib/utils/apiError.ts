import { isAxiosError } from 'axios';

export function getApiErrorMessage(error: unknown) {
  if (isAxiosError<{ error?: string; message?: string }>(error)) {
    return (
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message ??
      'Request failed'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error occurred';
}
