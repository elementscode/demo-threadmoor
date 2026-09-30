import { Request, Response } from "@elements/app";
import { readMedia, IMAGE_TYPES } from "#app/shared/services/media";

const YEAR = 31536000;

export default function serveMedia(req: Request, res: Response) {
  let m = readMedia(req.params.id);

  // The hash in the path names the bytes. A stale one is a 404, never the
  // current bytes under an old key a cache would then keep.
  if (req.params.hash !== m.hash) {
    res.status(404);
    return res.end();
  }

  if (IMAGE_TYPES.has(m.contentType)) {
    res.setHeader("Content-Type", m.contentType);
  } else {
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", "attachment");
  }

  res.setHeader("Cache-Control", `public, max-age=${YEAR}, immutable`);

  return m.data;
}
