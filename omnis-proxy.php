<?php
// CORS Proxy for Omnis Web Deployment
$origin = isset($_SERVER["HTTP_ORIGIN"]) ? $_SERVER["HTTP_ORIGIN"] : "*";
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE, PATCH");
header("Access-Control-Allow-Headers: Content-Type, X-Omnis-Data, Authorization, X-Requested-With, Accept");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit(0);
}

// Polyfill for getallheaders if not exists (e.g., Nginx/PHP-FPM)
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            } else if ($name == "CONTENT_TYPE") {
                $headers["Content-Type"] = $value;
            } else if ($name == "CONTENT_LENGTH") {
                $headers["Content-Length"] = $value;
            }
        }
        return $headers;
    }
}

$targetUrl = isset($_GET["url"]) ? $_GET["url"] : "";
if (empty($targetUrl)) {
    http_response_code(400);
    echo json_encode(["error" => "No target URL specified"]);
    exit;
}

$parsedTarget = parse_url($targetUrl);
$targetHost = isset($parsedTarget['host']) ? $parsedTarget['host'] : '';
$prefix = "omnis_" . substr(md5($targetHost), 0, 6) . "_";

$ch = curl_init($targetUrl);
$headers = array();
$incomingHeaders = getallheaders();

$rawCookies = [];
foreach ($incomingHeaders as $name => $value) {
    $lowerName = strtolower($name);
    if ($lowerName === "cookie") {
        $cookieParts = explode(';', $value);
        foreach ($cookieParts as $part) {
            $part = trim($part);
            if (empty($part)) continue;
            $eqPos = strpos($part, '=');
            if ($eqPos !== false) {
                $cName = substr($part, 0, $eqPos);
                $cVal = substr($part, $eqPos + 1);
            } else {
                $cName = $part;
                $cVal = '';
            }
            if (strpos($cName, $prefix) === 0) {
                $realKey = substr($cName, strlen($prefix));
                $rawCookies[] = $realKey . "=" . $cVal;
            }
        }
    } else if ($lowerName !== "host" && $lowerName !== "content-length" && $lowerName !== "accept-encoding") {
        $headers[] = "$name: $value";
    }
}

if (!empty($rawCookies)) {
    $headers[] = "Cookie: " . implode("; ", $rawCookies);
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
// Automatically decompress responses to prevent invalid JSON errors
curl_setopt($ch, CURLOPT_ENCODING, ""); 
// Disable SSL verification if there are cacert issues on the host
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

$payload = file_get_contents("php://input");
if (empty($payload) && !empty($_POST)) {
    $payload = http_build_query($_POST);
}

// DEBUG LOGGING
file_put_contents(__DIR__ . '/proxy_debug.log', "[" . date('Y-m-d H:i:s') . "] REQUEST: " . $_SERVER["REQUEST_METHOD"] . " " . $targetUrl . "\nPayload: " . $payload . "\n", FILE_APPEND);

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
} else if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER["REQUEST_METHOD"]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
}

$response = curl_exec($ch);

if ($response === false) {
    $err = curl_error($ch);
    $serverIp = isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : 'Unknown';
    file_put_contents(__DIR__ . '/proxy_debug.log', "CURL ERROR: " . $err . "\nServer IP: " . $serverIp . "\n\n", FILE_APPEND);
    http_response_code(502);
    echo json_encode(["message" => "Proxy Error", "error" => "Connection failed. Please whitelist the web server IP ($serverIp) on the Frappe server firewall."]);
    curl_close($ch);
    exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$responseHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);

file_put_contents(__DIR__ . '/proxy_debug.log', "RESPONSE CODE: " . $httpCode . "\nBody: " . $responseBody . "\n\n", FILE_APPEND);

curl_close($ch);

http_response_code($httpCode);

foreach (explode("\r\n", $responseHeaders) as $hdr) {
    // Strip duplicate CORS headers and encoding headers
    if (!empty($hdr) && 
        stripos($hdr, "Transfer-Encoding") === false && 
        stripos($hdr, "Content-Encoding") === false &&
        stripos($hdr, "Access-Control-") === false &&
        stripos($hdr, "HTTP/") !== 0) { // Do not pass the HTTP status line
        
        // Rewrite cookie domains so they work on the proxy domain
        if (stripos($hdr, "Set-Cookie:") === 0) {
            // Add prefix to cookie name
            $hdr = preg_replace("/^Set-Cookie:\s*([^=]+)=/i", "Set-Cookie: " . $prefix . "$1=", $hdr);
            $hdr = preg_replace("/Domain=[^;]+/i", "Domain=" . $_SERVER["HTTP_HOST"], $hdr);
            // Optional: Remove Secure flag if proxy is HTTP
            if (!isset($_SERVER["HTTPS"]) || $_SERVER["HTTPS"] !== "on") {
                $hdr = preg_replace("/;\s*Secure/i", "", $hdr);
                $hdr = preg_replace("/;\s*SameSite=None/i", "; SameSite=Lax", $hdr);
            }
        }
        header($hdr, false);
    }
}
echo $responseBody;
?>
