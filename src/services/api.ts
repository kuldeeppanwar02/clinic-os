import axios from "axios";
import { env } from "@/config/env";

export class ApiClientError extends Error {
  status?: number;
  isNetworkError: boolean;

  constructor(message: string, options: { status?: number; isNetworkError?: boolean } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.isNetworkError = options.isNetworkError ?? false;
  }
}

export const apiClient = axios.create({
  // In the browser, always prefer same-origin API calls so auth cookies/session
  // and CORS stay aligned across localhost, preview, and production deployments.
  baseURL: typeof window === "undefined" ? env.appBaseUrl || undefined : undefined,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window === "undefined") {
    return config;
  }

  const sessionToken = window.sessionStorage.getItem("clinic-staff-jwt");

  if (sessionToken) {
    config.headers.Authorization = `Bearer ${sessionToken}`;
  }

  config.headers["x-panwar-app"] = "smartcare-hub";

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const message =
        typeof error.response?.data === "object" &&
        error.response?.data &&
        "message" in error.response.data
          ? String(error.response.data.message)
          : error.message;

      return Promise.reject(
        new ApiClientError(message, {
          status: error.response?.status,
          isNetworkError: !error.response,
        }),
      );
    }

    return Promise.reject(error);
  },
);
