"use client";

import { useEffect, useRef } from "react";

export function ViewTracker({ slug }) {
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    const timer = setTimeout(() => {
      firedRef.current = true;
      fetch((process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000") + "/api/public/articles/" + slug + "/view", {
        method: "POST",
      }).catch(() => {});
    }, 5000);

    return () => clearTimeout(timer);
  }, [slug]);

  return null;
}
