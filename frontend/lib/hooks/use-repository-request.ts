"use client";

import { useEffect, useRef } from "react";

export function useRepositoryRequest(repoId: number | null) {
  const scope = useRef({ repoId, generation: 0 });
  if (scope.current.repoId !== repoId) {
    scope.current = { repoId, generation: scope.current.generation + 1 };
  }
  useEffect(() => () => { scope.current.generation += 1; }, []);

  // Capture before awaiting: switching away and back must not revive an old response.
  return () => {
    const generation = scope.current.generation;
    return () => scope.current.generation === generation;
  };
}
