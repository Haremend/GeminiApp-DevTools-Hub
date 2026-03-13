'use client';

import { useState } from 'react';
import CryptoJS from 'crypto-js';
import { sm2, sm3, sm4 } from 'sm-crypto';
import { Copy, Check, Play, RefreshCw } from 'lucide-react';

type CryptoCategory = 'hash' | 'encoding' | 'symmetric' | 'asymmetric';

export default function CryptoToolkitTool() {
  const [category, setCategory] = useState<CryptoCategory>('hash');
  const [algorithm, setAlgorithm] = useState('MD5');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Symmetric params
  const [secretKey, setSecretKey] = useState('');
  const [iv, setIv] = useState('');
  const [mode, setMode] = useState('CBC'); // CBC, ECB

  // Asymmetric params
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  const algorithms = {
    hash: ['MD5', 'SHA1', 'SHA256', 'SM3'],
    encoding: ['Base64', 'Hex', 'URL'],
    symmetric: ['AES', 'DES', 'SM4'],
    asymmetric: ['SM2'],
  };

  const handleCategoryChange = (cat: CryptoCategory) => {
    setCategory(cat);
    setAlgorithm(algorithms[cat][0]);
    setOutput('');
    setError(null);
  };

  const generateSM2Keys = () => {
    try {
      const keypair = sm2.generateKeyPairHex();
      setPublicKey(keypair.publicKey);
      setPrivateKey(keypair.privateKey);
    } catch (err: any) {
      setError(err.message || 'Failed to generate keys');
    }
  };

  const processData = (action: 'encrypt' | 'decrypt') => {
    setError(null);
    if (!input.trim() && action === 'encrypt') {
      setOutput('');
      return;
    }

    try {
      let result = '';

      if (category === 'hash') {
        if (algorithm === 'MD5') result = CryptoJS.MD5(input).toString();
        if (algorithm === 'SHA1') result = CryptoJS.SHA1(input).toString();
        if (algorithm === 'SHA256') result = CryptoJS.SHA256(input).toString();
        if (algorithm === 'SM3') result = sm3(input);
      } 
      else if (category === 'encoding') {
        if (algorithm === 'Base64') {
          if (action === 'encrypt') {
            result = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(input));
          } else {
            result = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(input));
          }
        }
        if (algorithm === 'Hex') {
          if (action === 'encrypt') {
            result = CryptoJS.enc.Hex.stringify(CryptoJS.enc.Utf8.parse(input));
          } else {
            result = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Hex.parse(input));
          }
        }
        if (algorithm === 'URL') {
          if (action === 'encrypt') {
            result = encodeURIComponent(input);
          } else {
            result = decodeURIComponent(input);
          }
        }
      }
      else if (category === 'symmetric') {
        if (!secretKey) throw new Error('Secret key is required');
        
        const keyHex = CryptoJS.enc.Utf8.parse(secretKey);
        const ivHex = CryptoJS.enc.Utf8.parse(iv);
        const cfg = {
          iv: ivHex,
          mode: mode === 'CBC' ? CryptoJS.mode.CBC : CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7
        };

        if (algorithm === 'AES') {
          if (action === 'encrypt') {
            result = CryptoJS.AES.encrypt(input, keyHex, cfg).toString();
          } else {
            result = CryptoJS.AES.decrypt(input, keyHex, cfg).toString(CryptoJS.enc.Utf8);
          }
        }
        if (algorithm === 'DES') {
          if (action === 'encrypt') {
            result = CryptoJS.DES.encrypt(input, keyHex, cfg).toString();
          } else {
            result = CryptoJS.DES.decrypt(input, keyHex, cfg).toString(CryptoJS.enc.Utf8);
          }
        }
        if (algorithm === 'SM4') {
          // SM4 key must be 16 bytes (32 hex chars)
          // We'll do a simple pad/truncate to 32 hex chars for convenience
          let sm4Key = CryptoJS.enc.Hex.stringify(keyHex);
          if (sm4Key.length < 32) sm4Key = sm4Key.padEnd(32, '0');
          if (sm4Key.length > 32) sm4Key = sm4Key.substring(0, 32);

          if (action === 'encrypt') {
            result = sm4.encrypt(input, sm4Key);
          } else {
            result = sm4.decrypt(input, sm4Key);
          }
        }
      }
      else if (category === 'asymmetric') {
        if (algorithm === 'SM2') {
          if (action === 'encrypt') {
            if (!publicKey) throw new Error('Public key is required');
            result = sm2.doEncrypt(input, publicKey, 1); // 1 is C1C3C2 mode
          } else {
            if (!privateKey) throw new Error('Private key is required');
            result = sm2.doDecrypt(input, privateKey, 1);
          }
        }
      }

      if (!result && action === 'decrypt') {
        throw new Error('Decryption failed. Check your keys, mode, or input format.');
      }

      setOutput(result);
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    }
  };

  const copyToClipboard = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Crypto Toolkit</h1>
        <p className="mt-2 text-gray-600">Encrypt, decrypt, and hash data using common algorithms including Chinese National Standards (SM2, SM3, SM4).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Configuration & Input */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(algorithms) as CryptoCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      category === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Algorithm Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Algorithm</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
              >
                {algorithms[category].map((algo) => (
                  <option key={algo} value={algo}>{algo}</option>
                ))}
              </select>
            </div>

            {/* Algorithm Specific Parameters */}
            {category === 'symmetric' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Secret Key</label>
                  <input
                    type="text"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Enter secret key..."
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                {algorithm !== 'SM4' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">IV (Initialization Vector)</label>
                      <input
                        type="text"
                        value={iv}
                        onChange={(e) => setIv(e.target.value)}
                        placeholder="Optional for ECB mode..."
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Mode</label>
                      <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="CBC">CBC</option>
                        <option value="ECB">ECB</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}

            {category === 'asymmetric' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Key Pair (Hex)</span>
                  <button 
                    onClick={generateSM2Keys}
                    className="text-xs flex items-center text-indigo-600 hover:text-indigo-800"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Generate New
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Public Key</label>
                  <textarea
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    placeholder="Enter public key..."
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-mono resize-none h-16"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Private Key</label>
                  <textarea
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Enter private key..."
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-mono resize-none h-16"
                  />
                </div>
              </div>
            )}

            {/* Input Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Input Data</label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter text to process..."
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 resize-none h-32 font-mono text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => processData('encrypt')}
                className="flex-1 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl font-medium transition-colors shadow-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{category === 'hash' ? 'Hash' : category === 'encoding' ? 'Encode' : 'Encrypt'}</span>
              </button>
              {category !== 'hash' && (
                <button
                  onClick={() => processData('decrypt')}
                  className="flex-1 flex items-center justify-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-3 rounded-xl font-medium transition-colors shadow-sm"
                >
                  <Play className="w-4 h-4 fill-current rotate-180" />
                  <span>{category === 'encoding' ? 'Decode' : 'Decrypt'}</span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Right Panel: Output */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-[400px]">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-700">Output Result</h2>
              <button
                onClick={copyToClipboard}
                disabled={!output}
                className={`flex items-center space-x-1 text-sm ${
                  !output ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-700'
                } transition-colors`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            
            {error ? (
              <div className="p-6 bg-red-50 text-red-600 font-mono text-sm flex-1">
                <p className="font-bold mb-2">Error:</p>
                <pre className="whitespace-pre-wrap">{error}</pre>
              </div>
            ) : (
              <textarea
                value={output}
                readOnly
                placeholder="Result will appear here..."
                className="flex-1 w-full p-6 resize-none focus:outline-none font-mono text-sm text-gray-800 bg-white"
                spellCheck={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
