import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Reads the service account JSON, forgiving the usual copy-and-paste damage: quotes wrapped
 * around the whole thing, curly quotes from a word processor, or the file pasted base64-encoded.
 * The error never echoes the key, only what shape it has.
 */
function parseServiceAccount(raw: string): any {
  let text = raw.trim();
  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"') && !text.startsWith('"{'))) {
    text = text.slice(1, -1).trim();
  }
  if (text.startsWith('"{') && text.endsWith('}"')) text = text.slice(1, -1);
  text = text.replace(/[\u201C\u201D\u2033]/g, '"').replace(/[\u2018\u2019]/g, "'");
  const attempts = [text];
  if (!text.startsWith("{")) {
    try {
      attempts.push(Buffer.from(text, "base64").toString("utf8").trim());
    } catch {}
  }
  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && parsed.private_key && parsed.client_email) return parsed;
    } catch {}
  }
  throw new Error(
    `FIREBASE_SERVICE_ACCOUNT_KEY isn’t a valid service account file (${text.length} characters, starts with ` +
      `"${text.slice(0, 1)}", ends with "${text.slice(-1)}"). Paste the whole downloaded file, from { to }, as plain text.`
  );
}

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Paste your service account JSON " +
        "(as a single-line string) into .env.local."
    );
  }

  const serviceAccount = parseServiceAccount(raw);
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
