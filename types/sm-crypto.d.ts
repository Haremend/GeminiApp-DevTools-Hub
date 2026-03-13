declare module 'sm-crypto' {
  export const sm2: {
    generateKeyPairHex: () => { publicKey: string; privateKey: string };
    doEncrypt: (msg: string, publicKey: string, cipherMode?: number) => string;
    doDecrypt: (encryptData: string, privateKey: string, cipherMode?: number) => string;
    doSignature: (msg: string, privateKey: string, options?: any) => string;
    doVerifySignature: (msg: string, signHex: string, publicKey: string, options?: any) => boolean;
  };
  export const sm3: (msg: string) => string;
  export const sm4: {
    encrypt: (inArray: string | number[], key: string | number[], options?: any) => string;
    decrypt: (inArray: string | number[], key: string | number[], options?: any) => string;
  };
}
