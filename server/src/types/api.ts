/** Uniform success envelope for every API response. */
export interface ApiSuccess<TData> {
  success: true;
  data: TData;
  message: string;
}

/** Uniform error envelope for every API response. */
export interface ApiErrorBody {
  success: false;
  message: string;
  errorCode: string;
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiErrorBody;
