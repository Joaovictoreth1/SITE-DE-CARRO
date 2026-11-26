import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  initializeAuth,
  inMemoryPersistence,
  signInAnonymously,
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  setLogLevel,
  Timestamp,
} from "firebase/firestore/lite";

setLogLevel("error");

type Session = "owner" | "other" | "visitor" | "anonymous";

test("only a password-authenticated owner can create or get the exact telemetry record", async () => {
  const id = randomUUID();
  const apps: FirebaseApp[] = [];
  const makeSession = async (session: Session) => {
    const app = initializeApp(
      { projectId: "demo-motornews", apiKey: "fake-emulator-key" },
      `${id}-${session}`,
    );
    apps.push(app);
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    if (session === "anonymous") await signInAnonymously(auth);
    else if (session !== "visitor")
      await createUserWithEmailAndPassword(
        auth,
        `${id}-${session}@example.test`,
        "synthetic-test-pass!",
      );
    const db = getFirestore(app);
    connectFirestoreEmulator(db, "127.0.0.1", 8081);
    return { db, uid: auth.currentUser?.uid ?? "" };
  };

  try {
    const owner = await makeSession("owner");
    const other = await makeSession("other");
    const visitor = await makeSession("visitor");
    const anonymous = await makeSession("anonymous");
    const record = (
      session: Awaited<ReturnType<typeof makeSession>>,
      uid = owner.uid,
      node = "FEV-01",
    ) => doc(session.db, "users", uid, "telemetry", node);
    const data = { node: "FEV-01", createdAt: serverTimestamp() };
    const denied = { code: "permission-denied" };

    await expect(getDoc(record(visitor))).rejects.toMatchObject(denied);
    await expect(getDoc(record(other))).rejects.toMatchObject(denied);
    await expect(setDoc(record(other), data)).rejects.toMatchObject(denied);
    await expect(
      setDoc(record(anonymous, anonymous.uid), data),
    ).rejects.toMatchObject(denied);
    await expect(
      setDoc(record(owner, owner.uid, "OTHER"), data),
    ).rejects.toMatchObject(denied);
    await expect(
      setDoc(record(owner), { node: data.node }),
    ).rejects.toMatchObject(denied);
    await expect(
      setDoc(record(owner), { ...data, node: "OTHER" }),
    ).rejects.toMatchObject(denied);
    await expect(
      setDoc(record(owner), { ...data, createdAt: Timestamp.fromMillis(0) }),
    ).rejects.toMatchObject(denied);
    await expect(
      setDoc(record(owner), { ...data, email: "extra@example.test" }),
    ).rejects.toMatchObject(denied);
    await expect(
      setDoc(
        doc(
          owner.db,
          "artifacts",
          "motornews-os",
          "public",
          "data",
          "accounts",
          "legacy",
        ),
        data,
      ),
    ).rejects.toMatchObject(denied);

    await setDoc(record(owner), data);
    expect((await getDoc(record(owner))).data()).toEqual({
      node: "FEV-01",
      createdAt: expect.any(Timestamp),
    });
    await expect(getDoc(record(other))).rejects.toMatchObject(denied);
    await expect(
      getDocs(collection(owner.db, "users", owner.uid, "telemetry")),
    ).rejects.toMatchObject(denied);
    await expect(setDoc(record(owner), data)).rejects.toMatchObject(denied);
    await expect(deleteDoc(record(owner))).rejects.toMatchObject(denied);
  } finally {
    await Promise.all(apps.map(deleteApp));
  }
});
