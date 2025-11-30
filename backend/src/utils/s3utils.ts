export function makeUserPrefix({ env, userId }:
    {env: string, userId: string} ): string {
  return `${env}/users/${userId}`;
}

export function makeJobPrefix({ env, userId, jobId }:
  { env: string, userId: string, jobId: string }): string {
  const userPrefix = makeUserPrefix({ env, userId });
  return `${userPrefix}/jobs/${jobId}`;
}

// uploads
export function makeUploadKey({ env, userId, timestamp, filename }:
    { env: string, userId: string, timestamp: number, filename: string }): string {
  const userPrefix = makeUserPrefix({ env, userId });
  return `${userPrefix}/uploads/${timestamp}-${filename}`;
}

// processed audio for a job
export function makeJobAudioKey({ env, userId, jobId, filename }:
    { env: string, userId: string, jobId: string, filename: string }): string {
  const jobPrefix = makeJobPrefix({ env, userId, jobId });
  return `${jobPrefix}/audio/${filename}`;
}

// transcript for a job
export function makeJobTranscriptKey({ env, userId, jobId }:
  { env: string, userId: string, jobId: string }): string {
  const jobPrefix = makeJobPrefix({ env, userId, jobId });
  return `${jobPrefix}/transcripts/transcript.json`;
}

// fileUrlToS3Uri
export function fileUrlToS3Uri(fileUrl: string) {
  if (!fileUrl) return null;

  const cleanUrl = fileUrl.split('?')[0];
  const url = new URL(cleanUrl);
  const hostname = url.hostname;
  const pathname = url.pathname.replace(/^\/+/, '');

  let bucket;
  let key = pathname;

  // Case A + B — my-bucket.s3.amazonaws.com  /  my-bucket.s3.us-west-2.amazonaws.com
  if (hostname.includes('.s3')) {
    bucket = hostname.split('.s3')[0];
  }
  // Case C — s3.amazonaws.com/my-bucket/path/to/file
  else if (hostname === 's3.amazonaws.com' || hostname.startsWith('s3.')) {
    const parts = pathname.split('/');
    bucket = parts.shift();
    key = parts.join('/');
  } else {
    throw new Error(`Unrecognized S3 URL format: ${fileUrl}`);
  }

  return {
    bucket,
    key,
    s3Uri: `s3://${bucket}/${key}`,
  };
}

// parse from s3Uri stored in DB, or build from bucket/key
export function parseS3Uri(uri: string) {
  if (!uri.startsWith("s3://")) throw new Error("Not an s3:// URI");
  const without = uri.slice(5); // drop 's3://'
  const idx = without.indexOf("/");
  if (idx === -1) throw new Error("No key in S3 URI");
  return {
    bucket: without.slice(0, idx),
    key: without.slice(idx + 1),
  };
}

export function buildS3Uri(bucket: string, key: string) {
  // key is the raw S3 object key you used in PutObject
  // encodeURI will encode spaces, Chinese, brackets, etc.,
  // but leave "/" intact so prefixes still work.
  // DO NOT encode bucket; encode ONLY key
  const encodedKey = encodeURI(key);
  return `s3://${bucket}/${encodedKey}`;
}

const extToMime = {
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    weba: "audio/webm",
    opus: "audio/ogg",
    oga: "audio/ogg",
    aac: "audio/aac",
    wav: "audio/wav",
    flac: "audio/flac",

  };

export type AudioExt = keyof typeof extToMime;
// "mp3" | "m4a" | "webm" | "opus" | "oga" | "aac" | "wav" | "flac"

export const AUDIO_EXTENSIONS: AudioExt[] = Object.keys(extToMime) as AudioExt[];

export function toAudioExt(value: string): AudioExt | null {
  return (AUDIO_EXTENSIONS as string[]).includes(value)
    ? (value as AudioExt)
    : null;
}

export function assertAudioExt(value: string): AudioExt {
  if ((AUDIO_EXTENSIONS as string[]).includes(value)) {
    return value as AudioExt;
  }
  throw new Error(`Invalid audio extension: ${value}`);
}

export function isAudioExt(value: string): value is AudioExt {
  return (AUDIO_EXTENSIONS as string[]).includes(value);
}

export function extToMimeType (ext:AudioExt = 'm4a') {
  const mime = extToMime[ext] || "application/octet-stream";
  return mime;
}

/**
 * Encode an S3 object key so it can safely appear in URLs or paths.
 * Uses encodeURIComponent so `/`, spaces, unicode, etc. are encoded.
 *
 * Example:
 *   "tts/user123/audio 1.mp3"
 *   -> "tts%2Fuser123%2Faudio%201.mp3"
 */
export function encodeS3Key(key: string): string {
  return encodeURIComponent(key);
}

/**
 * Decode an encoded S3 key that was produced by encodeS3Key.
 * Uses decodeURIComponent so %2F -> '/' etc.
 *
 * Throws URIError if the encoded string is malformed.
 */
export function decodeS3Key(encodedKey: string): string {
  return decodeURIComponent(encodedKey);
}

/**
 * Safe variant that returns null instead of throwing.
 */
export function tryDecodeS3Key(encodedKey: string): string | null {
  try {
    return decodeURIComponent(encodedKey);
  } catch {
    return null;
  }
}

export interface ParsedS3Url {
  bucket: string;
  key: string;    // decoded key, e.g. "tts/user123/audio.mp3"
  rawKey: string; // the path portion before decode
}

/**
 * Type guard-ish helper: is this an s3:// URI?
 *
 * NOTE: This just checks the scheme, it doesn't validate bucket/key.
 */
export function isS3Uri(url: string): boolean {
  return url.startsWith("s3://");
}

/**
 * Parse an S3 URL or URI into { bucket, key }.
 *
 * Supports:
 *   - s3://bucket/key
 *   - https://bucket.s3.region.amazonaws.com/key
 *   - https://s3.region.amazonaws.com/bucket/key
 *
 * If `defaultBucket` is provided and the URL doesn't clearly specify a bucket,
 * it will be used as a fallback (e.g. CloudFront or custom domains).
 */
export function parseS3Url(url: string, defaultBucket?: string): ParsedS3Url {
  // Handle s3://bucket/key style
  if (url.startsWith("s3://")) {
    const withoutScheme = url.slice("s3://".length); // "bucket/key..."
    const firstSlash = withoutScheme.indexOf("/");

    if (firstSlash === -1) {
      throw new Error(`Invalid S3 URI (no key): ${url}`);
    }

    const bucket = withoutScheme.slice(0, firstSlash);
    const rawKey = withoutScheme.slice(firstSlash + 1); // may be encoded
    const key = decodeS3Key(rawKey);

    return { bucket, key, rawKey };
  }

  // For everything else, try normal URL parsing
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  const host = parsed.hostname; // e.g. "my-bucket.s3.us-west-2.amazonaws.com"
  const path = parsed.pathname || "/";

  const pathWithoutLeadingSlash = path.startsWith("/")
    ? path.slice(1)
    : path;

  // Case 1: virtual-hosted–style: "<bucket>.s3.<region>.amazonaws.com"
  const virtualHostedMatch = host.match(/^([^\.]+)\.s3[.-][^\.]+\.amazonaws\.com$/);
  if (virtualHostedMatch) {
    const bucket = virtualHostedMatch[1];
    const rawKey = pathWithoutLeadingSlash;
    const key = decodeS3Key(rawKey);
    return { bucket, key, rawKey };
  }

  // Case 2: path-style: "s3.<region>.amazonaws.com/<bucket>/<key>"
  const pathStyleMatch = host.match(/^s3[.-][^\.]+\.amazonaws\.com$/);
  if (pathStyleMatch) {
    const segments = pathWithoutLeadingSlash.split("/");
    if (segments.length < 2) {
      throw new Error(`Invalid S3 path-style URL (no bucket/key): ${url}`);
    }

    const bucket = segments[0];
    const rawKey = segments.slice(1).join("/");
    const key = decodeS3Key(rawKey);
    return { bucket, key, rawKey };
  }

  // Case 3: custom domain / CloudFront; require defaultBucket to map to S3
  if (defaultBucket) {
    const rawKey = pathWithoutLeadingSlash;
    const key = decodeS3Key(rawKey);
    return { bucket: defaultBucket, key, rawKey };
  }

  throw new Error(`Unable to infer S3 bucket from URL: ${url}`);
}
