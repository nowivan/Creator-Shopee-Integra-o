import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut,
  User
} from "firebase/auth";
import { auth } from "./firebase";

// TASK 8 — Error mapping helper
export function mapFirebaseAuthError(error: any): string {
  const code = error?.code || error?.message || "";
  
  switch (code) {
    case "auth/email-already-in-use":
      return "Este e-mail já está em uso.";
    case "auth/invalid-email":
      return "Informe um e-mail válido.";
    case "auth/weak-password":
      return "A senha deve ter pelo menos 6 caracteres.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-mail ou senha inválidos.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Tente novamente mais tarde.";
    case "auth/popup-closed-by-user":
      return "Login cancelado.";
    default:
      if (typeof code === "string" && code.includes("network-request-failed")) {
        return "Verifique sua conexão e tente novamente.";
      }
      return "Não foi possível concluir a autenticação.";
  }
}

// TASK 2 — Client-side validation helper
export function validateAuthInputs(
  email: string, 
  password?: string, 
  displayName?: string, 
  isRegister = false
) {
  // Email check
  if (!email || !email.trim()) {
    return "Informe um e-mail válido.";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return "Informe um e-mail válido.";
  }

  // Password check (if provided or required)
  if (password !== undefined) {
    if (!password || password.length < 6) {
      return "A senha deve ter pelo menos 6 caracteres.";
    }
  }

  // Display Name check (optional on register, max 40 chars)
  if (isRegister && displayName && displayName.trim().length > 40) {
    return "O nome deve ter no máximo 40 caracteres.";
  }

  return null; // All valid
}

// TASK 1 — Firebase Auth service functions

export async function registerWithEmail(email: string, password: string, displayName?: string): Promise<User> {
  const validationError = validateAuthInputs(email, password, displayName, true);
  if (validationError) {
    throw new Error(validationError);
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    // Update profile with display name if provided
    if (displayName && displayName.trim()) {
      await updateProfile(user, {
        displayName: displayName.trim()
      });
    }

    // Send verification email immediately
    await sendVerificationEmail(user);

    return user;
  } catch (error: any) {
    console.error("[AUTH] Registration Error:", error);
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const validationError = validateAuthInputs(email, password);
  if (validationError) {
    throw new Error(validationError);
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return userCredential.user;
  } catch (error: any) {
    console.error("[AUTH] Login Error:", error);
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("[AUTH] Google Login Error:", error);
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error("[AUTH] Sign Out Error:", error);
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function sendResetPassword(email: string): Promise<void> {
  const validationError = validateAuthInputs(email);
  if (validationError) {
    throw new Error(validationError);
  }

  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error: any) {
    console.error("[AUTH] Password Reset Error:", error);
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function sendVerificationEmail(user: User): Promise<void> {
  try {
    await sendEmailVerification(user);
    console.log("[AUTH] Verification email sent successfully to", user.email);
  } catch (error: any) {
    console.error("[AUTH] Send Verification Email Error:", error);
    throw new Error(mapFirebaseAuthError(error));
  }
}

export function getCurrentAuthUser(): User | null {
  return auth.currentUser;
}
