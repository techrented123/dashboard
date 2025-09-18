// SRP-6a implementation for AWS Cognito using Web Crypto API
// NOTE: This file is currently unused as the app uses AWS Amplify Auth instead
// The functions below are kept for potential future use but are commented out

/*
const N_HEX =
  "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF";
const g = BigInt(2);
const N = BigInt("0x" + N_HEX);

let srpA: string;
let srpPrivateA: bigint;

// Helper function to convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Helper function to convert hex string to ArrayBuffer
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

// Web Crypto API SHA-256 hash
async function sha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return arrayBufferToHex(hashBuffer);
}

// Web Crypto API HMAC-SHA256
async function hmacSha256(
  key: ArrayBuffer,
  data: ArrayBuffer
): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export function calculateSrpA(username: string): string {
  // Generate random private key a (128 bytes)
  const randomArray = new Uint8Array(128);
  crypto.getRandomValues(randomArray);
  srpPrivateA = BigInt("0x" + arrayBufferToHex(randomArray.buffer)) % N;

  // Calculate A = g^a mod N
  const A = modPow(g, srpPrivateA, N);
  srpA = A.toString(16).toUpperCase().padStart(512, "0");

  return srpA;
}

export async function calculateSrpClientEvidenceM1(
  username: string,
  password: string,
  salt: string,
  srpB: string,
  secretBlock: string
): Promise<string> {
  const B = BigInt("0x" + srpB);

  // Calculate u = H(A, B)
  const aBuffer = hexToArrayBuffer(srpA.padStart(512, "0"));
  const bBuffer = hexToArrayBuffer(srpB.padStart(512, "0"));
  const abBuffer = new ArrayBuffer(aBuffer.byteLength + bBuffer.byteLength);
  const abView = new Uint8Array(abBuffer);
  abView.set(new Uint8Array(aBuffer), 0);
  abView.set(new Uint8Array(bBuffer), aBuffer.byteLength);

  const uHex = await sha256(abBuffer);
  const u = BigInt("0x" + uHex);

  // Calculate x = H(salt, H(username:password))
  const usernamePasswordText = `${username}:${password}`;
  const usernamePasswordBuffer = new TextEncoder().encode(usernamePasswordText);
  const usernamePasswordHash = await sha256(usernamePasswordBuffer);

  const saltBuffer = hexToArrayBuffer(salt);
  const usernamePasswordHashBuffer = hexToArrayBuffer(usernamePasswordHash);
  const saltHashBuffer = new ArrayBuffer(
    saltBuffer.byteLength + usernamePasswordHashBuffer.byteLength
  );
  const saltHashView = new Uint8Array(saltHashBuffer);
  saltHashView.set(new Uint8Array(saltBuffer), 0);
  saltHashView.set(
    new Uint8Array(usernamePasswordHashBuffer),
    saltBuffer.byteLength
  );

  const xHex = await sha256(saltHashBuffer);
  const x = BigInt("0x" + xHex);

  // Calculate k
  const nBuffer = hexToArrayBuffer(N.toString(16).padStart(512, "0"));
  const gBuffer = hexToArrayBuffer("02");
  const ngBuffer = new ArrayBuffer(nBuffer.byteLength + gBuffer.byteLength);
  const ngView = new Uint8Array(ngBuffer);
  ngView.set(new Uint8Array(nBuffer), 0);
  ngView.set(new Uint8Array(gBuffer), nBuffer.byteLength);

  const kHex = await sha256(ngBuffer);
  const k = BigInt("0x" + kHex);

  // Calculate S = (B - k * g^x)^(a + u * x) mod N
  const gx = modPow(g, x, N);
  const kgx = (k * gx) % N;
  const diff = (B - kgx + N) % N;
  const ux = (u * x) % N;
  const aux = (srpPrivateA + ux) % N;
  const S = modPow(diff, aux, N);

  // Calculate K = H(S)
  const sBuffer = hexToArrayBuffer(S.toString(16).padStart(512, "0"));
  const kHash = await sha256(sBuffer);
  const K = hexToArrayBuffer(kHash);

  // Calculate M1 = HMAC(K, A + B + K)
  const aBufferForM1 = hexToArrayBuffer(srpA.padStart(512, "0"));
  const bBufferForM1 = hexToArrayBuffer(srpB.padStart(512, "0"));
  const abkBuffer = new ArrayBuffer(
    aBufferForM1.byteLength + bBufferForM1.byteLength + K.byteLength
  );
  const abkView = new Uint8Array(abkBuffer);
  abkView.set(new Uint8Array(aBufferForM1), 0);
  abkView.set(new Uint8Array(bBufferForM1), aBufferForM1.byteLength);
  abkView.set(
    new Uint8Array(K),
    aBufferForM1.byteLength + bBufferForM1.byteLength
  );

  const M1 = await hmacSha256(K, abkBuffer);

  return M1;
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = BigInt(1);
  base = base % modulus;

  while (exponent > 0) {
    if (exponent % BigInt(2) === BigInt(1)) {
      result = (result * base) % modulus;
    }
    exponent = exponent >> BigInt(1);
    base = (base * base) % modulus;
  }

  return result;
}
*/
