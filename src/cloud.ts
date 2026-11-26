import { FirebaseError, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  initializeAuth,
  inMemoryPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore/lite";
import type { CloudConfig } from "./cloud-config.ts";

const telemetryNode = "FEV-01";

export interface Operator {
  uid: string;
  email: string | null;
}

export function openCloud(config: CloudConfig, useEmulators: boolean) {
  const app = initializeApp(config);
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  const db = getFirestore(app);

  if (useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8081);
  }

  return {
    observeAuth: (callback: (operator: Operator | null) => void) =>
      onAuthStateChanged(auth, (user) =>
        callback(
          user && !user.isAnonymous
            ? { uid: user.uid, email: user.email }
            : null,
        ),
      ),
    signIn: async (email: string, password: string, registering: boolean) => {
      const authenticate = registering
        ? createUserWithEmailAndPassword
        : signInWithEmailAndPassword;
      await authenticate(auth, email, password);
    },
    signOut: () => signOut(auth),
    registerTelemetry: async (operator: Operator) => {
      if (auth.currentUser?.uid !== operator.uid)
        throw new Error("Sessão encerrada.");
      const record = doc(db, "users", operator.uid, "telemetry", telemetryNode);
      return runTransaction(db, async (transaction) => {
        if ((await transaction.get(record)).exists()) return "existing";
        transaction.set(record, {
          node: telemetryNode,
          createdAt: serverTimestamp(),
        });
        return "created";
      });
    },
  };
}

export function authErrorMessage(error: unknown): string {
  const code = error instanceof FirebaseError ? error.code : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "E-mail ou senha inválidos.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "A senha não atende aos requisitos de segurança do projeto.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde antes de tentar novamente.";
    default:
      return "Não foi possível autenticar. Verifique a conexão ou tente novamente.";
  }
}
