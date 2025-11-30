export function subscribeJob(jobId, onUpdate) {
  const base = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
  const ws = new WebSocket(base + '/ws');

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ subscribe: jobId }));
  });

  ws.addEventListener('message', (e) => {
    if (onUpdate) onUpdate(JSON.parse(e.data));
  });

  ws.addEventListener('error', (err) => {
    console.warn('WS error', err);
  });

  return () => ws.close();
}
