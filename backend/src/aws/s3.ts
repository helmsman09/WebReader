// backend/src/aws/s3.ts
import fs from 'fs';
import path from 'path';
import type { UploadedFile } from "@news-capture/types";

import { extToMimeType, type AudioExt, makeUploadKey,makeUserPrefix, makeJobPrefix} from '../utils/s3utils';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl as presign } from '@aws-sdk/s3-request-presigner';
import {parseS3Url} from '../utils/s3utils'

const BUCKET = process.env.S3_BUCKET;

const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,             // was s3ForcePathStyle in v2
  credentials: (process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY)
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      }
    : undefined,                    // rely on IAM/role if not set
});

export async function putS3(tempPath: string, key: string) {
  const Body = fs.createReadStream(tempPath);
  const bucket = BUCKET;
  const ext = path.extname(tempPath).slice(1);
  const mime = extToMimeType( ext as AudioExt);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body,
      ContentType: mime,
    })
  );
  return { storageKey: 's3://' + bucket + '/' + key };
}

// NOTE: now async
export async function getSignedUrl(s3Uri: string, expirySeconds = 3600) {
  // s3Uri: 's3://bucket/key'
  const {bucket, key} = parseS3Url(s3Uri);

  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return presign(s3, cmd, { expiresIn: expirySeconds });
}

// NOTE: now async
export async function getSignedPutUrl(key: string, contentType: string, maxAgeSeconds = 900){
   const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return presign(s3, cmd, { expiresIn: maxAgeSeconds });
}

export async function deleteFromS3(s3Uri: string) {
  // s3Uri: 's3://bucket/key'
  const [, , bucket, ...keyParts] = s3Uri.split('/');
  const Key = keyParts.join('/');
  const Bucket = bucket;

  console.log(`[delete job] (Bucket:${Bucket}, Key:${Key}`);
  try {
    await s3.send(new DeleteObjectCommand({ Bucket, Key }));
  } catch(err){
    console.error(`[delete job] s3 delete (bucket:${Bucket}, key:${Key}) got error: ${err}`);
  }
}

async function uploadUserFile({ env, userId, file, contentType }:
        { env: string, userId: string, file: UploadedFile, contentType: string }) {
  const timestamp = Date.now();
  const key = makeUploadKey({
    env,
    userId,
    timestamp,
    filename: file.originalname,
  });

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,      // or stream
    ContentType: contentType,
  }));

  return {
    key,
    s3Uri: `s3://${BUCKET}/${key}`,
    fileUrl: `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  };
}

async function listUserObjects(env: string, userId: string) {
  const prefix = makeUserPrefix({ env, userId }); // e.g. "prod/users/user_123"
  const res = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix + '/',
  }));
  return res.Contents || [];
}

async function deleteJobObjects(env: string, userId: string, jobId: string) {
  const prefix = makeJobPrefix({ env, userId, jobId }); // "prod/users/id/jobs/job_abc123"

  const listed = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix + '/',
  }));

  if (!listed.Contents || listed.Contents.length === 0) return;

  await s3.send(new DeleteObjectsCommand({
    Bucket: BUCKET,
    Delete: {
      Objects: listed.Contents.map(obj => ({ Key: obj.Key })),
      Quiet: true,
    },
  }));
}

export async function uploadTtsAudioToS3(
  userId: string,
  pageId: string,
  audioBuffer: Buffer,
  opts?: { contentType?: string }
):Promise < string > {
  const bucket = process.env.AWS_TTS_BUCKET!;
  pageId = pageId ?? 'nopage';
  const key = `tts/${userId}/${pageId}/${Date.now()}.mp3`; // or .wav if you send wav

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: audioBuffer,
      ContentType: opts?.contentType ?? "audio/mpeg",
      ACL: "private", // or "public-read" depending on how you serve it
    })
  );

  // you can return either S3 URL or a signed URL later
  const src = `s3://${bucket}/${encodeURIComponent(key)}`;

  return src;
}
