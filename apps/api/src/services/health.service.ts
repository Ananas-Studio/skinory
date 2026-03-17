export function getHealthPayload() {
  return {
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString(),
  };
}
