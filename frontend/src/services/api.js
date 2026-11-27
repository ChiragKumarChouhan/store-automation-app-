class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/$/,
  "",
);

async function request(path, options = {}) {
  const { body, headers = {}, ...rest } = options;

  const config = {
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...rest,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, config);

  let payload = null;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    const text = await response.text();
    payload = { message: text || response.statusText };
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message || `Request failed with status ${response.status}`,
      response.status,
      payload?.details || null,
    );
  }

  return payload;
}

export const api = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export function toQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}
