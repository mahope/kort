"use client";

import { useEffect } from "react";
import { enableAnalytics } from "@/lib/analytics";

export function Analytics() {
  useEffect(() => {
    enableAnalytics();
  }, []);

  return null;
}
