import type { CourseOutline, CoursewareArtifact, CoursewareBuildRequest, GenerationRequest } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface ApiError {
  error: string;
  message: string;
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const error = (await response.json()) as ApiError;
      errorMessage = error.message ?? errorMessage;
    } catch {
      // ignore JSON parsing error
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export const apiClient = {
  generateOutline(body: GenerationRequest) {
    return request<CourseOutline>('/api/outline', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  generateCourseware(body: CoursewareBuildRequest) {
    return request<CoursewareArtifact>('/api/courseware', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

