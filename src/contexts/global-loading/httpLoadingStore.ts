export interface PendingHttpRequest {
  id: string;
  method: string;
  path: string;
  startedAt: number;
}

type HttpLoadingListener = (
  requests: ReadonlyMap<string, PendingHttpRequest>,
) => void;

const pendingRequests = new Map<string, PendingHttpRequest>();
const listeners = new Set<HttpLoadingListener>();

let requestCounter = 0;

function notifyListeners() {
  for (const listener of listeners) {
    listener(new Map(pendingRequests));
  }
}

function normalizeMethod(method?: string): string {
  return (method || "GET").toUpperCase();
}

export function startHttpRequestTracking(input: {
  method?: string;
  path: string;
}): () => void {
  const id = `http-${++requestCounter}`;
  const request: PendingHttpRequest = {
    id,
    method: normalizeMethod(input.method),
    path: input.path,
    startedAt: Date.now(),
  };

  pendingRequests.set(id, request);
  notifyListeners();

  return () => {
    if (!pendingRequests.has(id)) {
      return;
    }
    pendingRequests.delete(id);
    notifyListeners();
  };
}

export function subscribeToPendingHttpRequests(
  listener: HttpLoadingListener,
): () => void {
  listeners.add(listener);
  listener(new Map(pendingRequests));

  return () => {
    listeners.delete(listener);
  };
}
