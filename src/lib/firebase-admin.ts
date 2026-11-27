import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Paste your service account JSON " +
        "(as a single-line string) into .env.local."
    );
  }

  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY isn’t valid JSON. Paste the whole contents of the downloaded service account file, starting with { and ending with }, with no extra quotes around it."
    );
  }
  // Handle escaped newlines in the private key when pasted as a single-line env var
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminBucket() {
  // The bucket is named after the Firebase project ("<project>.firebasestorage.app"), so when the
  // setting is missing or blank it is worked out from the service account key Studio already needs.
  const app = getAdminApp();
  let bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || "";
  if (!bucketName) {
    try {
      const projectId = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}").project_id;
      if (projectId) bucketName = `${projectId}.firebasestorage.app`;
    } catch {}
  }
  if (!bucketName) {
    throw new Error("Couldn’t work out the Firebase storage bucket. Set FIREBASE_STORAGE_BUCKET.");
  }
  return getStorage(app).bucket(bucketName);
}
