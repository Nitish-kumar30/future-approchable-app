# Upload search illustration to the `course-images` bucket

Publish the uploaded illustration (magnifying glass over a book with course/analytics icons) to the public `course-images` storage bucket so it can be referenced by a public URL.

## Steps

1. Copy the uploaded file into the project as a temporary source (`public/search_more_image.png`) so the storage upload tool can read it.
2. Upload it to the `course-images` bucket at path `search_more_image.png` using the storage upload tool.
3. Return the resulting public URL.
4. Remove the temporary local copy so the repo stays clean.

## Notes

- `course-images` already exists and is public, so no bucket or policy changes are needed.
- The upload targets the backend attached to this branch. The live/production backend is a separate storage instance — if the image must exist on the live project too, say so and I'll repeat the upload against production.
- No app code changes are included. If you also want the image used somewhere in the UI, tell me where and I'll add it.
