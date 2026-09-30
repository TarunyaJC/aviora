/** Uniform API envelope contracts (client mirror of the server types). */

export interface ApiSuccess<TData> {
  success: true;
  data: TData;
  message: string;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  errorCode: string;
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiErrorBody;
