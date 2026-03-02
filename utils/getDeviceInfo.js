//extrae información del dispositivo desde el request

function getDeviceInfo(req) {
  const userAgent = req.headers["user-agent"] || "";
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown";

  //detectar dispositivo
  let device = "desktop";
  if (/mobile|android|iphone|ipad/i.test(userAgent)) {
    device = "mobile";
  } else if (/tablet|ipad/i.test(userAgent)) {
    device = "tablet";
  }

  //detectar navegador
  let browser = "unknown";
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Edge")) browser = "Edge";
  else if (userAgent.includes("Opera")) browser = "Opera";

  //detectar OS
  let os = "unknown";
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac")) os = "macOS";
  else if (userAgent.includes("Linux")) os = "Linux";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iOS") || userAgent.includes("iPhone"))
    os = "iOS";

  return {
    userAgent,
    ip,
    device,
    browser,
    os,
  };
}

module.exports = getDeviceInfo;

