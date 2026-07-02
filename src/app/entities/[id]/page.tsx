"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EntityIndex() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/entities/${params.id}/trial-balance`);
  }, [params.id, router]);
  return null;
}
