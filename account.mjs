const $ = selector => document.querySelector(selector);
const dialog = $("#accountDialog");
const form = $("#accountForm");
const status = $("#accountStatus");
const email = $("#accountEmail");
const password = $("#accountPassword");
let auth;
let sdk;
let mode = "login";
let busy = false;
let unavailable = "";

function render(message){
  const user = auth?.currentUser;
  const heading = user ? "Your account" : {login: "Log in", create: "Create account", reset: "Reset password"}[mode];
  $("#accountTitle").textContent = heading;
  $("#accountLink").textContent = user ? "Account" : "Log in";
  form.hidden = !auth || Boolean(user);
  $("#accountLinks").hidden = form.hidden;
  $("#accountSession").hidden = !user;
  $("#verifySend").hidden = $("#verifyCheck").hidden = !user || user.emailVerified;

  const reset = mode === "reset";
  $("#passwordField").hidden = reset;
  password.disabled = reset;
  password.required = !reset;
  password.minLength = mode === "create" ? 8 : 0;
  password.autocomplete = mode === "create" ? "new-password" : "current-password";
  $("#accountSubmit").textContent = reset ? "Send reset email" : heading;
  $("#accountSwitch").textContent = mode === "login" ? "Create account" : "Back to log in";
  $("#accountReset").hidden = mode !== "login";
  for (const button of dialog.querySelectorAll("button:not([aria-label])")) button.disabled = busy;

  status.textContent = message || unavailable || (user
    ? user.email + (user.emailVerified ? " · Email verified" : " · Verify your email to confirm your address.")
    : auth ? "" : "Connecting to account service…");
}

async function connect(){
  try {
    const response = await fetch("firebase-config.json", {cache: "no-store", signal: AbortSignal.timeout?.(8000)});
    const config = response.ok ? await response.json() : {};
    if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
      unavailable = "Accounts are not available yet. You can still search for clinicians.";
      render();
      return;
    }
    const [{initializeApp}, firebaseAuth] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js")
    ]);
    sdk = firebaseAuth;
    const service = sdk.getAuth(initializeApp(config));
    await service.authStateReady();
    auth = service;
    sdk.onAuthStateChanged(auth, () => { if (!busy) render(); });
    render();
  } catch {
    unavailable = "The account service is unavailable. Reload the page and try again.";
    render();
  }
}

async function run(action){
  if (!auth || busy) return;
  busy = true;
  render("Working…");
  let message;
  try {
    message = await action();
  } catch (error) {
    const messages = {
      "auth/invalid-credential": "Check your email and password and try again.",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/email-already-in-use": "Try logging in or resetting your password.",
      "auth/weak-password": "Choose a stronger password and try again.",
      "auth/password-does-not-meet-requirements": "Choose a stronger password and try again.",
      "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
      "auth/network-request-failed": "Check your connection and try again."
    };
    message = messages[error.code] || "The account action could not be completed. Try again.";
  } finally {
    busy = false;
    password.value = "";
    render(message);
  }
}

function setMode(next){
  mode = next;
  password.value = "";
  render();
  email.focus();
}

$("#accountLink").addEventListener("click", event => {
  event.preventDefault();
  mode = "login";
  render();
  dialog.showModal();
});
dialog.addEventListener("close", () => form.reset());
$("#accountSwitch").addEventListener("click", () => setMode(mode === "login" ? "create" : "login"));
$("#accountReset").addEventListener("click", () => setMode("reset"));

form.addEventListener("submit", event => {
  event.preventDefault();
  if (auth?.currentUser) return;
  const address = email.value.trim();
  run(async () => {
    if (mode === "create") {
      const {user} = await sdk.createUserWithEmailAndPassword(auth, address, password.value);
      try {
        await sdk.sendEmailVerification(user);
        return "Account created. Check your inbox for a verification link.";
      } catch {
        return "Account created. Select Resend verification email to try sending the link again.";
      }
    }
    if (mode === "reset") {
      try {
        await sdk.sendPasswordResetEmail(auth, address);
      } catch (error) {
        if (error.code !== "auth/user-not-found") throw error;
      }
      mode = "login";
      return "If an account exists for that address, a password reset email will arrive shortly.";
    }
    await sdk.signInWithEmailAndPassword(auth, address, password.value);
  });
});

$("#verifySend").addEventListener("click", () => run(async () => {
  await sdk.sendEmailVerification(auth.currentUser);
  return "Verification email sent. Check your inbox.";
}));
$("#verifyCheck").addEventListener("click", () => run(async () => {
  const user = auth.currentUser;
  await sdk.reload(user);
  return user.emailVerified ? undefined : "Open the link in your verification email, then check again.";
}));
$("#accountLogout").addEventListener("click", () => run(async () => {
  await sdk.signOut(auth);
  mode = "login";
  form.reset();
  return "You are logged out.";
}));

render();
connect();
