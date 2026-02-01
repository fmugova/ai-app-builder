import { useState } from 'react';
import Image from 'next/image';

export default function AutoVerifyEmailUI() {
  const [email, setEmail] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [twoFAStarted, setTwoFAStarted] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setMessages([]);
    setVerified(false);
    setTwoFAStarted(false);
    setQrUrl(null);
    try {
      setMessages(msgs => [...msgs, `🔍 Finding user: ${email}`]);
      const res = await fetch('/api/admin/verify-email-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessages(msgs => [...msgs, data.error || '❌ Error verifying email or enabling 2FA']);
        return;
      }
      setMessages(msgs => [...msgs, '✅ Email verified successfully!']);
      setVerified(true);
      setMessages(msgs => [...msgs, '🔒 Initiating 2FA setup...']);
      setTwoFAStarted(true);
      // Generate QR code using Google Charts API
      if (data.otpauth) {
        setQrUrl(`https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(data.otpauth)}`);
        setMessages(msgs => [...msgs, '📱 Scan the QR code below with your authenticator app.']);
      }
    } catch {
      setMessages(msgs => [...msgs, '❌ Error verifying email or enabling 2FA']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Auto Email Verification & 2FA</h2>
      <input
        type="email"
        className="border px-3 py-2 rounded w-full mb-2"
        placeholder="Enter user email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={loading || verified}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded w-full mb-4 disabled:opacity-50"
        onClick={handleVerify}
        disabled={!email || loading || verified}
      >
        {loading ? 'Verifying...' : verified ? 'Verified' : 'Verify Email & Enable 2FA'}
      </button>
      <div className="bg-gray-50 border rounded p-3 min-h-[80px] text-sm">
        {messages.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>
      {verified && twoFAStarted && (
        <div className="mt-4 p-3 bg-green-100 text-green-800 rounded flex flex-col items-center">
          <div>User is now verified and 2FA is enabled!</div>
          {qrUrl && (
            <>
              <div className="mt-2 mb-1 font-medium">Scan this QR code:</div>
              <Image src={qrUrl} alt="2FA QR Code" width={200} height={200} />
              <div className="mt-2 text-xs text-gray-700 break-all">If you can&#39;t scan, use secret: <span className="font-mono">{qrUrl.split('chl=')[1]}</span></div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
