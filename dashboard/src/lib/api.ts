const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function jfetch(path: string, opts:Object = {}) {
  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// Add these:
export async function getHealth() {
  return jfetch('/health');
}

export async function listJobs() {
  return jfetch('/jobs');
}

export async function createJob(body: Object) {
  return jfetch('/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function reqSignedS3PutUrl (file: File){
  const res = await jfetch('/uploads/signed-put', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  });
  return await res.json();
  //const { uploadUrl, fileUrl } = await res.json();
}

export async function uploadToS3(file: File, uploadUrl: string) {
  return await fetch(uploadUrl, {
    method: 'PUT',
    headers: { "Content-Type": file.type },
    body: file,
  });
}

/*
export async function notifyUploadToS3(file: File){
  return await jfetch('/api/download-jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalFilename: file.name,
      fileUrl: fileUrl,
      size: file.size,
      contentType: file.type,
    }),
  });
}*/

export async function getSummary() {
  return jfetch('/jobs/summary');
}

export async function getJob(id: string) {
  return jfetch(`/jobs/${id}`);
}

export async function deleteJob(id: string) {
  return jfetch(`/jobs/${id}`, { method: 'DELETE' });
}

export async function getTranscript(id: string) {
  return jfetch(`/jobs/${id}/transcript`);
}

export async function transcribeJob(id: string) {
  return jfetch(`/jobs/${id}/transcribe`, { method: 'POST' });
}

export async function analyzeJob(id: string, params = {}) {
  return jfetch(`/jobs/${id}/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function getThread(jobId: string) {
  return jfetch(`/jobs/${jobId}/thread`);
}

export async function createThread(jobId: string, body: Object) {
  return jfetch(`/jobs/${jobId}/thread`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function replyThread(threadId: string, body: Object) {
  return jfetch(`/threads/${threadId}/reply`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
// keep your existing listJobs/createJob/etc.
export { API };

export const mediaUrl = (src: string) => `/media/${encodeURIComponent(src)}/stream`;
  //`${API}/media/${src}/stream`;
  // proxy to http://localhost:4000 under the hood, so NO cross-origin reference
