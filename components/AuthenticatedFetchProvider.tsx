"use client";

import { useLayoutEffect } from "react";

export default function AuthenticatedFetchProvider() {
  useLayoutEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
      const token = localStorage.getItem("token");
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const isSameOrigin =
        url.startsWith("/") || url.startsWith(window.location.origin);

      if (!token || !isSameOrigin) {
        return originalFetch(input, init);
      }

      const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return originalFetch(input, { ...init, headers });
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
