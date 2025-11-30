// src/models/media.ts (pseudo)
export interface MediaRecord {
  _id: string;
  bucket: string;
  key: string;
  contentType?: string;
  ownerId: string;
  // maybe: allowedUserIds: string[];
  // maybe: isPublic: boolean;
}

// Pretend this talks to Mongo
export async function findMediaById(mediaId: string): Promise<MediaRecord | null> {
  // TODO: replace with actual DB call
  return null;
}

export async function userCanAccessMedia(
  userId: string,
  media: MediaRecord
): Promise<boolean> {
  // Very simple example: owner only
  if (media.ownerId === userId) return true;

  // Extend here:
  // - team members
  // - shared-with list
  // - active subscription etc.

  return false;
}
