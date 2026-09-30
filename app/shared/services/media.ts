import { sql, session, File, ValidationError } from "@elements/app";
import { uuidOrThrow } from "#app/shared/services/forum";

// Types this forum stores and serves inline. Anything else is refused on the
// way in and sent as an opaque download on the way out.
export const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export interface Media {
  id: string;
  name: string;
  contentType: string;
  hash: string;
}

export interface MediaBytes extends Media {
  data: Buffer;
}

export function mediaUrl(m: { id: string; hash: string }): string {
  return `/media/${m.id}/${m.hash}`;
}

export function readMedia(id: string): MediaBytes {
  uuidOrThrow(id, "image");

  return sql<MediaBytes>(
    `select id, name, contentType, hash, data from uploads where id = ${id}`,
  ).firstOrThrow("image not found");
}

export function storeImage(file: File): Media {
  if (!IMAGE_TYPES.has(file.contentType)) {
    throw new ValidationError(`${file.name} is not a png, jpeg, gif or webp image`);
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new ValidationError(`${file.name} is over 4 MB`);
  }

  return sql<Media>(`
    insert into uploads (userId, name, contentType, size, data)
         values (${session.getOrThrow("userId")}, ${file.name}, ${file.contentType}, ${file.size}, ${file.data})
      returning id, name, contentType, hash
  `).firstOrThrow();
}

/**
 * Uploads images for a post and returns the markdown that embeds them.
 * @rpc
 */
export function uploadImages(form: { files: File[] }): string {
  session.isLoggedInOrThrow();

  let lines: string[] = [];

  for (let file of form.files) {
    let m = storeImage(file);
    let alt = file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[\[\]]/g, "");
    lines.push(`![${alt}](${mediaUrl(m)})`);
  }

  return lines.join("\n\n");
}
