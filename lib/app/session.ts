export const DEMO_SESSION_COOKIE = "ceorader_demo_session";
export const DEMO_SESSION_VALUE = "active";
export const DEMO_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function setDemoSessionCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${DEMO_SESSION_COOKIE}=${DEMO_SESSION_VALUE}; path=/; max-age=${DEMO_SESSION_MAX_AGE}; samesite=lax`;
}

export function clearDemoSessionCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
