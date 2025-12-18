import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const getUrl = async (key: string, expiresIn: number = 900) => {
  return await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }), { expiresIn });
};

const generateUploadUrl = async () => {
  const key = crypto.randomUUID();

  const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }));
  return { key, url };
};

const deleteObject = async (key: string) => {
  await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }));
};

const getFileType = async (file: Uint8Array | Buffer | Blob) => {
  if (file instanceof Blob) {
    return file.type;
  }
};

const store = async (file: Uint8Array | Buffer | Blob) => {
  const key = crypto.randomUUID();

  const fileType = await getFileType(file);

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: file,
    ContentType: fileType,
  });

  await s3.send(command);

  return key;
};

export { getUrl, generateUploadUrl, deleteObject, store };
